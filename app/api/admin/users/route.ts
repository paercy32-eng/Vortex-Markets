import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/users?q=search
// Returns all users, optionally filtered by name or phone.
// Includes: balance, referral code, module count.
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('q') || '').trim();

    const supabase = getServiceClient();

    let query = supabase
      .from('users')
      .select(
        'id, name, phone, balance, referral_code, referred_by, is_bound, bound_phone, bound_full_name, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (search) {
      // Match name or phone (case-insensitive)
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Admin users fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch users' },
        { status: 500 }
      );
    }

    const rows = users || [];

    // --- Count active modules per user ---
    const userIds = rows.map((u) => u.id);

    let moduleCounts: Record<string, number> = {};

    if (userIds.length > 0) {
      const { data: modules } = await supabase
        .from('user_modules')
        .select('user_id, status')
        .in('user_id', userIds)
        .eq('status', 'active');

      if (modules) {
        moduleCounts = modules.reduce((acc, m) => {
          acc[m.user_id] = (acc[m.user_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    const result = rows.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      balance: Number(u.balance) || 0,
      referral_code: u.referral_code,
      referred_by: u.referred_by,
      is_bound: u.is_bound,
      bound_phone: u.bound_phone,
      bound_full_name: u.bound_full_name,
      active_modules: moduleCounts[u.id] || 0,
      created_at: u.created_at,
    }));

    return NextResponse.json({
      success: true,
      users: result,
    });
  } catch (err: any) {
    console.error('Admin users endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
