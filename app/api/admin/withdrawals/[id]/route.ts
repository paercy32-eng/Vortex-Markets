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
// Balance was already deducted when the user
// submitted the request. So:
//   - approve: no balance change (already deducted)
//   - reject:  refund the amount back
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

    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .select(
        'id, user_id, amount, status, recipient_name, recipient_phone'
      )
      .eq('id', withdrawalId)
      .maybeSingle();

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: `This withdrawal is already ${withdrawal.status}` },
        { status: 400 }
      );
    }

    const amount = Number(withdrawal.amount) || 0;

    // ==========================================
    // APPROVE — balance was already deducted
    // ==========================================
    if (action === 'approve') {
      const { error: updErr } = await supabase
        .from('withdrawals')
        .update({ status: 'approved' })
        .eq('id', withdrawalId)
        .eq('status', 'pending');

      if (updErr) {
        console.error('Withdrawal approve error:', updErr);
        return NextResponse.json(
          { error: 'Could not approve withdrawal' },
          { status: 500 }
        );
      }

      await supabase.from('transactions').insert({
        user_id: withdrawal.user_id,
        type: 'withdrawal_approved',
        amount: 0,
        status: 'completed',
        meta: {
          withdrawal_id: withdrawal.id,
          paid_amount: amount,
          recipient_name: withdrawal.recipient_name,
          recipient_phone: withdrawal.recipient_phone,
          admin_id: admin.adminId,
          note: 'Paid out. Balance already deducted on submit.',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Withdrawal approved',
        status: 'approved',
      });
    }

    // ==========================================
    // REJECT — refund the amount back
    // ==========================================
    const { data: freshUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', withdrawal.user_id)
      .single();

    const currentBalance = Number(freshUser?.balance) || 0;
    const newBalance = currentBalance + amount;

    const { error: balErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', withdrawal.user_id);

    if (balErr) {
      console.error('Refund balance error:', balErr);
      return NextResponse.json(
        { error: 'Could not refund balance' },
        { status: 500 }
      );
    }

    const { error: updErr } = await supabase
      .from('withdrawals')
      .update({ status: 'rejected' })
      .eq('id', withdrawalId)
      .eq('status', 'pending');

    if (updErr) {
      // Rollback refund
      await supabase
        .from('users')
        .update({ balance: currentBalance })
        .eq('id', withdrawal.user_id);

      console.error('Withdrawal reject error:', updErr);
      return NextResponse.json(
        { error: 'Could not reject withdrawal' },
        { status: 500 }
      );
    }

    await supabase.from('transactions').insert({
      user_id: withdrawal.user_id,
      type: 'withdrawal_rejected',
      amount,
      status: 'completed',
      meta: {
        withdrawal_id: withdrawal.id,
        admin_id: admin.adminId,
        note: 'Refunded to user balance',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Withdrawal rejected and refunded',
      status: 'rejected',
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
