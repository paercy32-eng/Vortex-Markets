import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// HELPERS (same normalization as auth routes)
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
// POST /api/profile/bind
// Saves the user's bound phone + full name.
// These are the details used for withdrawals.
// Can only be set once (unless admin resets it).
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

    // --- Prevent rebinding (once bound, stays bound) ---
    if (user.is_bound) {
      return NextResponse.json(
        { error: 'Account is already bound. Contact support to change.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { phone: rawPhone, fullName } = body || {};

    // --- Validate full name ---
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please enter your full registered name' },
        { status: 400 }
      );
    }

    // --- Validate phone ---
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

    // --- Update user ---
    const supabase = getServiceClient();
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
        { error: 'Could not bind account. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account bound successfully',
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
