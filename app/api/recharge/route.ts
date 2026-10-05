import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// POST /api/recharge
// Creates a pending deposit request.
// Obpay integration will be added in Phase 10 —
// for now this just records the intent.
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
    const { amount: rawAmount } = body || {};
    const amount = Number(rawAmount);

    // --- Validate amount ---
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Enter a valid amount' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Generate a unique reference ---
    const reference = `VRTX-DEP-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    // --- Create pending payment record ---
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        type: 'deposit',
        status: 'pending',
        reference,
      })
      .select('id, amount, status, reference, created_at')
      .single();

    if (error || !payment) {
      console.error('Recharge insert error:', error);
      return NextResponse.json(
        { error: 'Could not create recharge request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recharge request created. Obpay integration coming soon.',
      payment: {
        ...payment,
        amount: Number(payment.amount) || 0,
      },
    });
  } catch (err: any) {
    console.error('Recharge endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
