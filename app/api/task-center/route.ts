import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// TASK CENTER TIERS
// ==========================================
const TIERS = [
  { target: 100000, reward: 10000 },
  { target: 300000, reward: 25000 },
  { target: 500000, reward: 40000 },
  { target: 1000000, reward: 75000 },
  { target: 1500000, reward: 120000 },
  { target: 2000000, reward: 200000 },
];

// ==========================================
// Helper: get all team member IDs (L1 + L2 + L3)
// ==========================================
async function getTeamIds(supabase: any, userId: string) {
  const { data: l1 } = await supabase
    .from('users')
    .select('id')
    .eq('referred_by', userId);

  const l1Ids = (l1 || []).map((u: any) => u.id);

  let l2Ids: string[] = [];
  if (l1Ids.length > 0) {
    const { data: l2 } = await supabase
      .from('users')
      .select('id')
      .in('referred_by', l1Ids);
    l2Ids = (l2 || []).map((u: any) => u.id);
  }

  let l3Ids: string[] = [];
  if (l2Ids.length > 0) {
    const { data: l3 } = await supabase
      .from('users')
      .select('id')
      .in('referred_by', l2Ids);
    l3Ids = (l3 || []).map((u: any) => u.id);
  }

  return [...l1Ids, ...l2Ids, ...l3Ids];
}

// ==========================================
// Helper: sum team investment
// ==========================================
async function calculateTeamInvestment(supabase: any, teamIds: string[]) {
  if (teamIds.length === 0) return 0;

  const { data: modules } = await supabase
    .from('user_modules')
    .select('price_paid')
    .in('user_id', teamIds);

  return (modules || []).reduce(
    (sum: number, m: any) => sum + (Number(m.price_paid) || 0),
    0
  );
}

// ==========================================
// GET /api/task-center
// Returns team stats + tier statuses
// ==========================================
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = getServiceClient();

    const teamIds = await getTeamIds(supabase, user.id);
    const teamInvestment = await calculateTeamInvestment(supabase, teamIds);

    const { data: claims } = await supabase
      .from('task_claims')
      .select('tier_amount')
      .eq('user_id', user.id);

    const claimedTiers = new Set(
      (claims || []).map((c: any) => Number(c.tier_amount))
    );

    const tiers = TIERS.map((tier) => {
      const isClaimed = claimedTiers.has(tier.target);
      const canClaim = teamInvestment >= tier.target && !isClaimed;
      return {
        target: tier.target,
        reward: tier.reward,
        status: isClaimed ? 'claimed' : canClaim ? 'claimable' : 'locked',
        progress: Math.min(
          100,
          Math.round((teamInvestment / tier.target) * 100)
        ),
      };
    });

    return NextResponse.json({
      success: true,
      teamInvestment,
      teamSize: teamIds.length,
      tiers,
    });
  } catch (err) {
    console.error('Task center GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ==========================================
// POST /api/task-center
// Body: { tierAmount: number }
// Claims a reward if eligible
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { tierAmount } = body || {};

    if (!tierAmount) {
      return NextResponse.json(
        { error: 'tierAmount is required' },
        { status: 400 }
      );
    }

    const tier = TIERS.find((t) => t.target === Number(tierAmount));
    if (!tier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const teamIds = await getTeamIds(supabase, user.id);
    const teamInvestment = await calculateTeamInvestment(supabase, teamIds);

    if (teamInvestment < tier.target) {
      return NextResponse.json(
        {
          error: `You need UGX ${tier.target.toLocaleString()} team investment to claim this.`,
        },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('task_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('tier_amount', tier.target)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already claimed this reward.' },
        { status: 400 }
      );
    }

    const { error: insErr } = await supabase.from('task_claims').insert({
      user_id: user.id,
      tier_amount: tier.target,
      reward_amount: tier.reward,
    });

    if (insErr) {
      console.error('Task claim insert error:', insErr);
      return NextResponse.json(
        { error: 'Could not process claim' },
        { status: 500 }
      );
    }

    const { data: freshUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    const currentBalance = Number(freshUser?.balance) || 0;
    const newBalance = currentBalance + tier.reward;

    await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', user.id);

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'task_center_reward',
      amount: tier.reward,
      status: 'completed',
      meta: {
        tier_amount: tier.target,
        reason: `Task Center milestone: ${tier.target.toLocaleString()} team investment`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `🎉 You claimed UGX ${tier.reward.toLocaleString()}!`,
      newBalance,
    });
  } catch (err) {
    console.error('Task center POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
