import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Enter a valid gift code' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const supabase = getServiceClient();

    // 1. Find the gift code in the database
    const { data: giftCard } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (!giftCard) {
      return NextResponse.json({ error: 'Invalid gift code.' }, { status: 404 });
    }

    // 2. Check if it has already been fully used
    if (giftCard.is_used) {
      return NextResponse.json({ error: 'This gift code has already been fully claimed.' }, { status: 400 });
    }

    // 3. Check if it has expired (5 minutes)
    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      // Mark it as used so it can't be tried again
      await supabase.from('gift_cards').update({ is_used: true }).eq('id', giftCard.id);
      return NextResponse.json({ error: 'This gift code has expired.' }, { status: 400 });
    }

    // 4. Check if there is any balance left
    const currentBalance = Number(giftCard.balance) || 0;
    if (currentBalance <= 0) {
      await supabase.from('gift_cards').update({ is_used: true }).eq('id', giftCard.id);
      return NextResponse.json({ error: 'This gift code has been fully claimed.' }, { status: 400 });
    }

    // 5. Generate a random amount between 25 and 700
    const minWin = 25;
    const maxWin = 700;
    let winAmount = Math.floor(Math.random() * (maxWin - minWin + 1)) + minWin;

    // 6. Ensure the win doesn't exceed the remaining card balance
    if (winAmount > currentBalance) {
      winAmount = currentBalance;
    }

    // 7. Update the gift card balance
    const newCardBalance = currentBalance - winAmount;
    const isFullyClaimed = newCardBalance <= 0;

    await supabase
      .from('gift_cards')
      .update({ 
        balance: newCardBalance,
        is_used: isFullyClaimed 
      })
      .eq('id', giftCard.id);

    // 8. Credit the user's balance
    const { data: dbUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (dbUser) {
      await supabase
        .from('users')
        .update({ balance: Number(dbUser.balance) + winAmount })
        .eq('id', user.id);
    }

    // 9. Log the transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'gift_card_win',
      amount: winAmount,
      status: 'completed',
      meta: { 
        code: cleanCode, 
        remaining_card_balance: newCardBalance 
      },
    });

    return NextResponse.json({
      success: true,
      amount: winAmount,
      message: `🎉 You won UGX ${winAmount.toLocaleString()}!`,
    });

  } catch (err: any) {
    console.error('Gift card redeem error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
