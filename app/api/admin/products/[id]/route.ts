import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// PATCH /api/admin/products/[id]
// Body: partial product fields
// Only provided fields are updated.
// ==========================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      );
    }

    const productId = params.id;
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      price,
      category,
      cycle_days,
      daily_return,
      group_label,
      image_url,
    } = body || {};

    // --- Build updates object with only provided fields ---
    const updates: Record<string, any> = {};

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }

    if (typeof description === 'string') {
      updates.description = description.trim() || null;
    }

    if (price !== undefined) {
      const num = Number(price);
      if (isNaN(num) || num < 0) {
        return NextResponse.json(
          { error: 'Price must be a positive number' },
          { status: 400 }
        );
      }
      updates.price = num;
    }

    if (typeof category === 'string' && category.trim()) {
      updates.category = category.trim();
    }

    if (cycle_days !== undefined) {
      const num = Number(cycle_days);
      if (!num || num <= 0 || !Number.isInteger(num)) {
        return NextResponse.json(
          { error: 'Cycle days must be a positive integer' },
          { status: 400 }
        );
      }
      updates.cycle_days = num;
    }

    if (daily_return !== undefined) {
      const num = Number(daily_return);
      if (isNaN(num) || num < 0) {
        return NextResponse.json(
          { error: 'Daily return must be a positive number' },
          { status: 400 }
        );
      }
      updates.daily_return = num;
    }

    if (typeof group_label === 'string') {
      updates.group_label = group_label.trim() || null;
    }

    if (typeof image_url === 'string') {
      updates.image_url = image_url.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select(
        'id, name, description, price, category, cycle_days, daily_return, group_label, image_url, created_at'
      )
      .maybeSingle();

    if (error || !product) {
      console.error('Product update error:', error);
      return NextResponse.json(
        { error: 'Could not update product' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated',
      product: {
        ...product,
        price: Number(product.price) || 0,
        daily_return: Number(product.daily_return) || 0,
        total_return:
          (Number(product.daily_return) || 0) * (product.cycle_days || 0),
      },
    });
  } catch (err: any) {
    console.error('Admin product update error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
