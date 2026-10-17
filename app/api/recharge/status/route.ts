import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PesaJet } from '@pesajet/sdk';

export const dynamic = 'force-dynamic';

const pesajet = new PesaJet({
  apiKey: process.env.PESAJET_API_KEY!,
  webhookSecret: process.env.PESAJET_WEBHOOK_SECRET,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 1. Check our own database first
    const { data: deposit } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    // 2. If it's already approved, return success immediately
    if (deposit.status === 'approved') {
      return NextResponse.json({ status: 'approved' });
    }

    // 3. Ask PesaJet for the real-time status
    // Note: The SDK method might be 'verify' or 'retrieve'. We will use 'verify'.
    const check = await pesajet.payments.verify(reference);

    // 4. If PesaJet says it's successful, approve it and credit the balance
    if (check.status === 'successful' || check.status === 'completed') {
      
      // Update deposit status
      await supabase
        .from('payments')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', deposit.id);

      // Credit user balance
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
        meta: { reference, method: 'auto_poll' },
      });

      return NextResponse.json({ status: 'approved' });
    }

    // If PesaJet says it failed
    if (check.status === 'failed') {
      await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', deposit.id);
      return NextResponse.json({ status: 'failed' });
    }

    // Otherwise, it's still pending
    return NextResponse.json({ status: 'pending' });
    
  } catch (err: any) {
    console.error('Status check error:', err);
    // If PesaJet throws an error (e.g. not found), we just keep it pending
    return NextResponse.json({ status: 'pending' });
  }
}
