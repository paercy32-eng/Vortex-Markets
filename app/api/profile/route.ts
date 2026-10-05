import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/profile
// Returns everything the profile page needs:
// - user info + balance
// - deposit history (from payments)
// - withdrawal history (from withdrawals)
// ==========================================
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();

    // --- Deposit history ---
    const { data: deposits } = await supabase
      .from('payments')
      .select('id, amount, status, reference, created_at')
      .eq('user_id', user.id)
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(50);

    // --- Withdrawal history ---
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('id, amount, recipient_phone, recipient_name, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        is_bound: user.is_bound,
        bound_phone: user.bound_phone,
        bound_full_name: user.bound_full_name,
      },
      deposits: (deposits || []).map((d) => ({
        ...d,
        amount: Number(d.amount) || 0,
      })),
      withdrawals: (withdrawals || []).map((w) => ({
        ...w,
        amount: Number(w.amount) || 0,
      })),
    });
  } catch (err: any) {
    console.error('Profile endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
