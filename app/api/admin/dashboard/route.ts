import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/dashboard
// Returns dashboard stats:
// - Total users
// - Total deposits (approved)
// - Total invested (sum of price_paid in user_modules)
// - Total withdrawn (approved withdrawals)
// - Pending deposits
// - Pending withdrawals
// ==========================================
export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();

    // --- Total users ---
    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    // --- Approved deposits total ---
    const { data: approvedDeposits } = await supabase
      .from('payments')
      .select('amount')
      .eq('type', 'deposit')
      .in('status', ['approved', 'successful', 'completed']);

    const totalDeposits = (approvedDeposits || []).reduce(
      (sum, d) => sum + (Number(d.amount) || 0),
      0
    );

    // --- Pending deposits count ---
    const { count: pendingDeposits } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'deposit')
      .eq('status', 'pending');

    // --- Total invested (sum of all user_modules price_paid) ---
    const { data: modules } = await supabase
      .from('user_modules')
      .select('price_paid');

    const totalInvested = (modules || []).reduce(
      (sum, m) => sum + (Number(m.price_paid) || 0),
      0
    );

    // --- Total withdrawn (approved) ---
    const { data: approvedWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('status', 'approved');

    const totalWithdrawn = (approvedWithdrawals || []).reduce(
      (sum, w) => sum + (Number(w.amount) || 0),
      0
    );

    // --- Pending withdrawals count ---
    const { count: pendingWithdrawals } = await supabase
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalDeposits,
        totalInvested,
        totalWithdrawn,
        pendingDeposits: pendingDeposits || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
      },
    });
  } catch (err: any) {
    console.error('Admin dashboard endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
