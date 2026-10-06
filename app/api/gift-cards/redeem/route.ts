import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// POST /api/gift-cards/redeem
// Body: { code: string }
//
// Redeems the FULL remaining value of a gift card
// and credits it to the user's balance.
// - Card must exist, be active, not expired
// - Card must have remaining value > 0
// - User can only claim each card ONCE
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code: rawCode } = body || {};

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json(
        { error: 'Enter a gift card code' },
        { status: 400 }
      );
    }

    const code = rawCode.trim().toUpperCase();

    const supabase = getServiceClient();

    // --- Find the gift card ---
    const { data: card } = await supabase
      .from('gift_cards')
      .select(
        'id, code, total_value, claimed_value, expires_at, is_active'
      )
      .eq('code', code)
      .maybeSingle();

    if (!card) {
      return NextResponse.json(
        { error: 'Invalid gift card code' },
        { status: 404 }
      );
    }

    // --- Active check ---
    if (!card.is_active) {
      return NextResponse.json(
        { error: 'This gift card is no longer active' },
        { status: 400 }
      );
    }

    // --- Expiry check ---
    if (card.expires_at && new Date(card.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This gift card has expired' },
        { status: 400 }
      );
    }

    const totalValue = Number(card.total_value) || 0;
    const claimedValue = Number(card.claimed_value) || 0;
    const remaining = totalValue - claimedValue;

    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'This gift card has already been fully claimed' },
        { status: 400 }
      );
    }

    // --- Prevent double-claiming by the same user ---
    // Check if this user has already redeemed this specific card
    const { data: existingClaim } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'gift_redeemed')
      .contains('meta', { gift_card_id: card.id })
      .maybeSingle();

    if (existingClaim) {
      return NextResponse.json(
        { error: 'You have already redeemed this gift card' },
        { status: 400 }
      );
    }

    // --- Credit balance ---
    const { data: freshUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    const currentBalance = Number(freshUser?.balance) || 0;
    const newBalance = currentBalance + remaining;

    const { error: balErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (balErr) {
      console.error('Gift card balance credit error:', balErr);
      return NextResponse.json(
        { error: 'Could not credit balance' },
        { status: 500 }
      );
    }

    // --- Mark card as fully claimed ---
    const { error: cardErr } = await supabase
      .from('gift_cards')
      .update({ claimed_value: totalValue })
      .eq('id', card.id);

    if (cardErr) {
      // Rollback balance
      await supabase
        .from('users')
        .update({ balance: currentBalance })
        .eq('id', user.id);

      console.error('Gift card update error:', cardErr);
      return NextResponse.json(
        { error: 'Could not redeem gift card' },
        { status: 500 }
      );
    }

    // --- Log the transaction ---
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'gift_redeemed',
      amount: remaining,
      status: 'completed',
      meta: {
        gift_card_id: card.id,
        code: card.code,
      },
    });

    return NextResponse.json({
      success: true,
      message: `You received ${remaining.toLocaleString()} UGX`,
      amount: remaining,
      newBalance,
    });
  } catch (err: any) {
    console.error('Gift card redeem error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
