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
  1: 0.25, // Level 1: 25%
  2: 0.03, // Level 2: 3%
  3: 0.01, // Level 3: 1%
};

// ==========================================
// POST /api/purchase
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

    // --- Re-fetch user's balance ---
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

    // --- Check if this is the user's FIRST purchase ---
    const { count: previousPurchases } = await supabase
      .from('user_modules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isFirstPurchase = (previousPurchases ?? 0) === 0;

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

    // ==========================================
    // REFERRAL COMMISSIONS
    // Only credited on the buyer's FIRST purchase.
    // Walks up the tree using users.referred_by
    // ==========================================
    if (isFirstPurchase) {
      await creditReferralCommissions({
        supabase,
        buyerId: user.id,
        buyerName: user.name,
        productName: product.name,
        price,
      });
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

// ==========================================
// creditReferralCommissions
// Walks up the tree (L1 → L2 → L3) and credits each
// referrer at the appropriate rate.
// ==========================================
async function creditReferralCommissions({
  supabase,
  buyerId,
  buyerName,
  productName,
  price,
}: {
  supabase: any;
  buyerId: string;
  buyerName: string;
  productName: string;
  price: number;
}) {
  let currentUserId = buyerId;

  for (let level = 1; level <= 3; level++) {
    // Find the referrer of currentUserId
    const { data: current } = await supabase
      .from('users')
      .select('referred_by')
      .eq('id', currentUserId)
      .maybeSingle();

    const referrerId = current?.referred_by;
    if (!referrerId) break; // no more ancestors

    const rate = REFERRAL_RATES[level] || 0;
    if (rate <= 0) break;

    const commission = Math.round(price * rate * 100) / 100;
    if (commission <= 0) break;

    // --- Credit referrer's balance ---
    const { data: refUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', referrerId)
      .maybeSingle();

    if (refUser) {
      const refCurrentBalance = Number(refUser.balance) || 0;
      await supabase
        .from('users')
        .update({ balance: refCurrentBalance + commission })
        .eq('id', referrerId);
    }

    // --- Log a transaction for the referrer ---
    await supabase.from('transactions').insert({
      user_id: referrerId,
      type: 'referral_commission',
      amount: commission,
      status: 'completed',
      meta: {
        level,
        from_user_id: buyerId,
        from_user_name: buyerName,
        product_name: productName,
        product_price: price,
        rate: rate * 100 + '%',
      },
    });

    // Move up the chain
    currentUserId = referrerId;
  }
}
