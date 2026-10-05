import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// POST /api/admin/setup
// One-time endpoint: creates the first super admin.
// Only works when the admins table is EMPTY.
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient();

    const { count } = await supabase
      .from('admins')
      .select('id', { count: 'exact', head: true });

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Setup already completed.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, password, name, phone } = body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: admin, error } = await supabase
      .from('admins')
      .insert({
        username: username.trim().toLowerCase(),
        password_hash,
        name: name.trim(),
        phone: phone || null,
        is_super: true,
      })
      .select('id, username, name, is_super')
      .single();

    if (error || !admin) {
      console.error('Admin setup error:', error);
      return NextResponse.json(
        { error: 'Could not create admin.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin created.',
      admin,
    });
  } catch (err: any) {
    console.error('Admin setup endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
