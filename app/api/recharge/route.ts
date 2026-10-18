import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';
import { PesaJet } from '@pesajet/sdk';

export const dynamic = 'force-dynamic';

const pesajet = new PesaJet({
  apiKey: process.env.PESAJET_API_KEY!,
  webhookSecret: process.env.PESAJET_WEBHOOK_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { amount, phone, provider } = await req.json();
    const numAmount = Number(amount);

    if (!phone || !provider) {
      return NextResponse.json({ error: 'Phone and provider (mtn/airtel) are required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 👈 1. Fetch the minimum deposit from the database
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'min_deposit')
      .maybeSingle();

    const minDeposit = Number(setting?.value || 10000);

    if (!numAmount || numAmount < minDeposit) {
      return NextResponse.json({ error: `Minimum deposit is UGX ${minDeposit.toLocaleString()}` }, { status: 400 });
    }

    // Use official PesaJet utility for phone formatting
    const formattedPhone = pesajet.utils.formatPhoneNumber(phone);

    // Gross-up fee calculation
    const feePct = Number(process.env.PESAJET_FEE_PERCENTAGE || 0.026);
    const feeFlat = Number(process.env.PESAJET_FEE_FLAT || 0);
    const totalCharge = Math.ceil((numAmount + feeFlat) / (1 - feePct));

    const reference = `VRTX-DEP-${Date.now()}-${user.id.slice(0, 6)}`;

    // Save pending deposit using the 'payments' table
    const { data: deposit, error: insErr } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: numAmount,
        status: 'pending',
        reference,
        type: 'deposit',
        network: provider,
        sender_phone: formattedPhone
      })
      .select('id, reference, amount, status')
      .single();

    if (insErr || !deposit) {
      console.error('Insert error:', insErr);
      return NextResponse.json({ error: insErr?.message || 'Failed to create deposit' }, { status: 500 });
    }

    // Send prompt via PesaJet
    const payment = await pesajet.payments.create({
      amount: totalCharge,
      currency: 'UGX',
      phoneNumber: formattedPhone,
      provider: provider as 'mtn' | 'airtel',
      reference,
      description: `Vortex Markets deposit for ${user.name}`,
    });

    return NextResponse.json({
      success: true,
      depositId: deposit.id,
      reference,
      totalCharge,
      fee: totalCharge - numAmount,
      message: 'A PIN prompt was sent to your phone. Enter your PIN to complete.',
    });
  } catch (err: any) {
    console.error('PesaJet deposit error:', err);
    return NextResponse.json({ error: err.message || 'Payment request failed' }, { status: 500 });
  }
}
