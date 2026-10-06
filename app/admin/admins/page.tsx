'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RefreshIcon, CloseIcon } from '@/components/icons';

// ==========================================
// TYPES
// ==========================================
interface Admin {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  is_super: boolean;
  created_at: string;
}

// ==========================================
// HELPERS
// ==========================================
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
export default function AdminAdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/admin/admins?t=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        toast.error(data.error || 'Could not load admins');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setAdmins(data.admins || []);
      setCurrentAdminId(data.currentAdminId || null);
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
  }, []);

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
              Admins
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2 rounded-full text-muted hover:text-primary transition active:scale-95"
              aria-label="Refresh"
            >
              <RefreshIcon
                className={refreshing ? 'animate-spin-slow' : ''}
              />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-2 rounded-full bg-primary text-black text-xs font-semibold active:scale-95 transition"
            >
              + Add
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-5 py-5 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
          </div>
        ) : admins.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted text-sm">No admins found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {admins.map((a) => {
              const isMe = a.id === currentAdminId;
              return (
                <div key={a.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {a.name}
                        {isMe && (
                          <span className="text-muted text-xs ml-2">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-muted text-xs mt-0.5 font-mono">
                        @{a.username}
                      </p>
                      {a.phone && (
                        <p className="text-muted text-xs mt-0.5">
                          {a.phone}
                        </p>
                      )}
                    </div>
                    {a.is_super ? (
                      <span className="pill-primary">SUPER</span>
                    ) : (
                      <span className="pill-muted">ADMIN</span>
                    )}
                  </div>
                  <div className="row">
                    <span className="row-label">Joined</span>
                    <span className="row-value text-xs">
                      {formatDate(a.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateAdminModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            load(true);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// CREATE ADMIN MODAL
// ==========================================
function CreateAdminModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSuper, setIsSuper] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!username.trim() || username.trim().length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/admins?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: name.trim(),
          phone: phone.trim() || undefined,
          is_super: isSuper,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not create admin');
        setLoading(false);
        return;
      }

      toast.success('Admin created');
      onSuccess();
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="modal-title mb-0">Add Admin</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <label className="input-label">Full Name</label>
        <input
          type="text"
          className="input mb-4"
          placeholder="e.g. Jane Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="input-label">Username</label>
        <input
          type="text"
          className="input mb-4 font-mono lowercase"
          placeholder="e.g. jane"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))
          }
        />

        <label className="input-label">Password</label>
        <input
          type="password"
          className="input mb-4"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label className="input-label">
          Phone <span className="text-muted/70">(optional)</span>
        </label>
        <input
          type="tel"
          className="input mb-4"
          placeholder="0700123456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          onClick={() => setIsSuper(!isSuper)}
          className={`w-full py-3 rounded-full text-sm font-semibold mb-4 transition ${
            isSuper
              ? 'bg-primary text-black'
              : 'bg-card border border-border text-muted'
          }`}
        >
          {isSuper ? '✓ Super Admin' : 'Super Admin?'}
        </button>

        <div className="modal-note mb-4">
          Super admins can create and manage other admins. Regular admins
          can only manage users, withdrawals, deposits, and products.
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Creating...' : 'Create Admin'}
        </button>
      </div>
    </div>
  );
}
