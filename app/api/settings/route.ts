import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'min_deposit')
      .maybeSingle();

    return NextResponse.json({ 
      minDeposit: Number(data?.value || 10000) 
    });
  } catch (err) {
    return NextResponse.json({ minDeposit: 10000 });
  }
}
