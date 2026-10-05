'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// ==========================================
// TYPES
// ==========================================
interface OwnedModule {
  id: string;
  product_id: string;
  product_name: string;
  product_description: string | null;
  category: string;
  amount: number;
  status: string;
  purchased_at: string;
}

// ==========================================
// HELPERS
// ==========================================
function statusPillClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'approved') return 'pill-success';
  if (s === 'pending') return 'pill-warning';
  if (s === 'rejected' || s === 'failed') return 'pill-danger';
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
  const [modules, setModules] = useState<OwnedModule[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">My Modules</h1>
        <p className="text-muted text-sm">
          Modules you have purchased.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
        </div>
      ) : modules.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted text-sm mb-1">No modules yet.</p>
          <p className="text-muted text-xs">
            Purchase your first module from the Modules tab.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {modules.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base truncate">
                    {m.product_name}
                  </h3>
                  {m.product_description && (
                    <p className="text-muted text-xs mt-1 line-clamp-2">
                      {m.product_description}
                    </p>
                  )}
                </div>
                <span className={statusPillClass(m.status)}>
                  {m.status.toUpperCase()}
                </span>
              </div>
              <div className="row">
                <span className="row-label">Paid</span>
                <span className="row-value">
                  {m.amount.toLocaleString()} UGX
                </span>
              </div>
              <div className="row">
                <span className="row-label">Purchased</span>
                <span className="row-value">
                  {formatDate(m.purchased_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
