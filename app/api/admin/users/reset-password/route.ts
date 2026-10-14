export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifyAdminSession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'userId and newPassword are required.' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (error) {
      console.error('Reset password error:', error);
      return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (err) {
    console.error('Reset password API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
