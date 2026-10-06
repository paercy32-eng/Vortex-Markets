import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/admins
// Returns all admins (never returns password_hash).
// ==========================================
export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('admins')
      .select('id, username, name, phone, is_super, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Admins fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch admins' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      admins: data || [],
      currentAdminId: admin.adminId,
    });
  } catch (err: any) {
    console.error('Admins GET error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/admin/admins
// Body: { username, password, name, phone?, is_super? }
// Creates a new admin. Requires super-admin.
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      );
    }

    // --- Only super admins can create other admins ---
    if (!admin.isSuper) {
      return NextResponse.json(
        { error: 'Only super admins can create admins' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, password, name, phone, is_super } = body || {};

    // --- Validate ---
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

    const cleanUsername = username.trim().toLowerCase();
    const supabase = getServiceClient();

    // --- Check for duplicate username ---
    const { data: existing } = await supabase
      .from('admins')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This username is already taken' },
        { status: 409 }
      );
    }

    // --- Hash password ---
    const password_hash = await bcrypt.hash(password, 10);

    // --- Insert ---
    const { data: newAdmin, error } = await supabase
      .from('admins')
      .insert({
        username: cleanUsername,
        password_hash,
        name: name.trim(),
        phone: phone || null,
        is_super: Boolean(is_super),
      })
      .select('id, username, name, phone, is_super, created_at')
      .single();

    if (error || !newAdmin) {
      console.error('Admin create error:', error);
      return NextResponse.json(
        { error: 'Could not create admin' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin created',
      admin: newAdmin,
    });
  } catch (err: any) {
    console.error('Admins POST error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
        }
