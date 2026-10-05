import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// WITHDRAWAL RULES
// ==========================================
const MIN_WITHDRAWAL = 4000;
const WITHDRAWAL_FEE_RATE = 0.15; // 15%

// ==========================================
// POST /api/withdraw
// Creates a withdrawal request.
// Rules:
//  - User must have at least one active module
//  - Minimum withdrawal: 4,000 UGX
//  - 15% fee is deducted from the amount
//  - Balance is NOT deducted here — admin approval does that
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

    // --- Must be bound ---
    if (!user.is_bound || !user.bound_phone || !user.bound_full_name) {
      return NextResponse.json(
        { error: 'Please bind your account first' },
        { status: 400 }
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

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${MIN_WITHDRAWAL.toLocaleString()} UGX` },
        { status: 400 }
      );
    }

    if (amount > user.balance) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Must have at least one active module ---
    const { data: activeModule } = await supabase
      .from('user_modules')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!activeModule) {
      return NextResponse.json(
        {
          error:
            'You need an active module before you can withdraw. Purchase a module first.',
        },
        { status: 400 }
      );
    }

    // --- Block if user already has a pending withdrawal ---
    const { data: existingPending } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json(
        { error: 'You already have a pending withdrawal request' },
        { status: 400 }
      );
    }

    // --- Compute fee and net amount ---
    const fee = Math.round(amount * WITHDRAWAL_FEE_RATE * 100) / 100;
    const netAmount = Math.round((amount - fee) * 100) / 100;

    // --- Create the withdrawal request ---
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount,
        recipient_phone: user.bound_phone,
        recipient_name: user.bound_full_name,
        status: 'pending',
      })
      .select(
        'id, amount, recipient_phone, recipient_name, status, created_at'
      )
      .single();

    if (error || !withdrawal) {
      console.error('Withdraw insert error:', error);
      return NextResponse.json(
        { error: 'Could not create withdrawal request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted. Awaiting admin approval.',
      withdrawal: {
        ...withdrawal,
        amount: Number(withdrawal.amount) || 0,
        fee,
        net_amount: netAmount,
      },
    });
  } catch (err: any) {
    console.error('Withdraw endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
