'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CloseIcon, ChevronRightIcon } from '@/components/icons';

const MIN_WITHDRAWAL = 5000;
const WITHDRAWAL_FEE_RATE = 0.15;
const MIN_DEPOSIT = 10000;
const MERCHANT_CODE = '7182484';
const MERCHANT_NAME = 'Essentials Limited';
const AIRTEL_USSD = '185*9#';

const TELEGRAM_LINK = 'https://t.me/+Th3b39KdM180YTUy';
const WHATSAPP_LINK = 'https://whatsapp.com/channel/0029Vb8p4NM90x2r2rzFGN3Y';

interface ProfileUser {
  id: string;
  name: string;
  phone: string;
  balance: number;
  is_bound: boolean;
  bound_phone: string | null;
  bound_full_name: string | null;
}

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
    return 'pill-success';
  if (s === 'pending') return 'pill-warning';
  if (s === 'rejected' || s === 'failed') return 'pill-danger';
  return 'pill-muted';
}

function statusLabel(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return 'REVIEWING';
  if (s === 'approved' || s === 'completed') return 'COMPLETED';
  if (s === 'rejected' || s === 'failed') return 'REJECTED';
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

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRecharge, setShowRecharge] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBind, setShowBind] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // PWA install
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/profile?t=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not load profile');
        setLoading(false);
        return;
      }

      setUser(data.user);
      setDeposits(data.deposits || []);
      setWithdrawals(data.withdrawals || []);
      setLoading(false);
    } catch (err) {
      toast.error('Network error');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      setIsInstalled(true);
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      toast.error('Install option not available. Try opening in Chrome.');
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Installing app...');
    } else {
      toast('Install cancelled', { icon: 'ℹ️' });
    }
    setInstallPrompt(null);
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout?t=' + Date.now(), {
        method: 'POST',
        cache: 'no-store',
      });
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('Could not log out');
    }
  }

  const transactions: Transaction[] = [
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Profile</h1>
        <p className="text-gray-400 text-sm">Manage your account and wallet.</p>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-bold text-base truncate">
              {user.name}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">{user.phone}</p>
            <p className="text-gray-500 text-[10px] mt-1 truncate">
              {user.is_bound
                ? `Bound: ${user.bound_full_name} · ${user.bound_phone}`
                : 'Account not bound'}
            </p>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 mb-4 shadow-lg shadow-red-900/20">
        <p className="text-white/80 text-xs uppercase tracking-wider mb-1">
          Available Balance
        </p>
        <p className="text-white font-bold text-3xl mb-5">
          {user.balance.toLocaleString()}{' '}
          <span className="text-lg opacity-80">UGX</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowRecharge(true)}
            className="bg-white text-red-700 font-bold py-3 rounded-xl text-sm active:scale-[0.98] transition"
          >
            Recharge
          </button>
          <button
            onClick={() => {
              if (!user.is_bound) {
                toast.error('Bind your account first');
                setShowBind(true);
                return;
              }
              setShowWithdraw(true);
            }}
            className="bg-black/25 border border-white/20 text-white font-semibold py-3 rounded-xl text-sm active:scale-[0.98] transition"
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Install App (only when available) */}
      {!isInstalled && (
        <button
          onClick={handleInstall}
          className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 mb-4 shadow-sm active:scale-[0.99] transition border-l-4 border-red-600"
        >
          <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-white"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-gray-900 font-bold text-sm">Install Vortex App</p>
            <p className="text-gray-500 text-[10px] mt-0.5">
              Add to your home screen for quick access
            </p>
          </div>
          <ChevronRightIcon size={18} className="text-gray-400" />
        </button>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm">
        <button
          onClick={() => setShowHistory(true)}
          className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition border-b border-gray-100"
        >
          <span className="text-gray-900 font-medium text-sm">
            Transaction History
          </span>
          <ChevronRightIcon size={18} className="text-gray-400" />
        </button>
        <button
          onClick={() => setShowGift(true)}
          className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition border-b border-gray-100"
        >
          <span className="text-gray-900 font-medium text-sm">
            Redeem Gift Code
          </span>
          <ChevronRightIcon size={18} className="text-gray-400" />
        </button>
        <button
          onClick={() => setShowBind(true)}
          className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition border-b border-gray-100"
        >
          <span className="text-gray-900 font-medium text-sm">
            {user.is_bound ? 'Bound Account' : 'Bind Account'}
          </span>
          <ChevronRightIcon size={18} className="text-gray-400" />
        </button>
        <a
          href={TELEGRAM_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition border-b border-gray-100"
        >
          <span className="text-gray-900 font-medium text-sm">
            Join Telegram
          </span>
          <ChevronRightIcon size={18} className="text-gray-400" />
        </a>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition"
        >
          <span className="text-gray-900 font-medium text-sm">
            Follow the Vortex channel on WhatsApp
          </span>
          <ChevronRightIcon size={18} className="text-gray-400" />
        </a>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl bg-red-600/10 text-red-500 font-semibold text-sm active:scale-[0.98] transition mb-4"
      >
        Sign Out
      </button>

      {/* Modals */}
      {showRecharge && (
        <RechargeModal
          onClose={() => setShowRecharge(false)}
          onSuccess={() => {
            setShowRecharge(false);
            loadProfile();
          }}
        />
      )}

      {showWithdraw && user && (
        <WithdrawModal
          balance={user.balance}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => {
            setShowWithdraw(false);
            loadProfile();
          }}
        />
      )}

      {showBind && (
        <BindModal
          alreadyBound={user.is_bound}
          boundPhone={user.bound_phone}
          boundName={user.bound_full_name}
          onClose={() => setShowBind(false)}
          onSuccess={() => {
            setShowBind(false);
            loadProfile();
          }}
        />
      )}

      {showGift && (
        <GiftCardModal
          onClose={() => setShowGift(false)}
          onSuccess={() => {
            setShowGift(false);
            loadProfile();
          }}
        />
      )}

      {showHistory && (
        <HistoryModal
          onClose={() => setShowHistory(false)}
          transactions={transactions}
        />
      )}
    </div>
  );
}

// ============================================================
// TRANSACTION HISTORY MODAL (Combined)
// ============================================================
function HistoryModal({
  onClose,
  transactions,
}: {
  onClose: () => void;
  transactions: Transaction[];
}) {
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  const filtered = transactions.filter((t) => {
    if (filter === 'all') return true;
    return t.kind === filter;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="modal-title mb-0">Transaction History</h3>
          <button onClick={onClose} className="text-gray-400 p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['all', 'deposit', 'withdrawal'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`py-2 rounded-full text-xs font-semibold transition ${
                filter === f
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : 'Withdrawals'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No records yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="bg-gray-50 border border-gray-100 rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        t.kind === 'deposit'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.kind === 'deposit' ? '↓' : '↑'}
                    </div>
                    <span className="text-gray-900 font-semibold text-sm">
                      {t.kind === 'deposit' ? 'Deposit' : 'Withdrawal'}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      t.kind === 'deposit'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {t.kind === 'deposit' ? '+' : '−'}
                    {t.amount.toLocaleString()} UGX
                  </span>
                </div>
                <p className="text-gray-500 text-[10px] mb-2">{t.detail}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[10px]">
                    {formatDate(t.created_at)}
                  </span>
                  <span className={statusPillClass(t.status)}>
                    {statusLabel(t.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// RECHARGE MODAL
// ============================================================
function RechargeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [network, setNetwork] = useState<'AIRTEL' | null>(null);
  const [txid, setTxid] = useState('');
  const [loading, setLoading] = useState(false);

  const numericAmount = Number(amount) || 0;

  async function createDeposit() {
    if (!numericAmount || numericAmount < MIN_DEPOSIT) {
      toast.error(`Minimum deposit is ${MIN_DEPOSIT.toLocaleString()} UGX`);
      return;
    }
    if (!phone.trim()) {
      toast.error('Enter the mobile money number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/recharge?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ amount: numericAmount, phone: phone.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not create deposit');
        setLoading(false);
        return;
      }

      setPaymentId(data.payment.id);
      setStep(2);
      setLoading(false);
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  async function submitTxid() {
    if (!paymentId) return;
    if (!network) {
      toast.error('Select a network');
      return;
    }
    if (!txid.trim()) {
      toast.error('Enter the transaction ID');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/recharge/submit-txid?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          paymentId,
          network,
          transactionId: txid.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not submit');
        setLoading(false);
        return;
      }

      setStep(4);
      setLoading(false);
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
          <h3 className="modal-title mb-0">
            Recharge {step < 4 && `— Step ${step} of 3`}
          </h3>
          <button onClick={onClose} className="text-gray-400 p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {step === 1 && (
          <>
            <label className="input-label">Amount (UGX)</label>
            <input
              type="number"
              className="input mb-4"
              placeholder={`Min ${MIN_DEPOSIT.toLocaleString()}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <label className="input-label">Mobile Money Number</label>
            <input
              type="tel"
              className="input mb-4"
              placeholder="0700123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4 text-xs text-gray-600">
              Minimum deposit is {MIN_DEPOSIT.toLocaleString()} UGX.
            </div>

            <button
              onClick={createDeposit}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? 'Please wait...' : 'Confirm'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-gray-600 text-sm mb-4">
              Select the network you will use to pay{' '}
              <span className="text-gray-900 font-semibold">
                {numericAmount.toLocaleString()} UGX
              </span>
              .
            </p>

            <button
              onClick={() => {
                setNetwork('AIRTEL');
                setStep(3);
              }}
              className="w-full p-4 rounded-2xl border border-gray-200 bg-white mb-3 text-left active:scale-[0.98] transition flex items-center justify-between"
            >
              <span className="text-gray-900 font-semibold">Airtel</span>
              <span className="text-red-600 text-xs font-bold">SELECT →</span>
            </button>

            <button
              disabled
              className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 mb-3 text-left flex items-center justify-between opacity-50"
            >
              <span className="text-gray-400 font-semibold">MTN</span>
              <span className="text-gray-400 text-xs">Coming soon</span>
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-gray-500 text-xs uppercase mb-1">
                Merchant Code
              </p>
              <p className="text-red-600 font-bold text-2xl tracking-wider mb-2">
                {MERCHANT_CODE}
              </p>
              <p className="text-gray-500 text-xs">Name: {MERCHANT_NAME}</p>
              <p className="text-gray-500 text-xs mt-1">
                Amount: {numericAmount.toLocaleString()} UGX
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 mb-4 text-xs text-gray-600">
              <p className="font-semibold text-gray-900 mb-1">How to pay:</p>
              <p className="mb-1">
                Dial{' '}
                <span className="text-red-600 font-bold">{AIRTEL_USSD}</span>
              </p>
              <p className="mb-1">
                Choose <strong>Pay Merchant</strong> and enter the code above.
              </p>
              <p>Complete the payment, then copy the transaction ID.</p>
            </div>

            <label className="input-label">Transaction ID</label>
            <input
              type="text"
              className="input mb-4 uppercase font-mono"
              placeholder="e.g. 1234567890"
              value={txid}
              onChange={(e) => setTxid(e.target.value.toUpperCase())}
              autoComplete="off"
            />

            <button
              onClick={submitTxid}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                <span className="text-green-600 text-3xl">✓</span>
              </div>
              <h4 className="text-gray-900 font-bold text-lg mb-2">
                Submitted for review
              </h4>
              <p className="text-gray-500 text-sm mb-4">
                Your deposit of {numericAmount.toLocaleString()} UGX is now
                being reviewed.
              </p>
            </div>

            <button
              onClick={onSuccess}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// GIFT CARD MODAL
// ============================================================
function GiftCardModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      toast.error('Enter a gift card code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/gift-cards/redeem?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not redeem');
        setLoading(false);
        return;
      }

      toast.success(data.message || 'Gift card redeemed');
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
          <h3 className="modal-title mb-0">Redeem Gift Code</h3>
          <button onClick={onClose} className="text-gray-400 p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4 text-xs text-gray-600">
          Enter the gift card code you received. The full value will be
          credited to your balance immediately.
        </div>

        <label className="input-label">Gift Card Code</label>
        <input
          type="text"
          className="input mb-4 uppercase font-mono"
          placeholder="VRTX-GIFT-XXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition disabled:opacity-50"
        >
          {loading ? 'Redeeming...' : 'Redeem'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// WITHDRAW MODAL
// ============================================================
function WithdrawModal({
  balance,
  onClose,
  onSuccess,
}: {
  balance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const numericAmount = Number(amount) || 0;
  const fee = Math.round(numericAmount * WITHDRAWAL_FEE_RATE * 100) / 100;
  const netAmount = Math.round((numericAmount - fee) * 100) / 100;

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (value < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL.toLocaleString()} UGX`);
      return;
    }
    if (value > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/withdraw?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ amount: value }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Withdraw failed');
        setLoading(false);
        return;
      }

      toast.success(data.message || 'Withdrawal submitted');
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
          <h3 className="modal-title mb-0">Withdraw</h3>
          <button onClick={onClose} className="text-gray-400 p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-gray-500 text-xs uppercase mb-1">Available</p>
          <p className="text-gray-900 font-bold text-xl">
            {balance.toLocaleString()} UGX
          </p>
        </div>

        <label className="input-label">Amount (UGX)</label>
        <input
          type="number"
          className="input mb-4"
          placeholder={`Min ${MIN_WITHDRAWAL.toLocaleString()}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {numericAmount > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
            <div className="flex justify-between py-1">
              <span className="text-gray-500 text-xs">Amount</span>
              <span className="text-gray-900 text-xs font-semibold">
                {numericAmount.toLocaleString()} UGX
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 text-xs">Fee (15%)</span>
              <span className="text-red-600 text-xs font-semibold">
                -{fee.toLocaleString()} UGX
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2">
              <span className="text-gray-500 text-xs">You receive</span>
              <span className="text-green-600 text-sm font-bold">
                {netAmount.toLocaleString()} UGX
              </span>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4 text-xs text-gray-600">
          Minimum withdrawal is {MIN_WITHDRAWAL.toLocaleString()} UGX. A 15%
          fee applies. You must have an active module to withdraw. The amount
          is deducted immediately and refunded if rejected.
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Request Withdrawal'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// BIND MODAL
// ============================================================
function BindModal({
  alreadyBound,
  boundPhone,
  boundName,
  onClose,
  onSuccess,
}: {
  alreadyBound: boolean;
  boundPhone: string | null;
  boundName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [editing, setEditing] = useState(!alreadyBound);
  const [phone, setPhone] = useState(boundPhone || '');
  const [fullName, setFullName] = useState(boundName || '');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!phone || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/profile/bind?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ phone, fullName }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not save');
        setLoading(false);
        return;
      }

      toast.success(data.message || 'Saved');
      onSuccess();
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  if (alreadyBound && !editing) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="modal-title mb-0">Bound Account</h3>
            <button onClick={onClose} className="text-gray-400 p-1">
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
            <p className="text-gray-500 text-xs uppercase mb-1">Full Name</p>
            <p className="text-gray-900 font-medium text-sm">{boundName || '-'}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
            <p className="text-gray-500 text-xs uppercase mb-1">Phone</p>
            <p className="text-gray-900 font-medium text-sm">{boundPhone || '-'}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition mb-2"
          >
            Change Bound Account
          </button>
          <p className="text-gray-400 text-xs text-center">
            You can only change this when you have no pending withdrawal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="modal-title mb-0">
            {alreadyBound ? 'Change Bound Account' : 'Bind Account'}
          </h3>
          <button onClick={onClose} className="text-gray-400 p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4 text-xs text-gray-600">
          These details are used for withdrawals. Make sure the name matches
          your registered mobile money name.
        </div>

        <label className="input-label">Full Registered Name</label>
        <input
          type="text"
          className="input mb-4"
          placeholder="e.g. John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <label className="input-label">Mobile Money Number</label>
        <input
          type="tel"
          className="input mb-4"
          placeholder="0700123456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : alreadyBound ? 'Save Changes' : 'Bind Account'}
        </button>

        {alreadyBound && (
          <button
            onClick={() => setEditing(false)}
            className="w-full text-gray-400 text-xs mt-3 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
        }
