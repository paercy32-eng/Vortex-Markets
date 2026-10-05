import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/deposits?status=pending
// Returns all deposits (payments with type='deposit'),
// optionally filtered by status.
// Includes the user's name and phone.
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
      .from('payments')
      .select('id, user_id, amount, status, reference, created_at')
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Admin deposits fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch deposits' },
        { status: 500 }
      );
    }

    const rows = deposits || [];

    // --- Fetch user info for each deposit ---
    const userIds = Array.from(new Set(rows.map((d) => d.user_id)));

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

    const result = rows.map((d) => ({
      id: d.id,
      user_id: d.user_id,
      user_name: usersMap[d.user_id]?.name || 'Unknown',
      user_phone: usersMap[d.user_id]?.phone || '',
      amount: Number(d.amount) || 0,
      status: d.status,
      reference: d.reference,
      created_at: d.created_at,
    }));

    return NextResponse.json({
      success: true,
      deposits: result,
    });
  } catch (err: any) {
    console.error('Admin deposits endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
