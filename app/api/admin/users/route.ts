export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    // 1. Fetch Users
    let query = supabase
      .from('users')
      .select('id, name, phone, balance, is_banned, referral_code, created_at')
      .order('created_at', { ascending: false });

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data: users, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to load' }, { status: 500 });

    // 2. Fetch all active modules to count them
    const { data: activeModules } = await supabase
      .from('user_modules')
      .select('user_id')
      .eq('status', 'active');

    // 3. Fetch all users referred_by to count invites
    const { data: referrals } = await supabase
      .from('users')
      .select('referred_by')
      .not('referred_by', 'is', null);

    // 4. Map the stats to each user
    const enriched = (users || []).map((u) => {
      const activeRentals = (activeModules || []).filter((m) => m.user_id === u.id).length;
      const validInvites = (referrals || []).filter((r) => r.referred_by === u.id).length;

      return {
        ...u,
        balance: Number(u.balance) || 0,
        valid_invites: validInvites,
        active_rentals: activeRentals,
      };
    });

    return NextResponse.json({ users: enriched });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
