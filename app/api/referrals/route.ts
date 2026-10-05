import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/referrals
// Returns the current user's referral info:
// - Their referral code
// - Their downline (grouped by level)
// - Total earnings
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

    // --- Fetch referral links where this user is the referrer ---
    const { data: referralRows, error } = await supabase
      .from('referrals')
      .select('id, referred_id, level, earnings, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Referrals fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch referrals' },
        { status: 500 }
      );
    }

    const rows = referralRows || [];

    // --- Fetch the names/phones of referred users (in one query) ---
    const referredIds = rows.map((r) => r.referred_id);

    let referredUsers: Record<string, { name: string; phone: string }> = {};

    if (referredIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', referredIds);

      if (usersData) {
        referredUsers = usersData.reduce((acc, u) => {
          acc[u.id] = { name: u.name, phone: u.phone };
          return acc;
        }, {} as Record<string, { name: string; phone: string }>);
      }
    }

    // --- Group by level and total earnings ---
    const level1: any[] = [];
    const level2: any[] = [];
    const level3: any[] = [];

    let totalEarnings = 0;

    for (const row of rows) {
      totalEarnings += Number(row.earnings) || 0;

      const referred = referredUsers[row.referred_id];
      const entry = {
        id: row.id,
        referred_id: row.referred_id,
        name: referred?.name || 'Unknown',
        phone: referred?.phone || '',
        earnings: Number(row.earnings) || 0,
        joined_at: row.created_at,
      };

      if (row.level === 1) level1.push(entry);
      else if (row.level === 2) level2.push(entry);
      else if (row.level === 3) level3.push(entry);
    }

    return NextResponse.json({
      success: true,
      referralCode: user.referral_code,
      totalEarnings,
      counts: {
        level1: level1.length,
        level2: level2.length,
        level3: level3.length,
      },
      levels: {
        level1,
        level2,
        level3,
      },
    });
  } catch (err: any) {
    console.error('Referrals endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
