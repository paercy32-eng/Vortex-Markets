import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/products
// Returns all products with image URLs.
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
      .from('products')
      .select(
        'id, name, description, price, category, cycle_days, daily_return, group_label, image_url, created_at'
      )
      .order('cycle_days', { ascending: true })
      .order('price', { ascending: true });

    if (error) {
      console.error('Admin products fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch products' },
        { status: 500 }
      );
    }

    const products = (data || []).map((p) => ({
      ...p,
      price: Number(p.price) || 0,
      daily_return: Number(p.daily_return) || 0,
      total_return: (Number(p.daily_return) || 0) * (p.cycle_days || 0),
    }));

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (err: any) {
    console.error('Admin products endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
      }
