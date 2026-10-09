import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// POST /api/recharge/submit-txid
// Body: { paymentId, network, transactionId }
//
// Attaches the network + transaction ID the
// user received after paying the merchant code.
// Deposit remains 'pending' until admin approves.
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { paymentId, network, transactionId } = body || {};

    if (!paymentId || typeof paymentId !== 'string') {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    if (!network || typeof network !== 'string') {
      return NextResponse.json(
        { error: 'Select a network' },
        { status: 400 }
      );
    }

    const cleanNetwork = network.trim().toUpperCase();
    if (cleanNetwork !== 'AIRTEL') {
      return NextResponse.json(
        { error: 'Only Airtel is supported at this time' },
        { status: 400 }
      );
    }

    if (!transactionId || typeof transactionId !== 'string') {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const cleanTxid = transactionId.trim();
    if (cleanTxid.length < 4 || cleanTxid.length > 40) {
      return NextResponse.json(
        { error: 'Enter a valid transaction ID' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Verify the payment belongs to this user and is pending ---
    const { data: payment } = await supabase
      .from('payments')
      .select('id, user_id, status, type, transaction_id')
      .eq('id', paymentId)
      .maybeSingle();

    if (!payment || payment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    if (payment.type !== 'deposit') {
      return NextResponse.json(
        { error: 'Invalid deposit record' },
        { status: 400 }
      );
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: `This deposit is already ${payment.status}` },
        { status: 400 }
      );
    }

    if (payment.transaction_id) {
      return NextResponse.json(
        { error: 'Transaction ID already submitted. Await admin review.' },
        { status: 400 }
      );
    }

    // --- Attach network + transaction ID ---
    const { error: updErr } = await supabase
      .from('payments')
      .update({
        network: cleanNetwork,
        transaction_id: cleanTxid,
      })
      .eq('id', paymentId)
      .eq('status', 'pending');

    if (updErr) {
      console.error('Submit txid error:', updErr);
      return NextResponse.json(
        { error: 'Could not submit transaction ID' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Submitted for review. Await admin approval.',
    });
  } catch (err: any) {
    console.error('Submit txid endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
