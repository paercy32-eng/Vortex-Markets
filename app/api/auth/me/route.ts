import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/auth/me
// Returns the current user + ownership summary.
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

    // --- Count how many products this user has purchased ---
    const supabase = getServiceClient();
    const { count: ownedCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        referral_code: user.referral_code,
        referred_by: user.referred_by,
        is_bound: user.is_bound,
        bound_phone: user.bound_phone,
        bound_full_name: user.bound_full_name,
        created_at: user.created_at,
      },
      ownedCount: ownedCount || 0,
    });
  } catch (err: any) {
    console.error('Me endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
