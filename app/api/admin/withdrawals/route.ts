import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/withdrawals?status=pending
// Returns all withdrawals, optionally filtered by status.
// Includes the requesting user's name and phone.
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
    const statusFilter = searchParams.get('status');

    const supabase = getServiceClient();

    let query = supabase
      .from('withdrawals')
      .select(
        'id, user_id, amount, recipient_phone, recipient_name, status, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: withdrawals, error } = await query;

    if (error) {
      console.error('Admin withdrawals fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch withdrawals' },
        { status: 500 }
      );
    }

    const rows = withdrawals || [];

    // --- Fetch user info for each withdrawal ---
    const userIds = Array.from(new Set(rows.map((w) => w.user_id)));

    let usersMap: Record<string, { name: string; phone: string }> = {};

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', userIds);

      if (usersData) {
        usersMap = usersData.reduce((acc, u) => {
          acc[u.id] = { name: u.name, phone: u.phone };
          return acc;
        }, {} as Record<string, { name: string; phone: string }>);
      }
    }

    const result = rows.map((w) => ({
      id: w.id,
      user_id: w.user_id,
      user_name: usersMap[w.user_id]?.name || 'Unknown',
      user_phone: usersMap[w.user_id]?.phone || '',
      amount: Number(w.amount) || 0,
      recipient_phone: w.recipient_phone,
      recipient_name: w.recipient_name,
      status: w.status,
      created_at: w.created_at,
    }));

    return NextResponse.json({
      success: true,
      withdrawals: result,
    });
  } catch (err: any) {
    console.error('Admin withdrawals endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
