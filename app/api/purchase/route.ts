import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// REFERRAL COMMISSION RATES
// ==========================================
const REFERRAL_RATES: Record<number, number> = {
  1: 0.20, // Level 1: 20%
  2: 0.03, // Level 2: 3%
  3: 0.01, // Level 3: 1%
};

// ==========================================
// POST /api/purchase
// Body: { productId: string }
//
// 1. Deducts product price from user's balance
// 2. Creates a user_module (active earning module)
// 3. Creates an order record
// 4. Logs a purchase transaction
// 5. Credits referral commissions to L1/L2/L3 referrers
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
    const { productId } = body || {};

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Fetch the product ---
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price, cycle_days, daily_return')
      .eq('id', productId)
      .maybeSingle();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const price = Number(product.price) || 0;

    // --- Re-fetch user's balance (fresh, in case of concurrent requests) ---
    const { data: freshUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    const currentBalance = Number(freshUser?.balance) || 0;

    if (currentBalance < price) {
      return NextResponse.json(
        { error: 'Insufficient balance. Please recharge first.' },
        { status: 400 }
      );
    }

    // --- Deduct balance ---
    const newBalance = currentBalance - price;

    const { error: balErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (balErr) {
      console.error('Balance update error:', balErr);
      return NextResponse.json(
        { error: 'Could not process payment' },
        { status: 500 }
      );
    }

    // --- Compute module timing ---
    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + product.cycle_days * 24 * 60 * 60 * 1000
    );
    const dailyReturnNum = Number(product.daily_return) || 0;
    const totalCreditable = dailyReturnNum * product.cycle_days;

    // --- Create user_module ---
    const { data: userModule, error: umErr } = await supabase
      .from('user_modules')
      .insert({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        price_paid: price,
        cycle_days: product.cycle_days,
        daily_return: dailyReturnNum,
        total_creditable: totalCreditable,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
      })
      .select(
        'id, product_name, price_paid, cycle_days, daily_return, total_creditable, started_at, expires_at, status'
      )
      .single();

    if (umErr || !userModule) {
      // Rollback balance
      await supabase
        .from('users')
        .update({ balance: currentBalance })
        .eq('id', user.id);

      console.error('User module insert error:', umErr);
      return NextResponse.json(
        { error: 'Could not create module. Please try again.' },
        { status: 500 }
      );
    }

    // --- Create order record ---
    await supabase.from('orders').insert({
      user_id: user.id,
      product_id: product.id,
      amount: price,
      status: 'completed',
    });

    // --- Log the purchase transaction ---
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount: -price,
      status: 'completed',
      meta: {
        product_id: product.id,
        product_name: product.name,
        user_module_id: userModule.id,
      },
    });

    // --- Process referral commissions (L1: 20%, L2: 3%, L3: 1%) ---
    const { data: refRows } = await supabase
      .from('referrals')
      .select('id, referrer_id, level, earnings')
      .eq('referred_id', user.id);

    if (refRows && refRows.length > 0) {
      for (const ref of refRows) {
        const rate = REFERRAL_RATES[ref.level] || 0;
        if (rate <= 0) continue;

        // Round to 2 decimals to avoid floating-point noise
        const commission = Math.round(price * rate * 100) / 100;
        if (commission <= 0) continue;

        // --- Credit referrer's balance ---
        const { data: refUser } = await supabase
          .from('users')
          .select('balance')
          .eq('id', ref.referrer_id)
          .single();

        if (refUser) {
          const refCurrentBalance = Number(refUser.balance) || 0;
          const refNewBalance = refCurrentBalance + commission;

          await supabase
            .from('users')
            .update({ balance: refNewBalance })
            .eq('id', ref.referrer_id);
        }

        // --- Update the referral row's earnings ---
        const prevEarnings = Number(ref.earnings) || 0;
        await supabase
          .from('referrals')
          .update({ earnings: prevEarnings + commission })
          .eq('id', ref.id);

        // --- Log a transaction for the referrer ---
        await supabase.from('transactions').insert({
          user_id: ref.referrer_id,
          type: 'referral_commission',
          amount: commission,
          status: 'completed',
          meta: {
            level: ref.level,
            from_user_id: user.id,
            from_user_name: user.name,
            product_name: product.name,
            product_price: price,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `You now own ${product.name}!`,
      userModule: {
        ...userModule,
        price_paid: Number(userModule.price_paid) || 0,
        daily_return: Number(userModule.daily_return) || 0,
        total_creditable: Number(userModule.total_creditable) || 0,
      },
      newBalance,
    });
  } catch (err: any) {
    console.error('Purchase endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
                }
