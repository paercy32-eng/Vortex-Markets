'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RefreshIcon, CloseIcon, CopyIcon } from '@/components/icons';

// ==========================================
// TYPES
// ==========================================
interface GiftCard {
  id: string;
  code: string;
  total_value: number;
  claimed_value: number;
  remaining_value: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ==========================================
// HELPERS
// ==========================================
function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
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
export default function AdminGiftCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/admin/gift-cards?t=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        toast.error(data.error || 'Could not load gift cards');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setCards(data.giftCards || []);
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

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied');
    } catch {
      toast.error('Could not copy');
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
              Gift Cards
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
              + Create
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-5 py-5 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
          </div>
        ) : cards.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted text-sm mb-1">No gift cards yet.</p>
            <p className="text-muted text-xs">
              Tap "+ Create" to generate new codes.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((c) => {
              const fullyClaimed = c.remaining_value <= 0;
              const expired =
                c.expires_at && new Date(c.expires_at) < new Date();

              return (
                <div key={c.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono font-semibold text-sm truncate">
                        {c.code}
                      </p>
                      <p className="text-muted text-xs mt-1">
                        Created {formatDate(c.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => copyCode(c.code)}
                      className="p-2 rounded-full bg-primary/10 text-primary active:scale-95 transition shrink-0"
                      aria-label="Copy code"
                    >
                      <CopyIcon size={14} />
                    </button>
                  </div>

                  <div className="row">
                    <span className="row-label">Value</span>
                    <span className="row-value">
                      {c.total_value.toLocaleString()} UGX
                    </span>
                  </div>
                  <div className="row">
                    <span className="row-label">Claimed</span>
                    <span className="row-value text-primary text-sm">
                      {c.claimed_value.toLocaleString()} UGX
                    </span>
                  </div>
                  <div className="row">
                    <span className="row-label">Remaining</span>
                    <span className="row-value text-success text-sm">
                      {c.remaining_value.toLocaleString()} UGX
                    </span>
                  </div>
                  <div className="row">
                    <span className="row-label">Expires</span>
                    <span className="row-value text-xs">
                      {formatDate(c.expires_at)}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {fullyClaimed && (
                      <span className="pill-success">FULLY CLAIMED</span>
                    )}
                    {expired && !fullyClaimed && (
                      <span className="pill-danger">EXPIRED</span>
                    )}
                    {!fullyClaimed && !expired && (
                      <span className="pill-primary">ACTIVE</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateGiftCardsModal
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
// CREATE MODAL
// ==========================================
function CreateGiftCardsModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [value, setValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const numValue = Number(value);
    if (!numValue || numValue <= 0) {
      toast.error('Enter a valid value');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/gift-cards?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          total_value: numValue,
          quantity: Number(quantity) || 1,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not create gift cards');
        setLoading(false);
        return;
      }

      toast.success(data.message || 'Gift cards created');
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
          <h3 className="modal-title mb-0">Create Gift Cards</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <label className="input-label">Value per card (UGX)</label>
        <input
          type="number"
          className="input mb-4"
          placeholder="e.g. 5000"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        <label className="input-label">Quantity (1–100)</label>
        <input
          type="number"
          className="input mb-4"
          placeholder="1"
          min="1"
          max="100"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <label className="input-label">
          Expires At <span className="text-muted/70">(optional)</span>
        </label>
        <input
          type="date"
          className="input mb-4"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />

        <div className="modal-note mb-4">
          Codes are auto-generated in the format{' '}
          <span className="text-primary font-mono">VRTX-GIFT-XXXXXX</span>.
          Users redeem them from the Profile page.
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Creating...' : 'Create Gift Cards'}
        </button>
      </div>
    </div>
  );
}
