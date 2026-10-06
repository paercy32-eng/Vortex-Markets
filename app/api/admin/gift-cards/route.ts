import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// GET /api/admin/gift-cards
// Returns all gift cards.
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
      .from('gift_cards')
      .select(
        'id, code, total_value, claimed_value, expires_at, is_active, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Gift cards fetch error:', error);
      return NextResponse.json(
        { error: 'Could not fetch gift cards' },
        { status: 500 }
      );
    }

    const cards = (data || []).map((c) => ({
      ...c,
      total_value: Number(c.total_value) || 0,
      claimed_value: Number(c.claimed_value) || 0,
      remaining_value:
        (Number(c.total_value) || 0) - (Number(c.claimed_value) || 0),
    }));

    return NextResponse.json({
      success: true,
      giftCards: cards,
    });
  } catch (err: any) {
    console.error('Admin gift cards GET error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/admin/gift-cards
// Body: { total_value, expires_at?, quantity? }
// Creates one or more gift cards.
// Code is auto-generated: VRTX-GIFT-XXXXXX
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

    const body = await req.json();
    const { total_value, expires_at, quantity } = body || {};

    const value = Number(total_value);
    if (!value || isNaN(value) || value <= 0) {
      return NextResponse.json(
        { error: 'Enter a valid total value' },
        { status: 400 }
      );
    }

    const qty = Math.min(Math.max(Number(quantity) || 1, 1), 100);
    // ^^ between 1 and 100 cards per request

    const supabase = getServiceClient();

    // --- Generate unique codes ---
    const generated: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < qty; i++) {
      let code = '';
      let attempts = 0;
      let isUnique = false;

      while (!isUnique && attempts < 10) {
        code = 'VRTX-GIFT-';
        for (let j = 0; j < 6; j++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const { data: existing } = await supabase
          .from('gift_cards')
          .select('id')
          .eq('code', code)
          .maybeSingle();

        if (!existing) isUnique = true;
        attempts++;
      }

      if (!isUnique) {
        return NextResponse.json(
          { error: 'Could not generate unique codes. Try again.' },
          { status: 500 }
        );
      }

      generated.push(code);
    }

    // --- Insert all cards ---
    const rows = generated.map((code) => ({
      code,
      total_value: value,
      claimed_value: 0,
      expires_at: expires_at || null,
      is_active: true,
    }));

    const { data: created, error: insertErr } = await supabase
      .from('gift_cards')
      .insert(rows)
      .select(
        'id, code, total_value, claimed_value, expires_at, is_active, created_at'
      );

    if (insertErr || !created) {
      console.error('Gift card insert error:', insertErr);
      return NextResponse.json(
        { error: 'Could not create gift cards' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${created.length} gift card${created.length > 1 ? 's' : ''} created`,
      giftCards: created.map((c) => ({
        ...c,
        total_value: Number(c.total_value) || 0,
        claimed_value: Number(c.claimed_value) || 0,
        remaining_value:
          (Number(c.total_value) || 0) - (Number(c.claimed_value) || 0),
      })),
    });
  } catch (err: any) {
    console.error('Admin gift cards POST error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
