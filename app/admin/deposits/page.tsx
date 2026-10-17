'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RefreshIcon } from '@/components/icons';

interface AdminDeposit {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  amount: number;
  status: string;
  reference: string | null;
  network: string | null;
  sender_phone: string | null;
  transaction_id: string | null;
  created_at: string;
}

function statusPillClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'successful' || s === 'completed')
    return 'pill-success';
  if (s === 'pending') return 'pill-warning';
  if (s === 'rejected' || s === 'failed') return 'pill-danger';
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

export default function AdminDepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    'pending' | 'approved' | 'rejected' | 'all'
  >('pending');

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(
        `/api/admin/deposits?status=${filter}&t=` + Date.now(),
        { cache: 'no-store' }
      );
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        toast.error(data.error || 'Could not load deposits');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setDeposits(data.deposits || []);
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
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Deposits
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
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`py-2.5 rounded-full text-xs font-semibold capitalize transition ${
                  isActive
                    ? 'bg-primary text-[#FFFFFF]'
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
        ) : deposits.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted text-sm">
              No {filter === 'all' ? '' : filter} deposits.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {deposits.map((d) => {
              const isPending = d.status === 'pending';
              const hasTxid = !!d.transaction_id;

              return (
                <div key={d.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold text-sm truncate">
                        {d.user_name}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        {d.user_phone}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={statusPillClass(d.status)}>
                        {d.status.toUpperCase()}
                      </span>
                      {isPending && hasTxid && (
                        <span className="pill-primary text-[10px]">
                          TXID SUBMITTED
                        </span>
                      )}
                      {isPending && !hasTxid && (
                        <span className="pill-muted text-[10px]">
                          AWAITING PIN
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="row">
                    <span className="row-label">Amount</span>
                    <span className="row-value text-primary font-bold">
                      {d.amount.toLocaleString()} UGX
                    </span>
                  </div>
                  {d.network && (
                    <div className="row">
                      <span className="row-label">Network</span>
                      <span className="row-value text-xs">{d.network}</span>
                    </div>
                  )}
                  {d.sender_phone && (
                    <div className="row">
                      <span className="row-label">Sender Phone</span>
                      <span className="row-value text-xs">
                        {d.sender_phone}
                      </span>
                    </div>
                  )}
                  {d.transaction_id && (
                    <div className="row">
                      <span className="row-label">Transaction ID</span>
                      <span className="row-value text-xs font-mono">
                        {d.transaction_id}
                      </span>
                    </div>
                  )}
                  {d.reference && (
                    <div className="row">
                      <span className="row-label">Reference</span>
                      <span className="row-value text-[10px] font-mono break-all">
                        {d.reference}
                      </span>
                    </div>
                  )}
                  <div className="row">
                    <span className="row-label">Date</span>
                    <span className="row-value text-xs">
                      {formatDate(d.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
                  }
