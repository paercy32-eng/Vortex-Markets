'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ActiveModule {
  id: string;
  product_id: string;
  product_name: string;
  price_paid: number;
  cycle_days: number;
  daily_return: number;
  total_creditable: number;
  days_credited: number;
  total_credited: number;
  started_at: string;
  expires_at: string;
  last_credited_at: string | null;
  status: string;
  progress: number;
}

export default function MyModulesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ActiveModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/my-modules?t=' + Date.now(), {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        setModules(data.modules || []);
      } catch {
        toast.error('Failed to load modules');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="w-8 h-8 rounded-full border-2 border-[#C8833A] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in bg-[#0F172A] min-h-screen px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">My Modules</h1>
        <p className="text-[#94A3B8] text-sm">
          Track your earnings and cycle progress.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button className="py-2.5 rounded-full text-xs font-bold bg-[#C8833A] text-white">
          Active
        </button>
        <button className="py-2.5 rounded-full text-xs font-bold bg-[#1E293B] border border-[#334155] text-[#94A3B8]">
          All Modules
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl text-center py-12">
          <p className="text-[#94A3B8] text-sm">No active modules yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((m, index) => {
            const cycleDays = Number(m.cycle_days) || 1;
            const daysCredited = Number(m.days_credited) || 0;
            const progress = Math.min(
              Number(m.progress) || (daysCredited / cycleDays) * 100,
              100
            );

            const safeMoney = (val: any) => {
              const n = Number(val);
              return isNaN(n) ? '0' : n.toLocaleString();
            };

            const safeDate = (val: any) => {
              if (!val) return '—';
              try {
                return new Date(val).toLocaleDateString();
              } catch {
                return '—';
              }
            };

            return (
              <div
                key={m.id || index}
                className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-[#F8FAFC] font-bold text-base">
                    {m.product_name || 'Module'}
                  </h3>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#064E3B] text-[#34D399]">
                    {m.status || 'active'}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-5">
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-[#94A3B8]">
                      Day {daysCredited} of {cycleDays}
                    </span>
                    <span className="text-[#F8FAFC] font-semibold">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0F172A] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#334155]">
                    <span className="text-xs text-[#94A3B8]">Earned so far</span>
                    <span className="text-sm font-bold text-[#E0A44C]">
                      {safeMoney(m.total_credited)} UGX
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#334155]">
                    <span className="text-xs text-[#94A3B8]">Total expected</span>
                    <span className="text-sm font-bold text-[#34D399]">
                      {safeMoney(m.total_creditable)} UGX
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#334155]">
                    <span className="text-xs text-[#94A3B8]">Daily return</span>
                    <span className="text-sm font-semibold text-[#F8FAFC]">
                      {safeMoney(m.daily_return)} UGX
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-[#94A3B8]">Price paid</span>
                    <span className="text-sm font-semibold text-[#F8FAFC]">
                      {safeMoney(m.price_paid)} UGX
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex justify-between text-[10px] text-[#64748B] mt-4 pt-3 border-t border-[#334155]">
                  <span>Started: {safeDate(m.started_at)}</span>
                  <span>Expires: {safeDate(m.expires_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
