'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RedeemGiftPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ amount: number } | null>(null);

  async function submit() {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      toast.error('Enter a gift card code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/gift-cards/redeem?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not redeem');
        setLoading(false);
        return;
      }

      // Extract amount if API returns it
      const amount = Number(data.amount || data.reward || 0);
      setSuccess({ amount });
      toast.success(data.message || 'Gift card redeemed');
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/profile" className="text-[#94A3B8] text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC]">
            Redeem Gift Code
          </h1>
          <p className="text-[#94A3B8] text-xs">
            Enter a code to add funds to your balance
          </p>
        </div>
      </div>

      {!success ? (
        <>
          {/* Info note */}
          <div className="bg-[#1E293B] border border-[#334155] border-l-4 border-l-[#EF4444] rounded-xl px-4 py-3 mb-4">
            <p className="text-[#F8FAFC] font-bold text-xs mb-0.5">
              Gift Card Info
            </p>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              Enter the gift card code you received. The full value will be
              credited to your balance immediately.
            </p>
          </div>

          {/* Code input */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-4 mb-4">
            <label className="block text-[10px] text-[#94A3B8] font-bold mb-2 uppercase tracking-wider">
              Gift Card Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VRTX-GIFT-XXXXXX"
              autoComplete="off"
              autoFocus
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition text-sm uppercase font-mono tracking-wider"
            />
          </div>

          {/* Submit */}
          <button
            onClick={submit}
            disabled={loading || !code.trim()}
            className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 text-sm disabled:opacity-50"
          >
            {loading ? 'Redeeming...' : 'Redeem Code'}
          </button>
        </>
      ) : (
        <>
          {/* Success state */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#064E3B] border border-[#34D399]/30 mx-auto flex items-center justify-center mb-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#34D399"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="text-[#F8FAFC] font-bold text-lg mb-1">
              Gift Card Redeemed!
            </h2>
            <p className="text-[#94A3B8] text-xs mb-4">
              Your balance has been updated.
            </p>

            {success.amount > 0 && (
              <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 mb-2">
                <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">
                  Amount Credited
                </p>
                <p className="text-[#34D399] font-bold text-2xl">
                  +{success.amount.toLocaleString()}{' '}
                  <span className="text-sm">UGX</span>
                </p>
              </div>
            )}
          </div>

          <Link
            href="/profile"
            className="block w-full text-center bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 text-sm"
          >
            Back to Profile
          </Link>
        </>
      )}
    </div>
  );
}
