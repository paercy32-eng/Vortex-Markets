import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getCurrentAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();

    // 1. Delete any existing unused codes so there is only ever ONE active at a time
    await supabase
      .from('gift_cards')
      .delete()
      .eq('is_used', false);

    // 2. Generate a new random code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'VRTX-';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // 3. Set expiry to exactly 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 4. Save to database
    const { data, error } = await supabase
      .from('gift_cards')
      .insert({
        code,
        expires_at: expiresAt,
        is_used: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Gift code generation error:', error);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      giftCard: data,
      message: 'Gift code generated successfully. Expires in 5 minutes.',
    });

  } catch (err: any) {
    console.error('Generate gift card error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET: Fetch the current active code for the admin dashboard
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();
    
    // Get the latest unused code
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ giftCard: data });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
