import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// PATCH /api/admin/deposits/[id]
// Body: { action: 'approve' | 'reject' }
//
// - approve: credits the amount to the user's balance,
//            marks the payment as 'approved'
// - reject:  marks the payment as 'rejected', balance untouched
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

    const depositId = params.id;
    if (!depositId) {
      return NextResponse.json(
        { error: 'Deposit ID is required' },
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

    // --- Fetch the deposit ---
    const { data: deposit } = await supabase
      .from('payments')
      .select('id, user_id, amount, status, reference, type')
      .eq('id', depositId)
      .maybeSingle();

    if (!deposit) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    // --- Sanity check: must actually be a deposit ---
    if (deposit.type !== 'deposit') {
      return NextResponse.json(
        { error: 'This record is not a deposit' },
        { status: 400 }
      );
    }

    // --- Must still be pending (prevents double-processing) ---
    if (deposit.status !== 'pending') {
      return NextResponse.json(
        { error: `This deposit is already ${deposit.status}` },
        { status: 400 }
      );
    }

    const amount = Number(deposit.amount) || 0;

    // ==========================================
    // REJECT
    // ==========================================
    if (action === 'reject') {
      const { error: updErr } = await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', depositId)
        .eq('status', 'pending');

      if (updErr) {
        console.error('Deposit reject error:', updErr);
        return NextResponse.json(
          { error: 'Could not reject deposit' },
          { status: 500 }
        );
      }

      await supabase.from('transactions').insert({
        user_id: deposit.user_id,
        type: 'deposit_rejected',
        amount: 0,
        status: 'completed',
        meta: {
          payment_id: deposit.id,
          attempted_amount: amount,
          reference: deposit.reference,
          admin_id: admin.adminId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Deposit rejected',
        status: 'rejected',
      });
    }

    // ==========================================
    // APPROVE
    // ==========================================
    // Re-fetch the user's current balance
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', deposit.user_id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentBalance = Number(user.balance) || 0;
    const newBalance = currentBalance + amount;

    // --- Credit balance ---
    const { error: balErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', deposit.user_id);

    if (balErr) {
      console.error('Balance credit error:', balErr);
      return NextResponse.json(
        { error: 'Could not credit balance' },
        { status: 500 }
      );
    }

    // --- Mark deposit as approved ---
    const { error: updErr } = await supabase
      .from('payments')
      .update({ status: 'approved' })
      .eq('id', depositId)
      .eq('status', 'pending');

    if (updErr) {
      // Rollback balance
      await supabase
        .from('users')
        .update({ balance: currentBalance })
        .eq('id', deposit.user_id);

      console.error('Deposit approve error:', updErr);
      return NextResponse.json(
        { error: 'Could not approve deposit' },
        { status: 500 }
      );
    }

    // --- Log the transaction ---
    await supabase.from('transactions').insert({
      user_id: deposit.user_id,
      type: 'deposit_approved',
      amount,
      status: 'completed',
      meta: {
        payment_id: deposit.id,
        reference: deposit.reference,
        admin_id: admin.adminId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Deposit approved and balance credited',
      status: 'approved',
      newBalance,
    });
  } catch (err: any) {
    console.error('Admin deposit action error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
