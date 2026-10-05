'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RefreshIcon, ChevronRightIcon } from '@/components/icons';

// ==========================================
// TYPES
// ==========================================
interface Stats {
  totalUsers: number;
  totalDeposits: number;
  totalInvested: number;
  totalWithdrawn: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

// ==========================================
// PAGE
// ==========================================
export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStats(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/admin/dashboard?t=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        toast.error(data.error || 'Could not load stats');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setStats(data.stats);
      setLoading(false);
      setRefreshing(false);
    } catch {
      toast.error('Network error');
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/auth/logout?t=' + Date.now(), {
      method: 'POST',
      cache: 'no-store',
    });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-4">
          <div>
            <div className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold mb-1">
              ADMIN
            </div>
            <h1 className="text-lg font-bold text-white leading-tight">
              Dashboard
            </h1>
          </div>
          <button
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="p-2 rounded-full text-muted hover:text-primary transition active:scale-95"
            aria-label="Refresh"
          >
            <RefreshIcon className={refreshing ? 'animate-spin-slow' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-5 py-5 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
          </div>
        ) : !stats ? (
          <div className="card text-center py-12">
            <p className="text-muted text-sm">Could not load dashboard.</p>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard label="Total Users" value={stats.totalUsers} />
              <StatCard
                label="Total Deposits"
                value={`${stats.totalDeposits.toLocaleString()} UGX`}
                accent="primary"
              />
              <StatCard
                label="Total Invested"
                value={`${stats.totalInvested.toLocaleString()} UGX`}
                accent="success"
              />
              <StatCard
                label="Total Withdrawn"
                value={`${stats.totalWithdrawn.toLocaleString()} UGX`}
                accent="danger"
              />
            </div>

            {/* Pending alerts */}
            {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
              <div className="card mb-5 border-warning/30 bg-warning/5">
                <p className="text-warning text-xs font-semibold uppercase tracking-wide mb-2">
                  Pending Actions
                </p>
                {stats.pendingWithdrawals > 0 && (
                  <Link
                    href="/admin/withdrawals"
                    className="row w-full"
                  >
                    <span className="row-label">
                      Withdrawals awaiting approval
                    </span>
                    <span className="row-value text-warning">
                      {stats.pendingWithdrawals} →
                    </span>
                  </Link>
                )}
                {stats.pendingDeposits > 0 && (
                  <Link
                    href="/admin/deposits"
                    className="row w-full"
                  >
                    <span className="row-label">
                      Deposits awaiting approval
                    </span>
                    <span className="row-value text-warning">
                      {stats.pendingDeposits} →
                    </span>
                  </Link>
                )}
              </div>
            )}

            {/* Navigation menu */}
            <p className="section-title">Manage</p>
            <div className="card p-0 mb-5">
              <MenuLink href="/admin/users" label="Users" />
              <MenuLink href="/admin/withdrawals" label="Withdrawals" />
              <MenuLink href="/admin/deposits" label="Deposits" />
              <MenuLink href="/admin/products" label="Products" />
              <MenuLink href="/admin/gift-cards" label="Gift Cards" />
              <MenuLink href="/admin/admins" label="Admins" />
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-2xl bg-danger/10 text-danger font-semibold text-sm active:scale-[0.98] transition"
            >
              Sign Out
            </button>
          </>
        )}
      </main>
    </div>
  );
}

// ==========================================
// STAT CARD
// ==========================================
function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: 'primary' | 'success' | 'danger';
}) {
  const colorClass =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'success'
      ? 'text-success'
      : accent === 'danger'
      ? 'text-danger'
      : 'text-white';

  return (
    <div className="card">
      <p className="text-muted text-xs uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className={`font-bold text-lg ${colorClass}`}>{value}</p>
    </div>
  );
}

// ==========================================
// MENU LINK
// ==========================================
function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="row w-full px-4">
      <span className="row-label">{label}</span>
      <ChevronRightIcon size={18} className="text-muted" />
    </Link>
  );
              }
