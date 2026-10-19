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

    // 2. Check if it has already been used
    if (giftCard.is_used) {
      return NextResponse.json({ error: 'This gift code has already been used.' }, { status: 400 });
    }

    // 3. Check if it has expired (5 minutes)
    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      // Optionally mark it as used so it can't be tried again
      await supabase.from('gift_cards').update({ is_used: true }).eq('id', giftCard.id);
      return NextResponse.json({ error: 'This gift code has expired.' }, { status: 400 });
    }

    // 4. Generate a random amount between 25 and 700
    const randomAmount = Math.floor(Math.random() * (700 - 25 + 1)) + 25;

    // 5. Mark the code as used
    await supabase
      .from('gift_cards')
      .update({ is_used: true })
      .eq('id', giftCard.id);

    // 6. Credit the user's balance
    const { data: dbUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (dbUser) {
      await supabase
        .from('users')
        .update({ balance: Number(dbUser.balance) + randomAmount })
        .eq('id', user.id);
    }

    // 7. Log the transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'gift_card_win',
      amount: randomAmount,
      status: 'completed',
      meta: { code: cleanCode },
    });

    return NextResponse.json({
      success: true,
      amount: randomAmount,
      message: `🎉 You won UGX ${randomAmount.toLocaleString()}!`,
    });

  } catch (err: any) {
    console.error('Gift card redeem error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
