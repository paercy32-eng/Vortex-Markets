import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/auth/me
// Returns the current user + subscription info.
// Used on app load to hydrate the UI.
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

    // --- Fetch the user's latest subscription ---
    const supabase = getServiceClient();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, plan, amount_paid, starts_at, expires_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // --- Determine if subscription is currently active ---
    let activeSubscription = null;
    if (subscription && subscription.status === 'active') {
      const expiresAt = new Date(subscription.expires_at).getTime();
      const now = Date.now();

      if (expiresAt > now) {
        const daysRemaining = Math.ceil(
          (expiresAt - now) / (1000 * 60 * 60 * 24)
        );
        activeSubscription = {
          ...subscription,
          daysRemaining,
        };
      } else {
        // Subscription expired — mark it in the DB (self-healing)
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', subscription.id);
      }
    }

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
      subscription: activeSubscription,
    });
  } catch (err: any) {
    console.error('Me endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
