'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RefreshIcon } from '@/components/icons';

// ==========================================
// TYPES
// ==========================================
interface AdminWithdrawal {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  amount: number;
  recipient_phone: string;
  recipient_name: string;
  status: string;
  created_at: string;
}

// ==========================================
// HELPERS
// ==========================================
function statusPillClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'pill-success';
  if (s === 'pending') return 'pill-warning';
  if (s === 'rejected') return 'pill-danger';
  return 'pill-muted';
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

// ==========================================
// PAGE
// ==========================================
export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(
        `/api/admin/withdrawals?status=${filter}&t=` + Date.now(),
        { cache: 'no-store' }
      );
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        toast.error(data.error || 'Could not load withdrawals');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setWithdrawals(data.withdrawals || []);
      setLoading(false);
      setRefreshing(false);
    } catch {
      toast.error('Network error');
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}?t=` + Date.now(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        setProcessingId(null);
        return;
      }

      toast.success(data.message || 'Done');
      setProcessingId(null);
      load(true);
    } catch {
      toast.error('Network error');
      setProcessingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-4">
          <div>
            <Link
              href="/admin"
              className="text-muted text-xs hover:text-primary"
            >
              ← Dashboard
            </Link>
            <h1 className="text-lg font-bold text-white leading-tight">
              Withdrawals
            </h1>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-2 rounded-full text-muted hover:text-primary transition active:scale-95"
            aria-label="Refresh"
          >
            <RefreshIcon className={refreshing ? 'animate-spin-slow' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-5 py-5 pb-16">
        {/* Filter tabs */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`py-2.5 rounded-full text-xs font-semibold capitalize transition ${
                  isActive
                    ? 'bg-primary text-black'
                    : 'bg-card border border-border text-muted'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted text-sm">
              No {filter === 'all' ? '' : filter} withdrawals.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {withdrawals.map((w) => {
              const isPending = w.status === 'pending';
              const isProcessing = processingId === w.id;

              return (
                <div key={w.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {w.user_name}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        {w.user_phone}
                      </p>
                    </div>
                    <span className={statusPillClass(w.status)}>
                      {w.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="row">
                    <span className="row-label">Amount</span>
                    <span className="row-value text-primary">
                      {w.amount.toLocaleString()} UGX
                    </span>
                  </div>
                  <div className="row">
                    <span className="row-label">Recipient</span>
                    <span className="row-value text-sm">
                      {w.recipient_name}
                    </span>
                  </div>
                  <div className="row">
                    <span className="row-label">Phone</span>
                    <span className="row-value text-sm">
                      {w.recipient_phone}
                    </span>
                  </div>
                  <div className="row">
                    <span className="row-label">Requested</span>
                    <span className="row-value text-xs">
                      {formatDate(w.created_at)}
                    </span>
                  </div>

                  {isPending && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => handleAction(w.id, 'reject')}
                        disabled={isProcessing}
                        className="py-3 rounded-full bg-danger/10 text-danger text-sm font-semibold active:scale-95 transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAction(w.id, 'approve')}
                        disabled={isProcessing}
                        className="py-3 rounded-full bg-success text-black text-sm font-semibold active:scale-95 transition disabled:opacity-50"
                      >
                        {isProcessing ? '...' : 'Approve'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
        }
