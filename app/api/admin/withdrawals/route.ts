export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getCurrentAdmin } from '@/lib/auth'; 
import { PesaJet } from '@pesajet/sdk';

const pesajet = new PesaJet({
  apiKey: process.env.PESAJET_API_KEY!,
  webhookSecret: process.env.PESAJET_WEBHOOK_SECRET,
});

function normalizePhone(input: string): string {
  let phone = (input || '').replace(/[^\d]/g, '');
  if (phone.startsWith('0')) phone = '256' + phone.slice(1);
  if (phone.startsWith('7') && phone.length === 9) phone = '256' + phone;
  return phone;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'pending';

    let query = supabase
      .from('withdrawals') // Corrected table name
      .select('id, user_id, amount, status, phone, full_name, created_at, reviewed_at, meta');

    if (status === 'approved') {
      query = query.in('status', ['approved', 'completed']);
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }

    const userIds = Array.from(new Set((data ?? []).map((w) => w.user_id)));
    let userMap: Record<string, { name: string; phone: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', userIds);
      (users ?? []).forEach((u) => {
        userMap[u.id] = { name: u.name, phone: u.phone };
      });
    }

    const enriched = (data ?? []).map((w) => ({
      ...w,
      users: userMap[w.user_id] ?? null,
    }));

    return NextResponse.json({ withdrawals: enriched });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { withdrawalId, action } = await req.json();

    if (!withdrawalId || !['approve', 'reject', 'mark_completed', 'mark_failed'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data: wd } = await supabase
      .from('withdrawals') // Corrected table name
      .select('id, user_id, amount, status, phone, full_name, meta')
      .eq('id', withdrawalId)
      .maybeSingle();

    if (!wd) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });

    if (action === 'approve') {
      if (wd.status !== 'pending') {
        return NextResponse.json({ error: `Already ${wd.status}` }, { status: 400 });
      }

      const { data: payer } = await supabase
        .from('users')
        .select('phone, name')
        .eq('id', wd.user_id)
        .maybeSingle();

      const payoutPhoneRaw = wd.phone || payer?.phone || '';
      const payoutPhone = normalizePhone(payoutPhoneRaw);
      const payoutName = wd.full_name || payer?.name || 'User';
      const userNet = Math.round(Number(wd.amount) * 0.85);
      const payoutRef = `VRTX-WD-${Date.now()}-${wd.id.slice(0,4)}`;

      try {
        await pesajet.payments.create({
          type: 'DISBURSEMENT',
          amount: userNet,
          currency: 'UGX',
          phoneNumber: payoutPhone,
          provider: 'mtn',
          reference: payoutRef,
          description: `Vortex Markets withdrawal for ${payoutName}`,
        });
      } catch (payoutErr: any) {
        console.error('PesaJet payout failed:', payoutErr);
        return NextResponse.json({ error: payoutErr.message || 'PesaJet payout failed' }, { status: 400 });
      }

      await supabase
        .from('withdrawals') // Corrected table name
        .update({
          status: 'completed',
          reviewed_at: new Date().toISOString(),
          meta: { ...wd.meta, payout_ref: payoutRef, user_net: userNet },
        })
        .eq('id', withdrawalId);

      await supabase
        .from('transactions')
        .update({
          type: 'withdrawal',
          status: 'completed',
          meta: { payout_ref: payoutRef, user_net: userNet },
        })
        .eq('user_id', wd.user_id)
        .eq('type', 'withdrawal_request')
        .eq('meta->>withdrawal_id', withdrawalId);

      return NextResponse.json({ success: true, status: 'completed' });
    }

    if (action === 'reject') {
      const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', wd.user_id)
        .maybeSingle();

      await supabase
        .from('users')
        .update({ balance: Number(user?.balance ?? 0) + Number(wd.amount) })
        .eq('id', wd.user_id);

      await supabase
        .from('withdrawals') // Corrected table name
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', withdrawalId);

      await supabase
        .from('transactions')
        .update({ status: 'rejected' })
        .eq('user_id', wd.user_id)
        .eq('type', 'withdrawal_request')
        .eq('meta->>withdrawal_id', withdrawalId);

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Admin withdrawals action error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
