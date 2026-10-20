import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getCurrentAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { value, quantity } = await req.json();
    const numValue = Number(value);
    const numQuantity = Number(quantity);

    if (!numValue || numValue < 100) {
      return NextResponse.json({ error: 'Minimum value is 100 UGX' }, { status: 400 });
    }
    if (!numQuantity || numQuantity < 1 || numQuantity > 100) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 100' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const codes = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    // Auto-expire in exactly 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    for (let i = 0; i < numQuantity; i++) {
      let code = 'VRTX-';
      for (let j = 0; j < 6; j++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      codes.push({
        code,
        value: numValue,
        balance: numValue, // Starts with full value
        expires_at: expiresAt,
        is_used: false,
      });
    }

    const { data, error } = await supabase
      .from('gift_cards')
      .insert(codes)
      .select('code');

    if (error) {
      console.error('Gift code generation error:', error);
      return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      codes: data.map((c) => c.code),
      message: `${numQuantity} gift card(s) created. Expires in 5 minutes.`,
    });

  } catch (err: any) {
    console.error('Generate gift card error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
