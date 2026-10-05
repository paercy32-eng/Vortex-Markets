import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceClient } from '@/lib/supabase';
import {
  signAdminToken,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
} from '@/lib/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// POST /api/admin/auth/login
// Body: { username, password }
// Sets an admin httpOnly cookie on success.
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, name, password_hash, is_super')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Admin login lookup error:', error);
      return NextResponse.json(
        { error: 'Something went wrong' },
        { status: 500 }
      );
    }

    // --- Generic message for both bad username and bad password ---
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signAdminToken({
      adminId: admin.id,
      username: admin.username,
      isSuper: admin.is_super,
    });

    const res = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        is_super: admin.is_super,
      },
    });

    res.cookies.set(ADMIN_COOKIE_NAME, token, ADMIN_COOKIE_OPTIONS);

    return res;
  } catch (err: any) {
    console.error('Admin login endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
