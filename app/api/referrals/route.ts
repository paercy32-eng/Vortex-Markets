import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/referrals
// Reads the referral tree using users.referred_by
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

    // --- Level 1: direct referrals ---
    const { data: level1Users } = await supabase
      .from('users')
      .select('id, name, phone, created_at')
      .eq('referred_by', user.id)
      .order('created_at', { ascending: false });

    const level1Ids = (level1Users || []).map((u) => u.id);

    // --- Level 2 ---
    let level2Users: any[] = [];
    if (level1Ids.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, name, phone, created_at')
        .in('referred_by', level1Ids)
        .order('created_at', { ascending: false });
      level2Users = data || [];
    }

    const level2Ids = level2Users.map((u) => u.id);

    // --- Level 3 ---
    let level3Users: any[] = [];
    if (level2Ids.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, name, phone, created_at')
        .in('referred_by', level2Ids)
        .order('created_at', { ascending: false });
      level3Users = data || [];
    }

    // --- Fetch earnings from referrals table (if any exist) ---
    const allReferredIds = [
      ...level1Ids,
      ...level2Ids,
      ...level3Users.map((u) => u.id),
    ];

    let earningsMap: Record<string, number> = {};
    if (allReferredIds.length > 0) {
      const { data: earningsRows } = await supabase
        .from('referrals')
        .select('referred_id, earnings')
        .eq('referrer_id', user.id);

      if (earningsRows) {
        earningsRows.forEach((r) => {
          earningsMap[r.referred_id] =
            (earningsMap[r.referred_id] || 0) + Number(r.earnings || 0);
        });
      }
    }

    const buildEntry = (u: any) => ({
      id: u.id,
      referred_id: u.id,
      name: u.name || 'Unknown',
      phone: u.phone || '',
      earnings: earningsMap[u.id] || 0,
      joined_at: u.created_at,
    });

    const level1 = level1Users?.map(buildEntry) || [];
    const level2 = level2Users.map(buildEntry);
    const level3 = level3Users.map(buildEntry);

    const totalEarnings = Object.values(earningsMap).reduce(
      (sum, val) => sum + val,
      0
    );

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
