import { NextResponse } from 'next/server';
import { USER_COOKIE_NAME } from '@/lib/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// POST /api/auth/logout
// Clears the user JWT cookie.
// ==========================================
export async function POST() {
  const res = NextResponse.json({ success: true });

  res.cookies.set(USER_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
}
