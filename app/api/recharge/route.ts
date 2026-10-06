import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// HELPERS
// ==========================================
function normalizePhone(input: string): string {
  let phone = (input || '').replace(/[^\d]/g, '');
  if (phone.startsWith('0')) phone = '256' + phone.slice(1);
  if (phone.startsWith('7') && phone.length === 9) phone = '256' + phone;
  return phone;
}

function isValidPhone(phone: string): boolean {
  return /^2567\d{8}$/.test(phone);
}

// ==========================================
// POST /api/recharge
// Body: { amount, phone }
//
// 1. Creates a pending deposit row
// 2. Calls Marzpay to send a PIN prompt to the phone
// 3. Returns success
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { amount: rawAmount, phone: rawPhone } = body || {};
    const amount = Number(rawAmount);

    // --- Validate amount ---
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
    }

    // --- Validate phone ---
    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Mobile money number is required' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(rawPhone);

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Enter a valid Ugandan phone number (e.g. 0700123456)' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Generate a unique reference ---
    const reference = `VRTX-DEP-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    // --- Create pending payment record ---
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        type: 'deposit',
        status: 'pending',
        reference,
      })
      .select('id, amount, status, reference, created_at')
      .single();

    if (error || !payment) {
      console.error('Recharge insert error:', error);
      return NextResponse.json(
        { error: 'Could not create recharge request' },
        { status: 500 }
      );
    }

    // ==========================================
    // Marzpay integration
    // ==========================================
    const marzpayKey = process.env.MARZPAY_API_KEY;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://vortex-markets.vercel.app';

    if (!marzpayKey) {
      console.error('Missing MARZPAY_API_KEY');
      // Mark the payment as failed so the user isn't left waiting
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    // Call Marzpay collect endpoint
    // NOTE: Adjust the URL + body fields to match Marzpay's actual API docs
    const marzpayRes = await fetch(
      'https://wallet.wearemarz.com/api/v1/collect-money',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${marzpayKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          phone_number: phone,
          customer_name: user.name || 'Vortex User',
          reference,
          callback_url: `${appUrl}/api/webhooks/marzpay`,
          description: `Vortex Markets deposit for ${user.name || 'user'}`,
        }),
      }
    );

    const marzpayData = await marzpayRes.json().catch(() => ({}));
    console.log('Marzpay collect response:', marzpayData);

    if (!marzpayRes.ok || marzpayData?.success === false) {
      console.error('Marzpay collect failed:', marzpayData);
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return NextResponse.json(
        {
          error:
            marzpayData?.message ||
            marzpayData?.error ||
            'Payment request failed',
        },
        { status: 400 }
      );
    }

    // Success — Marzpay sent the prompt
    return NextResponse.json({
      success: true,
      message: 'A PIN prompt was sent to your phone.',
      payment: {
        ...payment,
        amount: Number(payment.amount) || 0,
      },
      phone,
    });
  } catch (err: any) {
    console.error('Recharge endpoint error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
