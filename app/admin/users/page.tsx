'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RefreshIcon, CloseIcon } from '@/components/icons';

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  balance: number;
  total_deposited: number;
  total_invested: number;
  total_withdrawn: number;
  is_banned: boolean;
  banned_reason: string | null;
  referral_code: string;
  created_at: string;
  valid_invites: number;
  active_rentals: number;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  cycle_days: number;
  daily_return: number;
  is_active: boolean;
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
    is_banned: boolean;
    created_at: string;
    total_referrals: number;
    active_referrals: number;
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
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
    return new Date(iso).toLocaleString('en-GB', {
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
    admin_ban: 'Account Banned',
    admin_unban: 'Account Unbanned',
    admin_granted_module: 'Admin Granted Module',
    binding_reset: 'Binding Reset',
    password_reset: 'Password Reset',
  };
  return map[type] || type;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [showGrantPicker, setShowGrantPicker] = useState(false);

  async function loadUsers(search = '') {
    setLoading(true);
    const url = search
      ? `/api/admin/users?q=${encodeURIComponent(search)}&t=${Date.now()}`
      : `/api/admin/users?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 401) {
      router.replace('/admin/login');
      return;
    }
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  async function loadProducts() {
    const res = await fetch(`/api/admin/products?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = await res.json();
    setProducts(data.products ?? []);
  }

  useEffect(() => {
    loadUsers();
    loadProducts();
  }, [router]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    loadUsers(query);
  }

  return (
    <main className="min-h-screen px-4 py-6 animate-fade-in bg-gray-50 text-gray-900">
      <div className="flex items-center gap-3 mb-4 px-2">
        <Link href="/admin" className="text-gray-500 text-xl">←</Link>
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
      </div>

      <form onSubmit={onSearch} className="mb-4 px-2 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone"
          className="input-light flex-1"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold text-sm"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading…</div>
      ) : users.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No users found.</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u)}
              className="bg-white border border-gray-200 rounded-2xl p-4 w-full text-left active:scale-[0.99] transition shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">
                      {u.name}
                    </span>
                    {u.is_banned && (
                      <span className="text-[9px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                        BANNED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{u.phone}</div>
                  <div className="text-[10px] text-gray-500 mt-2">
                    Balance:{' '}
                    <span className="text-gray-900 font-semibold">
                      UGX {Number(u.balance).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Valid invites: {u.valid_invites} · Active rentals: {u.active_rentals}
                  </div>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && !showGrantPicker && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            setSelected(null);
            loadUsers(query);
          }}
          onOpenGrantPicker={() => setShowGrantPicker(true)}
        />
      )}

      {selected && showGrantPicker && (
        <GrantRobotPicker
          user={selected}
          products={products}
          onClose={() => setShowGrantPicker(false)}
          onGranted={() => {
            setShowGrantPicker(false);
            setSelected(null);
            loadUsers(query);
          }}
        />
      )}
    </main>
  );
}

function UserDetailModal({
  user,
  onClose,
  onRefresh,
  onOpenGrantPicker,
}: {
  user: AdminUser;
  onClose: () => void;
  onRefresh: () => void;
  onOpenGrantPicker: () => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'modules' | 'tx'>('info');

  async function loadDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}?t=` + Date.now(), {
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
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">User Details</h3>
          <button onClick={onClose} className="text-gray-500 p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {loading || !detail ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-gray-900 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['info', 'modules', 'tx'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`py-2 rounded-full text-xs font-semibold transition ${
                    activeTab === t
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 border border-gray-200 text-gray-600'
                  }`}
                >
                  {t === 'info' ? 'Info' : t === 'modules' ? 'Modules' : 'History'}
                </button>
              ))}
            </div>

            {activeTab === 'info' && (
              <InfoTab
                detail={detail}
                products={products}
                onAction={() => {
                  loadDetail();
                  onRefresh();
                }}
              />
            )}
            {activeTab === 'modules' && <ModulesTab modules={detail.modules} />}
            {activeTab === 'tx' && (
              <TransactionsTab transactions={detail.transactions} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InfoTab({
  detail,
  products,
  onAction,
}: {
  detail: UserDetail;
  products: ProductOption[];
  onAction: () => void;
}) {
  const { user } = detail;
  const [showAdjust, setShowAdjust] = useState(false);
  const [showResetBind, setShowResetBind] = useState(false);
  const [showBan, setShowBan] = useState(false);
  const [showGrant, setShowGrant] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function runAction(action: string, extra?: Record<string, any>) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}?t=` + Date.now(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Action failed');
        setProcessing(false);
        return;
      }

      toast.success(data.message || 'Done');
      setProcessing(false);
      onAction();
    } catch {
      toast.error('Network error');
      setProcessing(false);
    }
  }

  return (
    <div>
      <div className="card-flat mb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold truncate">
              {user.name}
            </p>
            <p className="text-muted text-xs mt-1">{user.phone}</p>
            <p className="text-muted text-xs mt-1">
              Code: <span className="text-primary">{user.referral_code}</span>
            </p>
            <p className="text-muted text-xs mt-1">
              Joined: {formatDate(user.created_at)}
            </p>
          </div>
          {user.is_banned && <span className="pill-danger">BANNED</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <SmallStat label="Balance" value={`UGX ${Number(user.balance).toLocaleString()}`} />
        <SmallStat label="Total Referrals" value={String(user.total_referrals || 0)} />
        <SmallStat label="Active Referrals" value={String(user.active_referrals || 0)} />
        <SmallStat label="Active Modules" value={String(detail.modules.filter(m => m.status === 'active').length)} />
      </div>

      <div className="card-flat mb-3">
        <p className="text-muted text-xs uppercase mb-1">Adjust Balance</p>
        <button
          onClick={() => setShowAdjust(true)}
          className="mt-1 w-full py-3 rounded-full bg-primary/10 text-primary text-sm font-semibold active:scale-95 transition"
        >
          Adjust Balance
        </button>
      </div>

      <div className="card-flat mb-3">
        <p className="text-muted text-xs uppercase mb-2">Security</p>
        <button
          onClick={() => setShowResetPassword(true)}
          className="w-full py-3 rounded-full bg-primary/10 text-primary text-sm font-semibold active:scale-95 transition"
        >
          Reset Password
        </button>
      </div>

      <div className="card-flat mb-3">
        <p className="text-muted text-xs uppercase mb-2">Grant Module (Free)</p>
        <button
          onClick={() => setShowGrant(true)}
          className="w-full py-3 rounded-full bg-primary/10 text-primary text-sm font-semibold active:scale-95 transition"
        >
          Grant a Module
        </button>
      </div>

      <div className="card-flat mb-3">
        <p className="text-muted text-xs uppercase mb-2">Bound Account</p>
        {user.is_bound ? (
          <>
            <p className="text-foreground text-sm">{user.bound_full_name}</p>
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

      <div className="card-flat mb-3">
        <p className="text-muted text-xs uppercase mb-2">Account Status</p>
        {user.is_banned ? (
          <button
            onClick={() => runAction('unban')}
            disabled={processing}
            className="w-full py-3 rounded-full bg-success text-[#FFFFFF] text-sm font-semibold active:scale-95 transition disabled:opacity-50"
          >
            {processing ? '...' : 'Unban User'}
          </button>
        ) : (
          <button
            onClick={() => setShowBan(true)}
            className="w-full py-3 rounded-full bg-danger/10 text-danger text-sm font-semibold active:scale-95 transition"
          >
            Ban User
          </button>
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

      {showGrant && (
        <GrantModuleModal
          userId={user.id}
          products={products}
          onClose={() => setShowGrant(false)}
          onSuccess={() => {
            setShowGrant(false);
            onAction();
          }}
        />
      )}

      {showResetPassword && (
        <ResetPasswordModal
          userId={user.id}
          userName={user.name}
          onClose={() => setShowResetPassword(false)}
          onSuccess={() => {
            setShowResetPassword(false);
            onAction();
          }}
        />
      )}

      {showResetBind && (
        <ConfirmModal
          title="Reset Binding?"
          message="This clears the user's bound phone and name so they can bind again."
          confirmLabel="Reset"
          confirmClass="bg-warning text-[#FFFFFF]"
          onConfirm={() => {
            setShowResetBind(false);
            runAction('reset_binding');
          }}
          onClose={() => setShowResetBind(false)}
        />
      )}

      {showBan && (
        <ConfirmModal
          title="Ban this user?"
          message="Banned users cannot log in or use the app. You can unban them later."
          confirmLabel="Ban"
          confirmClass="bg-danger text-[#FFFFFF]"
          onConfirm={() => {
            setShowBan(false);
            runAction('ban');
          }}
          onClose={() => setShowBan(false)}
        />
      )}
    </div>
  );
}

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
            <p className="text-foreground font-semibold text-sm flex-1 min-w-0">
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
            <p className="text-foreground font-medium text-sm">
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
          <p className="text-muted text-xs">{formatDateTime(t.created_at)}</p>
        </div>
      ))}
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 bg-gray-50 border border-gray-200">
      <div className="text-[9px] text-gray-500 font-semibold mb-1">
        {label.toUpperCase()}
      </div>
      <div className="text-xs font-bold text-gray-900">{value}</div>
    </div>
  );
}

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
      toast.error('Enter an amount');
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

        <label className="input-label">Amount (use - for deductions)</label>
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

function ResetPasswordModal({
  userId,
  userName,
  onClose,
  onSuccess,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ userId, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Reset failed');
        setLoading(false);
        return;
      }

      toast.success('Password reset successfully');
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
          <h3 className="modal-title mb-0">Reset Password</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="card-flat mb-4">
          <p className="text-muted text-xs uppercase mb-1">User</p>
          <p className="text-foreground text-sm font-medium">{userName}</p>
        </div>

        <label className="input-label">New Password</label>
        <div className="relative mb-4">
          <input
            type={show ? 'text' : 'password'}
            className="input pr-16"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs font-semibold"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        <label className="input-label">Confirm Password</label>
        <input
          type={show ? 'text' : 'password'}
          className="input mb-4"
          placeholder="Repeat password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
}

function GrantModuleModal({
  userId,
  products,
  onClose,
  onSuccess,
}: {
  userId: string;
  products: ProductOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = products.find((p) => p.id === selectedId);

  async function submit() {
    if (!selectedId) {
      toast.error('Select a module');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}?t=` + Date.now(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          action: 'grant_module',
          productId: selectedId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not grant module');
        setLoading(false);
        return;
      }

      toast.success(data.message || 'Module granted');
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
          <h3 className="modal-title mb-0">Grant Module</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="modal-note mb-4">
          This gives the user the selected module for free. No commission,
          no balance deduction.
        </div>

        <label className="input-label">Select Module</label>
        <div className="max-h-64 overflow-y-auto mb-4">
          {products.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 rounded-xl mb-2 border transition ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-medium text-sm truncate">
                      {p.name}
                    </p>
                    <p className="text-muted text-xs mt-0.5">
                      {p.cycle_days} days · {p.daily_return.toLocaleString()}{' '}
                      UGX/day
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-primary text-lg">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="card-flat mb-4">
            <div className="row">
              <span className="row-label">Selected</span>
              <span className="row-value text-sm">{selected.name}</span>
            </div>
            <div className="row">
              <span className="row-label">Value (free)</span>
              <span className="row-value text-sm">
                {selected.price.toLocaleString()} UGX
              </span>
            </div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !selectedId}
          className="btn-primary w-full"
        >
          {loading ? 'Granting...' : 'Grant Module'}
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
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
            className="py-3 rounded-full bg-card border border-border text-foreground text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`py-3 rounded-full text-sm font-semibold active:scale-95 transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// GRANT ROBOT PICKER (Missing Component)
// ==========================================
function GrantRobotPicker({
  user,
  products,
  onClose,
  onGranted,
}: {
  user: AdminUser;
  products: ProductOption[];
  onClose: () => void;
  onGranted: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function grant(productId: string, productName: string) {
    setBusyId(productId);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}?t=` + Date.now(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant_module', productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || 'Failed to grant');
        setBusyId(null);
      } else {
        setMsg(`✓ Granted ${productName}`);
        setTimeout(onGranted, 700);
      }
    } catch {
      setMsg('Something went wrong');
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-lg font-bold text-gray-900">Select Module</div>
            <div className="text-xs text-gray-500">Grant to {user.name}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 text-xl">×</button>
        </div>

        {products.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Loading modules…</div>
        ) : (
          <div className="space-y-2">
            {products
              .filter((p) => p.is_active)
              .map((p) => (
                <button
                  key={p.id}
                  disabled={busyId !== null}
                  onClick={() => grant(p.id, p.name)}
                  className="bg-white border border-gray-200 rounded-2xl p-3 w-full text-left flex items-center gap-3 active:scale-[0.99] transition disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Worth UGX {Number(p.price).toLocaleString()} · +
                      {Number(p.daily_return).toLocaleString()}/day · {p.cycle_days}d
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {busyId === p.id ? '…' : '→'}
                  </div>
                </button>
              ))}
          </div>
        )}

        {msg && (
          <div className="text-sm text-center text-gray-900 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 mt-3">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
    }
