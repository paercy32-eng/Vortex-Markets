import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/my-modules
// Returns the current user's purchased modules
// with cycle progress and earnings.
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

    const { data, error } = await supabase
      .from('user_modules')
      .select(
        'id, product_id, product_name, price_paid, cycle_days, daily_return, total_creditable, days_credited, total_credited, started_at, expires_at, last_credited_at, status, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('My modules fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch your modules' },
        { status: 500 }
      );
    }

    const modules = (data || []).map((m) => {
      const cycleDays = Number(m.cycle_days) || 0;
      const daysCredited = Number(m.days_credited) || 0;
      const progress =
        cycleDays > 0 ? Math.min(100, Math.round((daysCredited / cycleDays) * 100)) : 0;

      return {
        id: m.id,
        product_id: m.product_id,
        product_name: m.product_name,
        price_paid: Number(m.price_paid) || 0,
        cycle_days: cycleDays,
        daily_return: Number(m.daily_return) || 0,
        total_creditable: Number(m.total_creditable) || 0,
        days_credited: daysCredited,
        total_credited: Number(m.total_credited) || 0,
        started_at: m.started_at,
        expires_at: m.expires_at,
        last_credited_at: m.last_credited_at,
        status: m.status,
        progress,
      };
    });

    return NextResponse.json({
      success: true,
      modules,
    });
  } catch (err: any) {
    console.error('My modules endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
