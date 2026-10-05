import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/products
// Returns all active products.
// Public endpoint — no auth required.
// ==========================================
export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price, category, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Products fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      products: (data || []).map((p) => ({
        ...p,
        price: Number(p.price) || 0,
      })),
    });
  } catch (err: any) {
    console.error('Products endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
