import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/users/[id]
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
    const supabase = getServiceClient();

    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id, name, phone, balance, referral_code, referred_by, is_bound, bound_phone, bound_full_name, is_banned, created_at'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: modules } = await supabase
      .from('user_modules')
      .select(
        'id, product_name, price_paid, cycle_days, daily_return, days_credited, total_credited, total_creditable, status, started_at, expires_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, type, amount, status, meta, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      success: true,
      user: { ...user, balance: Number(user.balance) || 0 },
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
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// ==========================================
// PATCH /api/admin/users/[id]
// Actions:
//   - adjust_balance: { amount, reason }
//   - reset_binding: {}
//   - ban: {}
//   - unban: {}
//   - grant_module: { productId }
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
    const body = await req.json();
    const { action } = body || {};
    const supabase = getServiceClient();

    const { data: user } = await supabase
      .from('users')
      .select('id, name, balance, is_banned')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ==========================================
    // ADJUST BALANCE
    // ==========================================
    if (action === 'adjust_balance') {
      const amount = Number(body.amount);
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

      if (!amount || isNaN(amount)) {
        return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
      }
      if (!reason) {
        return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
      }

      const currentBalance = Number(user.balance) || 0;
      const newBalance = currentBalance + amount;

      if (newBalance < 0) {
        return NextResponse.json(
          { error: `Adjustment would result in negative balance` },
          { status: 400 }
        );
      }

      const { error: updErr } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);

      if (updErr) {
        return NextResponse.json({ error: 'Could not adjust balance' }, { status: 500 });
      }

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
    // RESET BINDING
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
        return NextResponse.json({ error: 'Could not reset binding' }, { status: 500 });
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'binding_reset',
        amount: 0,
        status: 'completed',
        meta: { admin_id: admin.adminId, admin_username: admin.username },
      });

      return NextResponse.json({ success: true, message: 'Binding reset' });
    }

    // ==========================================
    // BAN
    // ==========================================
    if (action === 'ban') {
      const { error: updErr } = await supabase
        .from('users')
        .update({ is_banned: true })
        .eq('id', userId);

      if (updErr) {
        return NextResponse.json({ error: 'Could not ban user' }, { status: 500 });
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'admin_ban',
        amount: 0,
        status: 'completed',
        meta: { admin_id: admin.adminId, admin_username: admin.username },
      });

      return NextResponse.json({ success: true, message: 'User banned' });
    }

    // ==========================================
    // UNBAN
    // ==========================================
    if (action === 'unban') {
      const { error: updErr } = await supabase
        .from('users')
        .update({ is_banned: false })
        .eq('id', userId);

      if (updErr) {
        return NextResponse.json({ error: 'Could not unban user' }, { status: 500 });
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'admin_unban',
        amount: 0,
        status: 'completed',
        meta: { admin_id: admin.adminId, admin_username: admin.username },
      });

      return NextResponse.json({ success: true, message: 'User unbanned' });
    }

    // ==========================================
    // GRANT MODULE (free — no balance deduction, no referral commission)
    // ==========================================
    if (action === 'grant_module') {
      const productId = body.productId;
      if (!productId || typeof productId !== 'string') {
        return NextResponse.json({ error: 'Select a module' }, { status: 400 });
      }

      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, cycle_days, daily_return')
        .eq('id', productId)
        .maybeSingle();

      if (!product) {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }

      const startedAt = new Date();
      const expiresAt = new Date(
        startedAt.getTime() + product.cycle_days * 24 * 60 * 60 * 1000
      );
      const dailyReturnNum = Number(product.daily_return) || 0;
      const totalCreditable = dailyReturnNum * product.cycle_days;

      const { data: userModule, error: umErr } = await supabase
        .from('user_modules')
        .insert({
          user_id: userId,
          product_id: product.id,
          product_name: product.name,
          price_paid: 0,
          cycle_days: product.cycle_days,
          daily_return: dailyReturnNum,
          total_creditable: totalCreditable,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
        })
        .select('id, product_name, cycle_days, daily_return')
        .single();

      if (umErr || !userModule) {
        console.error('Grant module error:', umErr);
        return NextResponse.json({ error: 'Could not grant module' }, { status: 500 });
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'admin_granted_module',
        amount: 0,
        status: 'completed',
        meta: {
          admin_id: admin.adminId,
          admin_username: admin.username,
          product_id: product.id,
          product_name: product.name,
          user_module_id: userModule.id,
          note: 'Free module granted by admin',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Granted ${product.name}`,
        userModule,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin user action error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
