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

// ==========================================
// POST /api/profile/bind
// Body: { phone, fullName }
// Sets OR updates the bound account details.
// Blocked if the user has a pending withdrawal
// (to prevent redirecting funds mid-review).
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
    const { phone: rawPhone, fullName } = body || {};

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please enter your full registered name' },
        { status: 400 }
      );
    }

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
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

    // --- Block changes if user has a pending withdrawal ---
    const { data: pendingWithdrawal } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingWithdrawal) {
      return NextResponse.json(
        {
          error:
            'You have a pending withdrawal. Wait for admin review before changing your bound account.',
        },
        { status: 400 }
      );
    }

    const wasBound = user.is_bound;

    const { error } = await supabase
      .from('users')
      .update({
        is_bound: true,
        bound_phone: phone,
        bound_full_name: fullName.trim(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Bind error:', error);
      return NextResponse.json(
        { error: 'Could not save. Please try again.' },
        { status: 500 }
      );
    }

    // --- Log the change ---
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: wasBound ? 'binding_updated' : 'binding_created',
      amount: 0,
      status: 'completed',
      meta: {
        bound_phone: phone,
        bound_full_name: fullName.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: wasBound ? 'Bound account updated' : 'Account bound successfully',
      bound_phone: phone,
      bound_full_name: fullName.trim(),
    });
  } catch (err: any) {
    console.error('Bind endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
