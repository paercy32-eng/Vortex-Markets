export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// ==========================================
// POST /api/webhooks/marzpay
//
// Marzpay calls this when a payment succeeds or fails.
// We look up the pending payment by reference, and:
//   - If success → mark approved, credit user's balance
//   - If failed  → mark failed
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();

    console.log('=== MARZPAY WEBHOOK ===');
    console.log('Raw body:', raw);

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      console.error('Invalid JSON');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Extract reference + status — adjust to match Marzpay's actual payload shape
    const data = payload?.data || payload;
    const reference =
      data?.reference ||
      data?.transaction_reference ||
      payload?.reference ||
      null;

    const statusFromPayload = String(
      data?.status || payload?.status || ''
    ).toLowerCase();

    const event = String(payload?.event || '').toLowerCase();

    console.log('Parsed reference:', reference);
    console.log('Parsed status:', statusFromPayload);
    console.log('Parsed event:', event);

    if (!reference) {
      console.error('No reference in payload');
      return NextResponse.json({ received: true, note: 'no reference' });
    }

    const supabase = getServiceClient();

    // Find the pending payment
    const { data: payment } = await supabase
      .from('payments')
      .select('id, user_id, amount, status, type')
      .eq('reference', reference)
      .maybeSingle();

    if (!payment) {
      console.error('No payment found for reference:', reference);
      return NextResponse.json({ received: true, note: 'no payment' });
    }

    if (payment.status === 'approved' || payment.status === 'failed') {
      return NextResponse.json({ received: true, note: 'already processed' });
    }

    // Determine success vs failure
    const isSuccess =
      event.includes('success') ||
      event.includes('completed') ||
      statusFromPayload === 'success' ||
      statusFromPayload === 'successful' ||
      statusFromPayload === 'completed' ||
      statusFromPayload === 'approved' ||
      statusFromPayload === 'paid';

    const isFailure =
      event.includes('fail') ||
      event.includes('cancel') ||
      statusFromPayload === 'failed' ||
      statusFromPayload === 'cancelled' ||
      statusFromPayload === 'rejected';

    // ---------- SUCCESS ----------
    if (isSuccess && !isFailure) {
      // Load user's current balance
      const { data: user } = await supabase
        .from('users')
        .select('balance, total_deposited')
        .eq('id', payment.user_id)
        .maybeSingle();

      if (!user) {
        console.error('User not found for payment:', payment.id);
        return NextResponse.json({ received: true, note: 'user missing' });
      }

      // Credit user
      await supabase
        .from('users')
        .update({
          balance: Number(user.balance) + Number(payment.amount),
          total_deposited:
            Number(user.total_deposited ?? 0) + Number(payment.amount),
        })
        .eq('id', payment.user_id);

      // Mark payment approved
      await supabase
        .from('payments')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // Log transaction
      await supabase.from('transactions').insert({
        user_id: payment.user_id,
        type: 'deposit',
        amount: Number(payment.amount),
        status: 'completed',
        meta: { reference, source: 'marzpay_webhook', event },
      });

      console.log('✓ Payment credited:', reference, payment.amount);
      return NextResponse.json({ received: true, credited: true });
    }

    // ---------- FAILURE ----------
    if (isFailure) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      console.log('✗ Payment failed:', reference);
      return NextResponse.json({ received: true, note: 'marked failed' });
    }

    console.log('Unhandled event/status:', event, statusFromPayload);
    return NextResponse.json({ received: true, note: 'unhandled' });
  } catch (err) {
    console.error('Marzpay webhook error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Health check for Marzpay
export async function GET() {
  return NextResponse.json({ status: 'ok' });
                  }
