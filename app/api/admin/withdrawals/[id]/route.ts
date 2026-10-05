import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// PATCH /api/admin/withdrawals/[id]
// Body: { action: 'approve' | 'reject' }
//
// - approve: deducts the amount from the user's balance,
//            marks the withdrawal as 'approved'
// - reject:  marks the withdrawal as 'rejected', balance untouched
// ==========================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      );
    }

    const withdrawalId = params.id;
    if (!withdrawalId) {
      return NextResponse.json(
        { error: 'Withdrawal ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action } = body || {};

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Action must be approve or reject' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Fetch the withdrawal ---
    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount, status, recipient_name, recipient_phone')
      .eq('id', withdrawalId)
      .maybeSingle();

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    // --- Must still be pending (prevents double-processing) ---
    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: `This withdrawal is already ${withdrawal.status}` },
        { status: 400 }
      );
    }

    const amount = Number(withdrawal.amount) || 0;

    // ==========================================
    // REJECT
    // ==========================================
    if (action === 'reject') {
      const { error: updErr } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', withdrawalId)
        .eq('status', 'pending'); // safety lock

      if (updErr) {
        console.error('Withdrawal reject error:', updErr);
        return NextResponse.json(
          { error: 'Could not reject withdrawal' },
          { status: 500 }
        );
      }

      // Log a transaction for audit trail
      await supabase.from('transactions').insert({
        user_id: withdrawal.user_id,
        type: 'withdrawal_rejected',
        amount: 0,
        status: 'completed',
        meta: {
          withdrawal_id: withdrawal.id,
          attempted_amount: amount,
          admin_id: admin.adminId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Withdrawal rejected',
        status: 'rejected',
      });
    }

    // ==========================================
    // APPROVE
    // ==========================================
    // Re-fetch user's fresh balance (they may have spent it since requesting)
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', withdrawal.user_id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentBalance = Number(user.balance) || 0;

    if (currentBalance < amount) {
      return NextResponse.json(
        {
          error: `User's current balance (${currentBalance.toLocaleString()} UGX) is less than the withdrawal amount (${amount.toLocaleString()} UGX). Cannot approve.`,
        },
        { status: 400 }
      );
    }

    // --- Deduct balance ---
    const newBalance = currentBalance - amount;

    const { error: balErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', withdrawal.user_id);

    if (balErr) {
      console.error('Balance deduct error:', balErr);
      return NextResponse.json(
        { error: 'Could not deduct balance' },
        { status: 500 }
      );
    }

    // --- Mark withdrawal as approved ---
    const { error: updErr } = await supabase
      .from('withdrawals')
      .update({ status: 'approved' })
      .eq('id', withdrawalId)
      .eq('status', 'pending'); // safety lock

    if (updErr) {
      // Rollback balance
      await supabase
        .from('users')
        .update({ balance: currentBalance })
        .eq('id', withdrawal.user_id);

      console.error('Withdrawal approve error:', updErr);
      return NextResponse.json(
        { error: 'Could not approve withdrawal' },
        { status: 500 }
      );
    }

    // --- Log a transaction ---
    await supabase.from('transactions').insert({
      user_id: withdrawal.user_id,
      type: 'withdrawal_approved',
      amount: -amount,
      status: 'completed',
      meta: {
        withdrawal_id: withdrawal.id,
        recipient_name: withdrawal.recipient_name,
        recipient_phone: withdrawal.recipient_phone,
        admin_id: admin.adminId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal approved and balance deducted',
      status: 'approved',
      newBalance,
    });
  } catch (err: any) {
    console.error('Admin withdrawal action error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
