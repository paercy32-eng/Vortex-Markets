import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/my-modules
// Returns the current user's purchased products.
// ==========================================
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();

    // --- Fetch user's orders ---
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, product_id, amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('My modules fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch your modules' },
        { status: 500 }
      );
    }

    const rows = orders || [];

    // --- Fetch the products referenced by the orders ---
    const productIds = rows.map((o) => o.product_id);

    let productsMap: Record<string, { name: string; description: string | null; category: string }> = {};

    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, description, category')
        .in('id', productIds);

      if (productsData) {
        productsMap = productsData.reduce((acc, p) => {
          acc[p.id] = {
            name: p.name,
            description: p.description,
            category: p.category,
          };
          return acc;
        }, {} as Record<string, { name: string; description: string | null; category: string }>);
      }
    }

    // --- Merge orders with product info ---
    const merged = rows.map((o) => {
      const product = productsMap[o.product_id];
      return {
        id: o.id,
        product_id: o.product_id,
        product_name: product?.name || 'Unknown product',
        product_description: product?.description || null,
        category: product?.category || '',
        amount: Number(o.amount) || 0,
        status: o.status,
        purchased_at: o.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      modules: merged,
    });
  } catch (err: any) {
    console.error('My modules endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
