import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PesaJet } from '@pesajet/sdk';

export const dynamic = 'force-dynamic';

const pesajet = new PesaJet({
  apiKey: process.env.PESAJET_API_KEY!,
  webhookSecret: process.env.PESAJET_WEBHOOK_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';

    // 1. Verify the request is genuinely from PesaJet
    const isValid = pesajet.webhooks.verify(rawBody, signature);
    if (!isValid) {
      console.error('Invalid PesaJet webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, transactionId, amount, reference } = body;

    // 2. Only process successful payments
    if (event === 'payment.completed') {
      const supabase = getServiceClient();

      // 3. Find the deposit using the reference we sent
      const { data: deposit } = await supabase
        .from('tesla_deposits')
        .select('*')
        .eq('reference', reference)
        .maybeSingle();

      if (!deposit) {
        console.error('Deposit not found for ref:', reference);
        return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
      }

      // 4. Prevent double-crediting if webhook fires twice
      if (deposit.status === 'approved') {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      // 5. Mark deposit as approved
      await supabase
        .from('tesla_deposits')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', deposit.id);

      // 6. Credit the user's balance (using the exact amount they requested, NOT the fee)
      const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', deposit.user_id)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({ balance: Number(user.balance) + Number(deposit.amount) })
          .eq('id', deposit.user_id);
      }

      // 7. Log the transaction in history
      await supabase.from('transactions').insert({
        user_id: deposit.user_id,
        type: 'deposit',
        amount: Number(deposit.amount),
        status: 'completed',
        meta: { reference, transactionId, provider: body.provider },
      });
    }

    // Always return 200 so PesaJet knows we received it
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('PesaJet webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
