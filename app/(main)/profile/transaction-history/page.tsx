'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Deposit {
  id: string;
  amount: number;
  status: string;
  reference: string | null;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  recipient_phone: string;
  recipient_name: string;
  status: string;
  created_at: string;
}

type Transaction = {
  id: string;
  kind: 'deposit' | 'withdrawal';
  amount: number;
  status: string;
  created_at: string;
  detail: string;
};

function statusPillClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'approved' || s === 'successful')
    return 'text-[#34D399] bg-[#064E3B]/60 border border-[#34D399]/30';
  if (s === 'pending')
    return 'text-[#E0A44C] bg-[#78350F]/60 border border-[#E0A44C]/30';
  if (s === 'rejected' || s === 'failed')
    return 'text-[#F87171] bg-[#7F1D1D]/60 border border-[#F87171]/30';
  return 'text-[#94A3B8] bg-[#334155] border border-[#475569]';
}

function statusLabel(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return 'REVIEWING';
  if (s === 'approved' || s === 'completed') return 'COMPLETED';
  if (s === 'rejected') return 'REJECTED';
  if (s === 'failed') return 'FAILED'; // <-- Shows FAILED for cancelled PINs
  return s.toUpperCase();
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function TransactionHistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profile?t=' + Date.now(), {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Could not load history');
          setLoading(false);
          return;
        }

        const deposits: Deposit[] = data.deposits || [];
        const withdrawals: Withdrawal[] = data.withdrawals || [];

        const combined: Transaction[] = [
          ...deposits.map((d) => ({
            id: d.id,
            kind: 'deposit' as const,
            amount: d.amount,
            status: d.status,
            created_at: d.created_at,
            detail: 'Mobile Money Deposit',
          })),
          ...withdrawals.map((w) => ({
            id: w.id,
            kind: 'withdrawal' as const,
            amount: w.amount,
            status: w.status,
            created_at: w.created_at,
            detail: `To ${w.recipient_name} · ${w.recipient_phone}`,
          })),
        ].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setTransactions(combined);
        setLoading(false);
      } catch {
        toast.error('Network error');
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const filtered = transactions.filter((t) => {
    if (filter === 'all') return true;
    return t.kind === filter;
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/profile" className="text-[#94A3B8] text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC]">
            Transaction History
          </h1>
          <p className="text-[#94A3B8] text-xs">
            All your deposits and withdrawals
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['all', 'deposit', 'withdrawal'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-2 rounded-full text-xs font-semibold transition ${
              filter === f
                ? 'bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white'
                : 'bg-[#1E293B] text-[#94A3B8] border border-[#334155]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : 'Withdrawals'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#E0A44C] border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl text-center py-12">
          <p className="text-[#94A3B8] text-sm">No records yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-[#1E293B] border border-[#334155] rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      t.kind === 'deposit'
                        ? 'bg-[#064E3B] text-[#34D399]'
                        : 'bg-[#7F1D1D] text-[#F87171]'
                    }`}
                  >
                    {t.kind === 'deposit' ? '↓' : '↑'}
                  </div>
                  <span className="text-[#F8FAFC] font-semibold text-sm">
                    {t.kind === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${
                    t.kind === 'deposit'
                      ? 'text-[#34D399]'
                      : 'text-[#F87171]'
                  }`}
                >
                  {t.kind === 'deposit' ? '+' : '−'}
                  {t.amount.toLocaleString()} UGX
                </span>
              </div>
              <p className="text-[#64748B] text-[10px] mb-2">{t.detail}</p>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] text-[10px]">
                  {formatDate(t.created_at)}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusPillClass(
                    t.status
                  )}`}
                >
                  {statusLabel(t.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
          }
