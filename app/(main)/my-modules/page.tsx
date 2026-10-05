'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// ==========================================
// TYPES
// ==========================================
interface UserModule {
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

// ==========================================
// HELPERS
// ==========================================
function statusPillClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'pill-success';
  if (s === 'expired') return 'pill-muted';
  return 'pill-muted';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ==========================================
// PAGE
// ==========================================
export default function MyModulesPage() {
  const [modules, setModules] = useState<UserModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  async function loadModules() {
    setLoading(true);
    try {
      const res = await fetch('/api/my-modules?t=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not load modules');
        setLoading(false);
        return;
      }

      setModules(data.modules || []);
      setLoading(false);
    } catch (err) {
      toast.error('Network error');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModules();
  }, []);

  const visible =
    filter === 'active'
      ? modules.filter((m) => m.status === 'active')
      : modules;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">My Modules</h1>
        <p className="text-muted text-sm">
          Track your earnings and cycle progress.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {(['active', 'all'] as const).map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`py-2.5 rounded-full text-xs font-semibold transition ${
                isActive
                  ? 'bg-primary text-black'
                  : 'bg-card border border-border text-muted'
              }`}
            >
              {f === 'active' ? 'Active' : 'All Modules'}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted text-sm mb-1">
            {filter === 'active' ? 'No active modules.' : 'No modules yet.'}
          </p>
          <p className="text-muted text-xs">
            Purchase a module from the Modules tab to start earning.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((m) => (
            <div key={m.id} className="card">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-white font-semibold text-base flex-1 min-w-0">
                  {m.product_name}
                </h3>
                <span className={statusPillClass(m.status)}>
                  {m.status.toUpperCase()}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted text-xs">
                    Day {m.days_credited} of {m.cycle_days}
                  </span>
                  <span className="text-muted text-xs">{m.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="row">
                <span className="row-label">Earned so far</span>
                <span className="row-value text-primary">
                  {m.total_credited.toLocaleString()} UGX
                </span>
              </div>
              <div className="row">
                <span className="row-label">Total expected</span>
                <span className="row-value text-success">
                  {m.total_creditable.toLocaleString()} UGX
                </span>
              </div>
              <div className="row">
                <span className="row-label">Daily return</span>
                <span className="row-value">
                  {m.daily_return.toLocaleString()} UGX
                </span>
              </div>
              <div className="row">
                <span className="row-label">Price paid</span>
                <span className="row-value">
                  {m.price_paid.toLocaleString()} UGX
                </span>
              </div>

              {/* Dates */}
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>Started: {formatDate(m.started_at)}</span>
                <span>Expires: {formatDate(m.expires_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
                  }
