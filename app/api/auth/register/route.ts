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

const WELCOME_BONUS = 3000;

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

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  const isForm = contentType.includes('form');

  function failRedirect(msg: string) {
    return NextResponse.redirect(
      new URL('/register?error=' + encodeURIComponent(msg), req.url)
    );
  }

  try {
    let name = '';
    let rawPhone = '';
    let password = '';
    let confirmPassword = '';
    let referralCode = '';

    if (isForm) {
      const formData = await req.formData();
      name = String(formData.get('name') || '');
      rawPhone = String(formData.get('phone') || '');
      password = String(formData.get('password') || '');
      confirmPassword = String(formData.get('confirmPassword') || '');
      referralCode = String(formData.get('referralCode') || '');
    } else {
      const body = await req.json();
      name = body.name;
      rawPhone = body.phone;
      password = body.password;
      confirmPassword = body.confirmPassword;
      referralCode = body.referralCode || '';
    }

    // --- Validate ---
    if (!name || name.trim().length < 2) {
      return isForm
        ? failRedirect('Please enter your full name')
        : NextResponse.json({ error: 'Please enter your full name' }, { status: 400 });
    }

    if (!rawPhone) {
      return isForm
        ? failRedirect('Phone number is required')
        : NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);

    if (!isValidPhone(phone)) {
      return isForm
        ? failRedirect('Enter a valid Ugandan phone number')
        : NextResponse.json({ error: 'Enter a valid Ugandan phone number' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return isForm
        ? failRedirect('Password must be at least 6 characters')
        : NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return isForm
        ? failRedirect('Passwords do not match')
        : NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      return isForm
        ? failRedirect('This phone number is already registered')
        : NextResponse.json({ error: 'This phone number is already registered' }, { status: 409 });
    }

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

    const password_hash = await bcrypt.hash(password, 10);

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

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        phone,
        password_hash,
        referral_code: newReferralCode,
        referred_by: referrerId,
        balance: WELCOME_BONUS,
      })
      .select('id, name, phone, referral_code')
      .single();

    if (insertErr || !newUser) {
      console.error('Register insert error:', insertErr);
      return isForm
        ? failRedirect('Could not create account')
        : NextResponse.json({ error: 'Could not create account' }, { status: 500 });
    }

    await supabase.from('transactions').insert({
      user_id: newUser.id,
      type: 'welcome_bonus',
      amount: WELCOME_BONUS,
      status: 'completed',
      meta: { source: 'registration' },
    });

    if (referrerId) {
      await supabase.from('referrals').insert({
        referrer_id: referrerId,
        referred_id: newUser.id,
        level: 1,
        earnings: 0,
      });

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

    const token = signUserToken({ userId: newUser.id, phone: newUser.phone });

    // --- Form submission → redirect ---
    if (isForm) {
      const res = NextResponse.redirect(new URL('/modules', req.url));
      res.cookies.set(USER_COOKIE_NAME, token, USER_COOKIE_OPTIONS);
      return res;
    }

    // --- JSON response ---
    const res = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        referral_code: newUser.referral_code,
        balance: WELCOME_BONUS,
      },
    });

    res.cookies.set(USER_COOKIE_NAME, token, USER_COOKIE_OPTIONS);
    return res;
  } catch (err: any) {
    console.error('Register error:', err);
    return isForm
      ? failRedirect('Something went wrong')
      : NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
