'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CloseIcon } from '@/components/icons';

interface Tier {
  target: number;
  reward: number;
  status: 'locked' | 'claimable' | 'claimed';
  progress: number;
}

interface TaskData {
  teamInvestment: number;
  teamSize: number;
  tiers: Tier[];
}

export default function TaskCenterPage() {
  const router = useRouter();
  const [data, setData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/task-center?t=' + Date.now(), {
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Could not load tasks');
        setLoading(false);
        return;
      }
      setData(json);
      setLoading(false);
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function claim(tier: Tier) {
    setClaiming(tier.target);
    try {
      const res = await fetch('/api/task-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ tierAmount: tier.target }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || 'Could not claim');
        setClaiming(null);
        return;
      }

      toast.success(json.message || 'Reward claimed!');
      setSelectedTier(null);
      setClaiming(null);
      load();
    } catch {
      toast.error('Network error');
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#E0A44C] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-[#94A3B8] text-sm">Could not load task center.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <Link href="/profile" className="text-[#94A3B8] text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC]">Task Center</h1>
          <p className="text-[#94A3B8] text-xs">
            Grow your team and unlock rewards.
          </p>
        </div>
      </div>

      {/* Total Team Investment */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-0.5">
              Total Team Investment
            </p>
            <p className="text-[#E0A44C] font-bold text-2xl">
              {data.teamInvestment.toLocaleString()}{' '}
              <span className="text-sm opacity-80 text-[#F8FAFC]">UGX</span>
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#C8833A]/20 border border-[#C8833A]/40 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E0A44C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Total Team Size */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider font-semibold mb-0.5">
            Total Team
          </p>
          <p className="text-[#64748B] text-[10px]">
            People you have referred (all levels)
          </p>
        </div>
        <p className="text-[#F8FAFC] font-bold text-2xl">{data.teamSize}</p>
      </div>

      {/* Tasks */}
      <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider font-bold mb-2 px-1">
        Milestone Tasks
      </p>

      <div className="space-y-2">
        {data.tiers.map((tier, idx) => {
          const isClaimed = tier.status === 'claimed';
          const isClaimable = tier.status === 'claimable';
          const remaining = Math.max(tier.target - data.teamInvestment, 0);

          return (
            <button
              key={tier.target}
              onClick={() => setSelectedTier(tier)}
              className="w-full text-left bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-3 active:scale-[0.99] transition"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                      isClaimed
                        ? 'bg-[#064E3B] border-[#34D399]/40 text-[#34D399]'
                        : isClaimable
                        ? 'bg-[#C8833A]/20 border-[#C8833A]/40 text-[#E0A44C]'
                        : 'bg-[#0F172A] border-[#334155] text-[#64748B]'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-[#F8FAFC] font-bold text-sm">
                      {tier.target.toLocaleString()} UGX
                    </p>
                    <p className="text-[#64748B] text-[9px]">
                      Team investment goal
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#34D399] font-bold text-sm">
                    +{tier.reward.toLocaleString()}
                  </p>
                  <p className="text-[#64748B] text-[9px] uppercase tracking-wide">
                    UGX Reward
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="w-full h-1.5 bg-[#0F172A] rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    isClaimed
                      ? 'bg-[#34D399]'
                      : isClaimable
                      ? 'bg-gradient-to-r from-[#C8833A] to-[#E0A44C]'
                      : 'bg-[#C8833A]/50'
                  }`}
                  style={{ width: `${tier.progress}%` }}
                />
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <p className="text-[10px]">
                  {isClaimed ? (
                    <span className="text-[#34D399] font-semibold">
                      ✓ Reward claimed
                    </span>
                  ) : isClaimable ? (
                    <span className="text-[#E0A44C] font-semibold">
                      Ready to claim
                    </span>
                  ) : (
                    <span className="text-[#64748B]">
                      {remaining.toLocaleString()} UGX to go
                    </span>
                  )}
                </p>
                <p className="text-[#94A3B8] text-[10px] font-semibold">
                  {tier.progress}%
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[#64748B] text-[9px] mt-4 px-2 text-center">
        Team investment includes all purchases made by your Level 1, 2 and 3
        referrals.
      </p>

      {/* Modal */}
      {selectedTier && (
        <TierDetailModal
          tier={selectedTier}
          teamInvestment={data.teamInvestment}
          claiming={claiming === selectedTier.target}
          onClose={() => setSelectedTier(null)}
          onClaim={() => claim(selectedTier)}
        />
      )}
    </div>
  );
}

function TierDetailModal({
  tier,
  teamInvestment,
  claiming,
  onClose,
  onClaim,
}: {
  tier: Tier;
  teamInvestment: number;
  claiming: boolean;
  onClose: () => void;
  onClaim: () => void;
}) {
  const isClaimed = tier.status === 'claimed';
  const isClaimable = tier.status === 'claimable';
  const remaining = Math.max(tier.target - teamInvestment, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1E293B] border-t border-[#334155] rounded-t-3xl p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#F8FAFC]">Milestone Task</h3>
          <button onClick={onClose} className="text-[#94A3B8] p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Reward Badge */}
        <div className="bg-[#0F172A] border border-[#334155] rounded-2xl p-4 mb-3 text-center">
          <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">
            Reward
          </p>
          <p className="text-[#34D399] font-bold text-3xl">
            +{tier.reward.toLocaleString()}{' '}
            <span className="text-sm opacity-80 text-[#F8FAFC]">UGX</span>
          </p>
        </div>

        {/* Target */}
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3 mb-3">
          <div className="flex justify-between py-1">
            <span className="text-[#94A3B8] text-xs">Target</span>
            <span className="text-[#F8FAFC] text-xs font-semibold">
              {tier.target.toLocaleString()} UGX
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#94A3B8] text-xs">Your team</span>
            <span className="text-[#F8FAFC] text-xs font-semibold">
              {teamInvestment.toLocaleString()} UGX
            </span>
          </div>
          <div className="flex justify-between py-1 border-t border-[#334155] mt-1 pt-2">
            <span className="text-[#94A3B8] text-xs">
              {isClaimed ? 'Status' : 'Remaining'}
            </span>
            <span
              className={`text-xs font-bold ${
                isClaimed
                  ? 'text-[#34D399]'
                  : isClaimable
                  ? 'text-[#E0A44C]'
                  : 'text-[#F8FAFC]'
              }`}
            >
              {isClaimed
                ? 'Claimed'
                : isClaimable
                ? 'Ready to claim'
                : `${remaining.toLocaleString()} UGX`}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1.5">
            <span>Progress</span>
            <span>{tier.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isClaimed
                  ? 'bg-[#34D399]'
                  : isClaimable
                  ? 'bg-gradient-to-r from-[#C8833A] to-[#E0A44C]'
                  : 'bg-[#C8833A]/50'
              }`}
              style={{ width: `${tier.progress}%` }}
            />
          </div>
        </div>

        {/* Action */}
        {isClaimed ? (
          <div className="text-center py-3 bg-[#064E3B] border border-[#34D399]/40 rounded-xl">
            <p className="text-[#34D399] font-semibold text-sm">
              ✓ Reward already claimed
            </p>
          </div>
        ) : isClaimable ? (
          <button
            onClick={onClaim}
            disabled={claiming}
            className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 disabled:opacity-50"
          >
            {claiming
              ? 'Claiming...'
              : `Claim ${tier.reward.toLocaleString()} UGX`}
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-[#0F172A] border border-[#334155] text-[#64748B] font-bold py-3.5 rounded-xl cursor-not-allowed text-sm"
          >
            Locked — {remaining.toLocaleString()} UGX more needed
          </button>
        )}
      </div>
    </div>
  );
}
