import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceClient } from '@/lib/supabase';
import {
  signUserToken,
  USER_COOKIE_NAME,
  USER_COOKIE_OPTIONS,
} from '@/lib/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// HELPERS (must match register route)
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
// POST /api/auth/login
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone: rawPhone, password } = body || {};

    // --- Validate inputs ---
    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(rawPhone);

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Find user by phone ---
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, phone, password_hash, referral_code, balance')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Login lookup error:', error);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    // --- Use a generic message for both cases (prevents user enumeration) ---
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    // --- Verify password ---
    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    // --- Sign JWT and set cookie ---
    const token = signUserToken({
      userId: user.id,
      phone: user.phone,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        referral_code: user.referral_code,
        balance: Number(user.balance) || 0,
      },
    });

    res.cookies.set(USER_COOKIE_NAME, token, USER_COOKIE_OPTIONS);

    return res;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
