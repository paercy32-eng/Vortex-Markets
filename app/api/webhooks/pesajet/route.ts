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
    // 1. Get the raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';

    // 2. Verify signature using PesaJet SDK
    const isValid = pesajet.webhooks.verify(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, transactionId, reference } = body;

    if (event === 'payment.completed') {
      const supabase = getServiceClient();

      // 3. Find the deposit using the 'payments' table
      const { data: deposit } = await supabase
        .from('payments') // 👈 Correct table name
        .select('*')
        .eq('reference', reference)
        .maybeSingle();

      if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
      if (deposit.status === 'approved') return NextResponse.json({ success: true, message: 'Already processed' });

      // 4. Mark deposit as approved
      await supabase
        .from('payments') // 👈 Correct table name
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', deposit.id);

      // 5. Credit the user's balance
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

      // 6. Log transaction
      await supabase.from('transactions').insert({
        user_id: deposit.user_id,
        type: 'deposit',
        amount: Number(deposit.amount),
        status: 'completed',
        meta: { reference, transactionId, provider: body.provider },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('PesaJet webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
