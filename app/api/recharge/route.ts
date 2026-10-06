import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// HELPERS (same as auth)
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
// Creates a pending deposit request.
// Marzpay integration will be wired here in the next phase.
// For now, this just records the intent with the phone.
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

    // --- Validate amount ---
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Enter a valid amount' },
        { status: 400 }
      );
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
    // TODO: Marzpay integration
    // Here we'll call Marzpay's API to initiate a
    // mobile money collection prompt to the user's phone.
    // The response will include a Marzpay transaction ID
    // that we store in the payment's `reference`.
    //
    // For now, we just record the intent and return.
    // ==========================================

    return NextResponse.json({
      success: true,
      message: 'Recharge request created. A prompt will be sent to your phone.',
      payment: {
        ...payment,
        amount: Number(payment.amount) || 0,
      },
      phone,
    });
  } catch (err: any) {
    console.error('Recharge endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
