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

    // 1. Verify Signature
    const isValid = pesajet.webhooks.verify(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, transactionId, reference } = body;

    const supabase = getServiceClient();

    // 2. Handle Successful Payments
    if (event === 'payment.completed') {
      const { data: deposit } = await supabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .maybeSingle();

      if (deposit && deposit.status !== 'completed') {
        // Mark deposit as completed
        await supabase
          .from('payments')
          .update({ status: 'completed', reviewed_at: new Date().toISOString() })
          .eq('id', deposit.id);

        // Get user and update balance
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

        // Log transaction
        await supabase.from('transactions').insert({
          user_id: deposit.user_id,
          type: 'deposit',
          amount: Number(deposit.amount),
          status: 'completed',
          meta: { reference, transactionId, provider: body.provider },
        });
      }
    }

    // 3. Handle Failed or Cancelled Payments
    if (event === 'payment.failed' || event === 'payment.cancelled') {
      const { data: deposit } = await supabase
        .from('payments')
        .select('id, status') // 👈 Fixed: Added 'status' to the select
        .eq('reference', reference)
        .maybeSingle();

      if (deposit && deposit.status === 'pending') {
        await supabase
          .from('payments')
          .update({ status: 'failed', reviewed_at: new Date().toISOString() })
          .eq('id', deposit.id);
      }
    }

    // ALWAYS return 200 OK to PesaJet so they don't pause webhooks
    return NextResponse.json({ received: true });
    
  } catch (err: any) {
    console.error('PesaJet webhook error:', err);
    // Even if there is a DB error, return 200 so PesaJet doesn't pause. 
    // We will see the error in Vercel logs instead.
    return NextResponse.json({ received: true, note: 'Processed with internal error' }, { status: 200 });
  }
}
