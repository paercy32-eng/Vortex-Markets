'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CopyIcon } from '@/components/icons';

// ==========================================
// TYPES
// ==========================================
interface ReferralEntry {
  id: string;
  referred_id: string;
  name: string;
  phone: string;
  earnings: number;
  joined_at: string;
}

interface ReferralsResponse {
  referralCode: string;
  totalEarnings: number;
  counts: { level1: number; level2: number; level3: number };
  levels: {
    level1: ReferralEntry[];
    level2: ReferralEntry[];
    level3: ReferralEntry[];
  };
}

// ==========================================
// PAGE
// ==========================================
export default function ReferralsPage() {
  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);

  async function loadReferrals() {
    setLoading(true);
    try {
      const res = await fetch('/api/referrals?t=' + Date.now(), {
        cache: 'no-store',
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || 'Could not load referrals');
        setLoading(false);
        return;
      }

      setData(json);
      setLoading(false);
    } catch (err) {
      toast.error('Network error');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferrals();
  }, []);

  async function copyReferralCode() {
    if (!data?.referralCode) return;
    try {
      await navigator.clipboard.writeText(data.referralCode);
      toast.success('Referral code copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  async function shareReferralLink() {
    if (!data?.referralCode) return;
    const link = `${window.location.origin}/register?ref=${data.referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Referral link copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
      </div>
    );
  }

  // --- No data (shouldn't happen, but safe) ---
  if (!data) {
    return (
      <div className="card text-center py-12">
        <p className="text-muted text-sm">Could not load referrals.</p>
      </div>
    );
  }

  const currentList =
    activeLevel === 1
      ? data.levels.level1
      : activeLevel === 2
      ? data.levels.level2
      : data.levels.level3;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Referrals</h1>
        <p className="text-muted text-sm">
          Invite friends and earn from their purchases.
        </p>
      </div>

      {/* Referral code card */}
      <div className="card mb-4">
        <p className="text-muted text-xs uppercase tracking-wide mb-2">
          Your Referral Code
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-primary font-bold text-xl tracking-wider">
            {data.referralCode}
          </p>
          <button
            onClick={copyReferralCode}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-semibold active:scale-95 transition"
          >
            <CopyIcon size={14} />
            Copy
          </button>
        </div>
        <button
          onClick={shareReferralLink}
          className="mt-3 w-full text-center text-xs text-muted py-2 rounded-full bg-white/5 active:scale-95 transition"
        >
          Copy invite link
        </button>
      </div>

      {/* Total earnings card */}
      <div className="card mb-6">
        <p className="text-muted text-xs uppercase tracking-wide mb-1">
          Total Earnings
        </p>
        <p className="text-white font-bold text-2xl">
          {data.totalEarnings.toLocaleString()} <span className="text-base">UGX</span>
        </p>
      </div>

      {/* Level tabs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {([1, 2, 3] as const).map((level) => {
          const count =
            level === 1
              ? data.counts.level1
              : level === 2
              ? data.counts.level2
              : data.counts.level3;
          const isActive = activeLevel === level;

          return (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`py-2.5 rounded-full text-xs font-semibold transition ${
                isActive
                  ? 'bg-primary text-black'
                  : 'bg-card border border-border text-muted'
              }`}
            >
              L{level} ({count})
            </button>
          );
        })}
      </div>

      {/* Referral list */}
      {currentList.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-muted text-sm">
            No Level {activeLevel} referrals yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {currentList.map((entry) => (
            <div
              key={entry.id}
              className="card flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium text-sm truncate">
                  {entry.name}
                </p>
                <p className="text-muted text-xs mt-0.5">{entry.phone}</p>
              </div>
              <p className="text-primary font-semibold text-sm shrink-0 ml-3">
                {entry.earnings.toLocaleString()} UGX
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
