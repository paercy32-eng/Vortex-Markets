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

function normalizePhone(input: string): string {
  let phone = (input || '').replace(/[^\d]/g, '');
  if (phone.startsWith('0')) phone = '256' + phone.slice(1);
  if (phone.startsWith('7') && phone.length === 9) phone = '256' + phone;
  return phone;
}

function isValidPhone(phone: string): boolean {
  return /^2567\d{8}$/.test(phone);
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  const isForm = contentType.includes('form');

  try {
    let rawPhone = '';
    let password = '';

    if (isForm) {
      const formData = await req.formData();
      rawPhone = String(formData.get('phone') || '');
      password = String(formData.get('password') || '');
    } else {
      const body = await req.json();
      rawPhone = body.phone;
      password = body.password;
    }

    if (!rawPhone || !password) {
      if (isForm) {
        return NextResponse.redirect(
          new URL('/login?error=' + encodeURIComponent('Enter phone and password'), req.url)
        );
      }
      return NextResponse.json(
        { error: 'Phone and password required' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(rawPhone);

    if (!isValidPhone(phone)) {
      if (isForm) {
        return NextResponse.redirect(
          new URL('/login?error=' + encodeURIComponent('Invalid phone number'), req.url)
        );
      }
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: user } = await supabase
      .from('users')
      .select('id, name, phone, password_hash, referral_code, balance, is_banned')
      .eq('phone', phone)
      .maybeSingle();

    if (!user) {
      if (isForm) {
        return NextResponse.redirect(
          new URL('/login?error=' + encodeURIComponent('Invalid phone or password'), req.url)
        );
      }
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    // --- Check ban BEFORE verifying password to save compute ---
    // (Still return generic message to avoid leaking account status on wrong password,
    //  but if password is correct and user is banned, give a clear message.)
    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      if (isForm) {
        return NextResponse.redirect(
          new URL('/login?error=' + encodeURIComponent('Invalid phone or password'), req.url)
        );
      }
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    // --- Password correct, now check ban ---
    if (user.is_banned) {
      if (isForm) {
        return NextResponse.redirect(
          new URL('/login?error=' + encodeURIComponent('Account suspended. Contact support.'), req.url)
        );
      }
      return NextResponse.json(
        { error: 'Account suspended. Contact support.' },
        { status: 403 }
      );
    }

    const token = signUserToken({ userId: user.id, phone: user.phone });

    // ==========================================
    // FORM SUBMISSION → redirect
    // ==========================================
    if (isForm) {
  const res = NextResponse.redirect(new URL('/modules', req.url), 303);
      res.cookies.set(USER_COOKIE_NAME, token, USER_COOKIE_OPTIONS);
      return res;
    }

    // ==========================================
    // JSON SUBMISSION
    // ==========================================
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
    if (isForm) {
      return NextResponse.redirect(
        new URL('/login?error=' + encodeURIComponent('Something went wrong'), req.url)
      );
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
          }
