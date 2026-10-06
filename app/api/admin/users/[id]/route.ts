import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/users/[id]
// Returns detailed info for one user:
// - Profile + balance
// - Active and expired modules
// - Recent transactions
// ==========================================
export async function GET(
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Fetch user ---
    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, name, phone, balance, referral_code, referred_by, is_bound, bound_phone, bound_full_name, created_at'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // --- Fetch their modules ---
    const { data: modules } = await supabase
      .from('user_modules')
      .select(
        'id, product_name, price_paid, cycle_days, daily_return, days_credited, total_credited, total_creditable, status, started_at, expires_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // --- Fetch their recent transactions (last 30) ---
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, type, amount, status, meta, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        balance: Number(user.balance) || 0,
      },
      modules: (modules || []).map((m) => ({
        ...m,
        price_paid: Number(m.price_paid) || 0,
        daily_return: Number(m.daily_return) || 0,
        total_credited: Number(m.total_credited) || 0,
        total_creditable: Number(m.total_creditable) || 0,
      })),
      transactions: (transactions || []).map((t) => ({
        ...t,
        amount: Number(t.amount) || 0,
      })),
    });
  } catch (err: any) {
    console.error('Admin user detail error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// ==========================================
// PATCH /api/admin/users/[id]
// Body: { action, ...params }
// Actions:
//   - adjust_balance: { amount (can be negative), reason }
//   - reset_binding: {} (clears bound_phone / bound_full_name / is_bound)
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action } = body || {};

    const supabase = getServiceClient();

    // --- Fetch user ---
    const { data: user } = await supabase
      .from('users')
      .select('id, name, balance')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // ==========================================
    // ACTION: adjust_balance
    // ==========================================
    if (action === 'adjust_balance') {
      const amount = Number(body.amount);
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

      if (!amount || isNaN(amount)) {
        return NextResponse.json(
          { error: 'Enter a valid amount (can be negative)' },
          { status: 400 }
        );
      }

      if (!reason) {
        return NextResponse.json(
          { error: 'A reason is required for balance adjustments' },
          { status: 400 }
        );
      }

      const currentBalance = Number(user.balance) || 0;
      const newBalance = currentBalance + amount;

      if (newBalance < 0) {
        return NextResponse.json(
          {
            error: `Adjustment would result in a negative balance (${newBalance.toLocaleString()} UGX)`,
          },
          { status: 400 }
        );
      }

      // --- Apply balance change ---
      const { error: updErr } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);

      if (updErr) {
        console.error('Balance adjustment error:', updErr);
        return NextResponse.json(
          { error: 'Could not adjust balance' },
          { status: 500 }
        );
      }

      // --- Log the transaction ---
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'admin_adjustment',
        amount,
        status: 'completed',
        meta: {
          reason,
          admin_id: admin.adminId,
          admin_username: admin.username,
          previous_balance: currentBalance,
          new_balance: newBalance,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Balance adjusted',
        newBalance,
      });
    }

    // ==========================================
    // ACTION: reset_binding
    // ==========================================
    if (action === 'reset_binding') {
      const { error: updErr } = await supabase
        .from('users')
        .update({
          is_bound: false,
          bound_phone: null,
          bound_full_name: null,
        })
        .eq('id', userId);

      if (updErr) {
        console.error('Binding reset error:', updErr);
        return NextResponse.json(
          { error: 'Could not reset binding' },
          { status: 500 }
        );
      }

      // --- Log ---
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'binding_reset',
        amount: 0,
        status: 'completed',
        meta: {
          admin_id: admin.adminId,
          admin_username: admin.username,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Binding reset. User can bind again.',
      });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Admin user action error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
      }
