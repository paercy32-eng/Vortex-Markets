'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CopyIcon } from '@/components/icons';

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

const LEVEL_RATES: Record<number, string> = {
  1: '20%',
  2: '3%',
  3: '1%',
};

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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">Could not load referrals.</p>
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
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Referrals</h1>
        <p className="text-gray-400 text-sm">
          Invite friends and earn from their purchases.
        </p>
      </div>

      {/* Referral Code Card */}
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2 font-semibold">
          Your Referral Code
        </p>
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-red-600 font-bold text-2xl tracking-wider">
            {data.referralCode}
          </p>
          <button
            onClick={copyReferralCode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 text-red-600 text-xs font-bold active:scale-95 transition"
          >
            <CopyIcon size={14} />
            Copy
          </button>
        </div>
        <button
          onClick={shareReferralLink}
          className="w-full text-center text-xs text-gray-500 py-2.5 rounded-xl bg-gray-50 active:scale-[0.98] transition font-medium"
        >
          Copy invite link
        </button>
      </div>

      {/* Total Earnings Card */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 mb-6 shadow-lg shadow-red-900/20">
        <p className="text-white/80 text-xs uppercase tracking-wider mb-1">
          Total Earnings
        </p>
        <p className="text-white font-bold text-3xl">
          {data.totalEarnings.toLocaleString()}{' '}
          <span className="text-lg opacity-80">UGX</span>
        </p>
      </div>

      {/* Commission Rates */}
      <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-3">
        Commission Rates
      </p>
      <div className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-gray-600 text-sm font-medium">
            Level 1 (Direct)
          </span>
          <span className="text-red-600 font-bold text-sm">20%</span>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-gray-600 text-sm font-medium">Level 2</span>
          <span className="text-red-600 font-bold text-sm">3%</span>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-gray-600 text-sm font-medium">Level 3</span>
          <span className="text-red-600 font-bold text-sm">1%</span>
        </div>
      </div>

      <p className="text-gray-400 text-xs mb-6 px-1">
        Commissions are credited automatically when your referrals make their
        first module purchase.
      </p>

      {/* Your Team */}
      <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-3">
        Your Team
      </p>

      {/* Level Tabs */}
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
              className={`py-3 rounded-2xl text-xs font-bold transition flex flex-col items-center leading-tight ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              <span>
                L{level} ({count})
              </span>
              <span
                className={`text-[10px] mt-1 font-semibold ${
                  isActive ? 'text-white/80' : 'text-red-600'
                }`}
              >
                {LEVEL_RATES[level]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Team List */}
      {currentList.length === 0 ? (
        <div className="bg-white rounded-2xl text-center py-12 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-3">
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-gray-500 text-sm">
            No Level {activeLevel} referrals yet.
          </p>
          <p className="text-gray-400 text-xs mt-1 px-6">
            Share your referral link to start building your team.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm flex-shrink-0">
                {entry.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-semibold text-sm truncate">
                  {entry.name}
                </p>
                <p className="text-gray-500 text-xs mt-0.5 truncate">
                  {entry.phone}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-red-600 font-bold text-sm">
                  {entry.earnings.toLocaleString()}
                </p>
                <p className="text-gray-400 text-[10px] font-medium mt-0.5">
                  UGX earned
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
      }
