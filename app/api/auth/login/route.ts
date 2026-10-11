import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { signUserToken, USER_COOKIE_NAME, USER_COOKIE_OPTIONS } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

// Normalize phone to consistent format: 256XXXXXXXXX (no plus)
function normalizePhone(input: string): string {
  let phone = (input || '').replace(/[^\d]/g, '');
  if (phone.startsWith('0')) phone = '256' + phone.slice(1);
  if (phone.startsWith('7') && phone.length === 9) phone = '256' + phone;
  return phone;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password are required.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const normalizedPhone = normalizePhone(cleanPhone);

    // --- Look up user with ANY possible phone format ---
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, password_hash, is_banned')
      .or(`phone.eq.${normalizedPhone},phone.eq.0${normalizedPhone.slice(3)},phone.eq.+${normalizedPhone}`)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'Invalid phone number or password.' }, { status: 401 });
    }

    if (user.is_banned) {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });
    }

    // --- Verify password ---
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return NextResponse.json({ error: 'Invalid phone number or password.' }, { status: 401 });
    }

    // --- Create session ---
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
      },
    });

    res.cookies.set(USER_COOKIE_NAME, token, USER_COOKIE_OPTIONS);

    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
        }
