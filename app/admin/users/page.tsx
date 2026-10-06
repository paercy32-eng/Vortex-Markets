'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RefreshIcon, CloseIcon } from '@/components/icons';

// ==========================================
// TYPES
// ==========================================
interface AdminUser {
  id: string;
  name: string;
  phone: string;
  balance: number;
  referral_code: string;
  referred_by: string | null;
  is_bound: boolean;
  bound_phone: string | null;
  bound_full_name: string | null;
  active_modules: number;
  created_at: string;
}

interface UserDetail {
  user: {
    id: string;
    name: string;
    phone: string;
    balance: number;
    referral_code: string;
    is_bound: boolean;
    bound_phone: string | null;
    bound_full_name: string | null;
    created_at: string;
  };
  modules: Array<{
    id: string;
    product_name: string;
    price_paid: number;
    cycle_days: number;
    daily_return: number;
    days_credited: number;
    total_credited: number;
    total_creditable: number;
    status: string;
    started_at: string;
    expires_at: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
}

// ==========================================
// HELPERS
// ==========================================
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatDateTime(iso: string): string {
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

function transactionLabel(type: string): string {
  const map: Record<string, string> = {
    welcome_bonus: 'Welcome Bonus',
    deposit: 'Deposit',
    deposit_approved: 'Deposit Approved',
    deposit_rejected: 'Deposit Rejected',
    withdrawal_approved: 'Withdrawal',
    withdrawal_rejected: 'Withdrawal Rejected',
    purchase: 'Module Purchase',
    referral_commission: 'Referral Commission',
    daily_return: 'Daily Return',
    admin_adjustment: 'Admin Adjustment',
    binding_reset: 'Binding Reset',
  };
  return map[type] || type;
}

// ==========================================
// PAGE
// ==========================================
export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const url = search
        ? `/api/admin/users?q=${encodeURIComponent(search)}&t=` + Date.now()
        : `/api/admin/users?t=` + Date.now();

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        toast.error(data.error || 'Could not load users');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setUsers(data.users || []);
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

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function handleClearSearch() {
    setSearch('');
    setTimeout(() => load(), 0);
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
              Users
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
        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="mb-5">
          <div className="relative">
            <input
              type="text"
              className="input pr-24"
              placeholder="Search by name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-3 py-2 rounded-full text-muted text-xs"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-2 rounded-full bg-primary text-black text-xs font-semibold"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
          </div>
        ) : users.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted text-sm">
              {search ? 'No users match your search.' : 'No users yet.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className="card text-left transition active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {u.name}
                    </p>
                    <p className="text-muted text-xs mt-0.5">{u.phone}</p>
                  </div>
                  {u.is_bound && (
                    <span className="pill-success">BOUND</span>
                  )}
                </div>
                <div className="row">
                  <span className="row-label">Balance</span>
                  <span className="row-value text-primary">
                    {u.balance.toLocaleString()} UGX
                  </span>
                </div>
                <div className="row">
                  <span className="row-label">Active Modules</span>
                  <span className="row-value">{u.active_modules}</span>
                </div>
                <div className="row">
                  <span className="row-label">Joined</span>
                  <span className="row-value text-xs">
                    {formatDate(u.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onAction={() => load(true)}
        />
      )}
    </div>
  );
}

// ==========================================
// USER DETAIL MODAL
// ==========================================
function UserDetailModal({
  userId,
  onClose,
  onAction,
}: {
  userId: string;
  onClose: () => void;
  onAction: () => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'modules' | 'tx'>('info');

  async function loadDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}?t=` + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not load user');
        setLoading(false);
        return;
      }

      setDetail(data);
      setLoading(false);
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="modal-title mb-0">User Details</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {loading || !detail ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['info', 'modules', 'tx'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`py-2 rounded-full text-xs font-semibold transition ${
                    activeTab === t
                      ? 'bg-primary text-black'
                      : 'bg-card border border-border text-muted'
                  }`}
                >
                  {t === 'info' ? 'Info' : t === 'modules' ? 'Modules' : 'History'}
                </button>
              ))}
            </div>

            {/* INFO TAB */}
            {activeTab === 'info' && (
              <InfoTab detail={detail} onAction={onAction} />
            )}

            {/* MODULES TAB */}
            {activeTab === 'modules' && (
              <ModulesTab modules={detail.modules} />
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'tx' && (
              <TransactionsTab transactions={detail.transactions} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// INFO TAB
// ==========================================
function InfoTab({
  detail,
  onAction,
}: {
  detail: UserDetail;
  onAction: () => void;
}) {
  const { user } = detail;
  const [showAdjust, setShowAdjust] = useState(false);
  const [showResetBind, setShowResetBind] = useState(false);

  return (
    <div>
      <div className="card-flat mb-3">
        <p className="text-white font-semibold">{user.name}</p>
        <p className="text-muted text-xs mt-1">{user.phone}</p>
        <p className="text-muted text-xs mt-1">
          Code: <span className="text-primary">{user.referral_code}</span>
        </p>
        <p className="text-muted text-xs mt-1">
          Joined: {formatDate(user.created_at)}
        </p>
      </div>

      <div className="card-flat mb-3">
        <p className="text-muted text-xs uppercase mb-1">Balance</p>
        <p className="text-white font-bold text-2xl">
          {user.balance.toLocaleString()} UGX
        </p>
        <button
          onClick={() => setShowAdjust(true)}
          className="mt-3 w-full py-3 rounded-full bg-primary/10 text-primary text-sm font-semibold active:scale-95 transition"
        >
          Adjust Balance
        </button>
      </div>

      <div className="card-flat mb-3">
        <p className="text-muted text-xs uppercase mb-2">Bound Account</p>
        {user.is_bound ? (
          <>
            <p className="text-white text-sm">{user.bound_full_name}</p>
            <p className="text-muted text-xs mt-1">{user.bound_phone}</p>
            <button
              onClick={() => setShowResetBind(true)}
              className="mt-3 w-full py-2.5 rounded-full bg-warning/10 text-warning text-xs font-semibold active:scale-95 transition"
            >
              Reset Binding
            </button>
          </>
        ) : (
          <p className="text-muted text-xs">Not bound yet.</p>
        )}
      </div>

      {showAdjust && (
        <AdjustBalanceModal
          userId={user.id}
          userName={user.name}
          currentBalance={user.balance}
          onClose={() => setShowAdjust(false)}
          onSuccess={() => {
            setShowAdjust(false);
            onAction();
          }}
        />
      )}

      {showResetBind && (
        <ConfirmModal
          title="Reset Binding?"
          message="This clears the user's bound phone and name so they can bind again. Use this if they made a typo."
          confirmLabel="Reset"
          confirmClass="bg-warning text-black"
          endpoint={`/api/admin/users/${user.id}`}
          action="reset_binding"
          onClose={() => setShowResetBind(false)}
          onSuccess={() => {
            setShowResetBind(false);
            onAction();
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// MODULES TAB
// ==========================================
function ModulesTab({ modules }: { modules: UserDetail['modules'] }) {
  if (modules.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted text-sm">No modules purchased.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {modules.map((m) => (
        <div key={m.id} className="card-flat">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-white font-semibold text-sm flex-1 min-w-0">
              {m.product_name}
            </p>
            <span
              className={
                m.status === 'active' ? 'pill-success' : 'pill-muted'
              }
            >
              {m.status.toUpperCase()}
            </span>
          </div>
          <div className="row">
            <span className="row-label">Progress</span>
            <span className="row-value text-xs">
              Day {m.days_credited}/{m.cycle_days}
            </span>
          </div>
          <div className="row">
            <span className="row-label">Earned</span>
            <span className="row-value text-primary text-sm">
              {m.total_credited.toLocaleString()} /{' '}
              {m.total_creditable.toLocaleString()}
            </span>
          </div>
          <div className="row">
            <span className="row-label">Expires</span>
            <span className="row-value text-xs">
              {formatDate(m.expires_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// TRANSACTIONS TAB
// ==========================================
function TransactionsTab({
  transactions,
}: {
  transactions: UserDetail['transactions'];
}) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted text-sm">No transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((t) => (
        <div key={t.id} className="card-flat">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-white font-medium text-sm">
              {transactionLabel(t.type)}
            </p>
            <p
              className={`font-semibold text-sm ${
                t.amount > 0
                  ? 'text-success'
                  : t.amount < 0
                  ? 'text-danger'
                  : 'text-muted'
              }`}
            >
              {t.amount > 0 ? '+' : ''}
              {t.amount.toLocaleString()} UGX
            </p>
          </div>
          <p className="text-muted text-xs">
            {formatDateTime(t.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// ADJUST BALANCE MODAL
// ==========================================
function AdjustBalanceModal({
  userId,
  userName,
  currentBalance,
  onClose,
  onSuccess,
}: {
  userId: string;
  userName: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const numericAmount = Number(amount) || 0;
  const newBalance = currentBalance + numericAmount;

  async function submit() {
    if (!numericAmount || numericAmount === 0) {
      toast.error('Enter an amount (positive or negative)');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (newBalance < 0) {
      toast.error('Balance would go negative');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}?t=` + Date.now(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'adjust_balance',
          amount: numericAmount,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Adjustment failed');
        setLoading(false);
        return;
      }

      toast.success('Balance adjusted');
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
          <h3 className="modal-title mb-0">Adjust Balance</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="card-flat mb-4">
          <p className="text-muted text-xs uppercase mb-1">{userName}</p>
          <p className="text-muted text-xs">
            Current: {currentBalance.toLocaleString()} UGX
          </p>
        </div>

        <label className="input-label">
          Amount (use - for deductions)
        </label>
        <input
          type="number"
          className="input mb-4"
          placeholder="e.g. 5000 or -5000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {numericAmount !== 0 && (
          <div className="card-flat mb-4">
            <div className="row">
              <span className="row-label">New Balance</span>
              <span
                className={`row-value ${
                  newBalance < 0 ? 'text-danger' : 'text-primary'
                }`}
              >
                {newBalance.toLocaleString()} UGX
              </span>
            </div>
          </div>
        )}

        <label className="input-label">Reason</label>
        <input
          type="text"
          className="input mb-4"
          placeholder="e.g. Bonus for loyalty"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Applying...' : 'Apply Adjustment'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// CONFIRM MODAL (generic)
// ==========================================
function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmClass,
  endpoint,
  action,
  onClose,
  onSuccess,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  endpoint: string;
  action: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`${endpoint}?t=` + Date.now(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        setLoading(false);
        return;
      }

      toast.success(data.message || 'Done');
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
        <h3 className="modal-title">{title}</h3>
        <div className="modal-note mb-4">{message}</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="py-3 rounded-full bg-card border border-border text-white text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={`py-3 rounded-full text-sm font-semibold active:scale-95 transition disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
          }
