import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function normalizePhone(input: string): string {
  let phone = (input || '').replace(/[^\d]/g, '');
  if (phone.startsWith('0')) phone = '256' + phone.slice(1);
  if (phone.startsWith('7') && phone.length === 9) phone = '256' + phone;
  return phone;
}

function isValidPhone(phone: string): boolean {
  return /^2567\d{8}$/.test(phone);
}

const MIN_DEPOSIT = 10000;

// ==========================================
// POST /api/recharge
// Body: { amount, phone }
//
// Creates a PENDING deposit with the sender's
// phone. User will then pay the merchant code
// and submit their transaction ID separately.
// Admin verifies and approves.
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
    const { amount: rawAmount, phone: rawPhone } = body || {};
    const amount = Number(rawAmount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Enter a valid amount' },
        { status: 400 }
      );
    }

    if (amount < MIN_DEPOSIT) {
      return NextResponse.json(
        { error: `Minimum deposit is ${MIN_DEPOSIT.toLocaleString()} UGX` },
        { status: 400 }
      );
    }

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Mobile money number is required' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(rawPhone);

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Enter a valid Ugandan phone number' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const reference = `VRTX-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        type: 'deposit',
        status: 'pending',
        reference,
        sender_phone: phone,
      })
      .select('id, amount, status, reference, sender_phone, created_at')
      .single();

    if (error || !payment) {
      console.error('Recharge insert error:', error);
      return NextResponse.json(
        { error: 'Could not create deposit request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit created. Complete the payment and submit your transaction ID.',
      payment: {
        ...payment,
        amount: Number(payment.amount) || 0,
      },
    });
  } catch (err: any) {
    console.error('Recharge endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
  }
