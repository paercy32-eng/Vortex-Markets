import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MIN_WITHDRAWAL = 5000;
const WITHDRAWAL_FEE_RATE = 0.15;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { amount } = await req.json();
    const numAmount = Number(amount);

    // RULE 1: Minimum Withdrawal
    if (!numAmount || numAmount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is UGX ${MIN_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Fetch fresh user data
    const { data: dbUser } = await supabase
      .from('users')
      .select('balance, is_bound, bound_phone, bound_full_name, is_banned')
      .eq('id', user.id)
      .single();

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    
    // RULE 2: Banned Check
    if (dbUser.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    
    // RULE 3: Bound Account Check
    if (!dbUser.is_bound) return NextResponse.json({ error: 'Please bind your mobile money account first' }, { status: 400 });

    // RULE 4: TIME WINDOW CHECK (9:30 AM - 5:00 PM EAT)
    const now = new Date();
    // Convert current UTC time to EAT (UTC+3)
    const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const eatHour = eatTime.getUTCHours();
    const eatMinute = eatTime.getUTCMinutes();
    const eatTotalMinutes = eatHour * 60 + eatMinute;

    const openTimeMinutes = 9 * 60 + 30; // 9:30 AM = 570 minutes
    const closeTimeMinutes = 17 * 60;    // 5:00 PM = 1020 minutes

    if (eatTotalMinutes < openTimeMinutes || eatTotalMinutes >= closeTimeMinutes) {
      return NextResponse.json(
        { error: 'Withdrawals are only available between 9:30 AM and 5:00 PM EAT. Please try again during these hours.' },
        { status: 400 }
      );
    }

    // Balance Check
    const currentBalance = Number(dbUser.balance) || 0;
    if (currentBalance < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // RULE 5: Active Module Check (Bought or Granted)
    const { count: activeModules } = await supabase
      .from('user_modules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!activeModules || activeModules === 0) {
      return NextResponse.json(
        { error: 'You need at least one active investment (module) to withdraw. Please buy a module or contact support.' },
        { status: 400 }
      );
    }

    // RULE 6: No existing pending withdrawal
    const { data: existingPending } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json(
        { error: 'You already have a pending withdrawal request. Please wait for it to be processed.' },
        { status: 400 }
      );
    }

    // Deduct balance
    const newBalance = currentBalance - numAmount;
    const { error: balErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (balErr) {
      return NextResponse.json({ error: 'Could not process request' }, { status: 500 });
    }

    // Create the withdrawal request
    const { data: withdrawal, error: wdErr } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount: numAmount,
        status: 'pending',
        recipient_phone: dbUser.bound_phone,
        recipient_name: dbUser.bound_full_name,
      })
      .select('id, amount, status, created_at')
      .single();

    if (wdErr || !withdrawal) {
      // Refund balance if insert fails
      await supabase.from('users').update({ balance: currentBalance }).eq('id', user.id);
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    // Log the pending transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal_request',
      amount: -numAmount,
      status: 'pending',
      meta: {
        withdrawal_id: withdrawal.id,
        phone: dbUser.bound_phone,
        full_name: dbUser.bound_full_name,
        net_amount: Math.round(numAmount * (1 - WITHDRAWAL_FEE_RATE)),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      withdrawalId: withdrawal.id,
    });

  } catch (err: any) {
    console.error('Withdrawal error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
          }
