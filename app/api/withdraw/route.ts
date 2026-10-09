import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const MIN_WITHDRAWAL = 4000;
const WITHDRAWAL_FEE_RATE = 0.15;

// ==========================================
// POST /api/withdraw
// Creates a withdrawal request AND immediately
// deducts the amount from the user's balance.
// If admin rejects, the amount is refunded.
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

    if (!user.is_bound || !user.bound_phone || !user.bound_full_name) {
      return NextResponse.json(
        { error: 'Please bind your account first' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const amount = Number(body?.amount);

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

    // --- Re-fetch fresh balance ---
    const { data: freshUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    const currentBalance = Number(freshUser?.balance) || 0;

    if (amount > currentBalance) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // ==========================================
    // DEDUCT balance immediately
    // ==========================================
    const newBalance = currentBalance - amount;

    const { error: balErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (balErr) {
      console.error('Balance deduct error:', balErr);
      return NextResponse.json(
        { error: 'Could not process withdrawal' },
        { status: 500 }
      );
    }

    // ==========================================
    // Create withdrawal record
    // ==========================================
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
      // Rollback balance
      await supabase
        .from('users')
        .update({ balance: currentBalance })
        .eq('id', user.id);

      console.error('Withdraw insert error:', error);
      return NextResponse.json(
        { error: 'Could not create withdrawal request' },
        { status: 500 }
      );
    }

    // ==========================================
    // Log transaction (deduction)
    // ==========================================
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal_requested',
      amount: -amount,
      status: 'completed',
      meta: {
        withdrawal_id: withdrawal.id,
        recipient_name: withdrawal.recipient_name,
        recipient_phone: withdrawal.recipient_phone,
        note: 'Deducted on submit. Will be refunded if rejected.',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal submitted. Awaiting admin approval.',
      withdrawal: {
        ...withdrawal,
        amount: Number(withdrawal.amount) || 0,
      },
      newBalance,
    });
  } catch (err: any) {
    console.error('Withdraw endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
