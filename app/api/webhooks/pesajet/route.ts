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

    const isValid = pesajet.webhooks.verify(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, transactionId, reference } = body;

    const supabase = getServiceClient();

    // 1. Handle Successful Payments
    if (event === 'payment.completed') {
      const { data: deposit } = await supabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .maybeSingle();

      if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
      
      if (deposit.status === 'completed') {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      await supabase
        .from('payments')
        .update({ status: 'completed', reviewed_at: new Date().toISOString() })
        .eq('id', deposit.id);

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

      await supabase.from('transactions').insert({
        user_id: deposit.user_id,
        type: 'deposit',
        amount: Number(deposit.amount),
        status: 'completed',
        meta: { reference, transactionId, provider: body.provider },
      });
    }

    // 2. Handle Failed or Cancelled Payments
    if (event === 'payment.failed' || event === 'payment.cancelled') {
      const { data: deposit } = await supabase
        .from('payments')
        .select('id')
        .eq('reference', reference)
        .maybeSingle();

      if (deposit) {
        // Mark as failed so it doesn't stay pending forever
        await supabase
          .from('payments')
          .update({ status: 'failed', reviewed_at: new Date().toISOString() })
          .eq('id', deposit.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('PesaJet webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
