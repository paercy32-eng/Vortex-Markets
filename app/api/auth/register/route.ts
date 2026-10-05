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

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VRTX-${code}`;
}

// ==========================================
// POST /api/auth/register
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      phone: rawPhone,
      password,
      confirmPassword,
      referralCode,
    } = body || {};

    // --- Validate inputs ---
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please enter your full name' },
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

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Check if phone already registered ---
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This phone number is already registered' },
        { status: 409 }
      );
    }

    // --- Resolve referrer (if referral code supplied) ---
    let referrerId: string | null = null;
    if (referralCode && typeof referralCode === 'string') {
      const cleanCode = referralCode.trim().toUpperCase();
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', cleanCode)
        .maybeSingle();

      if (referrer) referrerId = referrer.id;
    }

    // --- Hash password (cost 10) ---
    const password_hash = await bcrypt.hash(password, 10);

    // --- Generate unique referral code (retry if collision) ---
    let newReferralCode = generateReferralCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: clash } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', newReferralCode)
        .maybeSingle();
      if (!clash) break;
      newReferralCode = generateReferralCode();
    }

    // --- Insert user ---
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        phone,
        password_hash,
        referral_code: newReferralCode,
        referred_by: referrerId,
        balance: 0,
      })
      .select('id, name, phone, referral_code')
      .single();

    if (insertErr || !newUser) {
      console.error('Register insert error:', insertErr);
      return NextResponse.json(
        { error: 'Could not create account. Please try again.' },
        { status: 500 }
      );
    }

    // --- Build referral chain (Level 1, 2, 3) ---
    if (referrerId) {
      // Level 1: direct referrer
      await supabase.from('referrals').insert({
        referrer_id: referrerId,
        referred_id: newUser.id,
        level: 1,
        earnings: 0,
      });

      // Level 2
      const { data: lvl1User } = await supabase
        .from('users')
        .select('referred_by')
        .eq('id', referrerId)
        .maybeSingle();

      if (lvl1User?.referred_by) {
        await supabase.from('referrals').insert({
          referrer_id: lvl1User.referred_by,
          referred_id: newUser.id,
          level: 2,
          earnings: 0,
        });

        // Level 3
        const { data: lvl2User } = await supabase
          .from('users')
          .select('referred_by')
          .eq('id', lvl1User.referred_by)
          .maybeSingle();

        if (lvl2User?.referred_by) {
          await supabase.from('referrals').insert({
            referrer_id: lvl2User.referred_by,
            referred_id: newUser.id,
            level: 3,
            earnings: 0,
          });
        }
      }
    }

    // --- Sign JWT and set cookie ---
    const token = signUserToken({
      userId: newUser.id,
      phone: newUser.phone,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        referral_code: newUser.referral_code,
      },
    });

    res.cookies.set(USER_COOKIE_NAME, token, USER_COOKIE_OPTIONS);

    return res;
  } catch (err: any) {
    console.error('Register error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
