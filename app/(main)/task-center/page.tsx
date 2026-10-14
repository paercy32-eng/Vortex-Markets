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
        <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">Could not load task center.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <Link href="/profile" className="text-gray-400 text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Task Center</h1>
          <p className="text-gray-400 text-xs">
            Grow your team and unlock rewards.
          </p>
        </div>
      </div>

      {/* Total Team Investment */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 mb-3 shadow-lg shadow-red-900/20">
        <p className="text-white/80 text-[10px] uppercase tracking-wider mb-1">
          Total Team Investment
        </p>
        <p className="text-white font-bold text-3xl">
          {data.teamInvestment.toLocaleString()}{' '}
          <span className="text-lg opacity-80">UGX</span>
        </p>
        <p className="text-white/70 text-[10px] mt-2">
          Combined investment from your entire team
        </p>
      </div>

      {/* Total Team Size */}
      <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
            Total Team
          </p>
          <p className="text-gray-400 text-[10px]">
            People you have referred (all levels)
          </p>
        </div>
        <p className="text-red-600 font-bold text-3xl">{data.teamSize}</p>
      </div>

      {/* Tasks List */}
      <p className="text-gray-400 text-[10px] uppercase tracking-wider font-bold mb-3 px-1">
        Milestone Tasks
      </p>

      <div className="space-y-3">
        {data.tiers.map((tier, idx) => {
          const isClaimed = tier.status === 'claimed';
          const isClaimable = tier.status === 'claimable';
          const remaining = Math.max(tier.target - data.teamInvestment, 0);

          return (
            <button
              key={tier.target}
              onClick={() => setSelectedTier(tier)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm active:scale-[0.99] transition"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isClaimed
                        ? 'bg-green-100 text-green-700'
                        : isClaimable
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isClaimed ? '✓' : isClaimable ? '★' : idx + 1}
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-sm">
                      UGX {tier.target.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-[10px]">
                      Team investment goal
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-red-600 font-bold text-sm">
                    +{tier.reward.toLocaleString()} UGX
                  </p>
                  <p className="text-gray-400 text-[9px] uppercase tracking-wide">
                    Reward
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    isClaimed
                      ? 'bg-green-500'
                      : isClaimable
                      ? 'bg-red-600'
                      : 'bg-red-400'
                  }`}
                  style={{ width: `${tier.progress}%` }}
                />
              </div>

              {/* Status Text */}
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-[10px]">
                  {isClaimed ? (
                    'Reward already claimed'
                  ) : isClaimable ? (
                    <span className="text-red-600 font-semibold">
                      🎉 Ready to claim!
                    </span>
                  ) : (
                    `UGX ${remaining.toLocaleString()} to go`
                  )}
                </p>
                <p className="text-gray-500 text-[10px] font-semibold">
                  {tier.progress}%
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info note */}
      <p className="text-gray-500 text-[9px] mt-5 px-2 text-center">
        Team investment includes all purchases made by your Level 1, 2 and 3
        referrals.
      </p>

      {/* Tier Detail Modal */}
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="modal-title mb-0">Milestone Task</h3>
          <button onClick={onClose} className="text-gray-400 p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Reward Badge */}
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 mb-4 text-center">
          <p className="text-white/80 text-[10px] uppercase tracking-wider mb-1">
            Reward
          </p>
          <p className="text-white font-bold text-3xl">
            +{tier.reward.toLocaleString()}{' '}
            <span className="text-lg opacity-80">UGX</span>
          </p>
        </div>

        {/* Target */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
          <div className="flex justify-between py-1">
            <span className="text-gray-500 text-xs">Target</span>
            <span className="text-gray-900 text-xs font-semibold">
              UGX {tier.target.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500 text-xs">Your team</span>
            <span className="text-gray-900 text-xs font-semibold">
              UGX {teamInvestment.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2">
            <span className="text-gray-500 text-xs">
              {isClaimed ? 'Status' : 'Remaining'}
            </span>
            <span
              className={`text-xs font-bold ${
                isClaimed
                  ? 'text-green-600'
                  : isClaimable
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {isClaimed
                ? 'Claimed'
                : isClaimable
                ? 'Ready to claim'
                : `UGX ${remaining.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
            <span>Progress</span>
            <span>{tier.progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isClaimed
                  ? 'bg-green-500'
                  : isClaimable
                  ? 'bg-red-600'
                  : 'bg-red-400'
              }`}
              style={{ width: `${tier.progress}%` }}
            />
          </div>
        </div>

        {/* Action */}
        {isClaimed ? (
          <div className="text-center py-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-700 font-semibold text-sm">
              ✓ Reward already claimed
            </p>
          </div>
        ) : isClaimable ? (
          <button
            onClick={onClaim}
            disabled={claiming}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-red-900/20 disabled:opacity-50"
          >
            {claiming
              ? 'Claiming...'
              : `Claim UGX ${tier.reward.toLocaleString()}`}
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-gray-100 text-gray-400 font-bold py-3.5 rounded-xl cursor-not-allowed"
          >
            Locked — UGX {remaining.toLocaleString()} more needed
          </button>
        )}
      </div>
    </div>
  );
            }
