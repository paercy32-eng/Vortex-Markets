'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CloseIcon, ChevronRightIcon } from '@/components/icons';

const MIN_WITHDRAWAL = 5000;
const WITHDRAWAL_FEE_RATE = 0.15;
const MIN_DEPOSIT = 10000;
const MERCHANT_CODE = '7182484';
const MERCHANT_NAME = 'Essentials Limited';
const AIRTEL_USSD = '185*9#';

const TELEGRAM_LINK = 'https://t.me/+i4rSSZUHBu00NDMy';
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
    return 'text-[#34D399] bg-[#064E3B]/60 border border-[#34D399]/30';
  if (s === 'pending')
    return 'text-[#E0A44C] bg-[#78350F]/60 border border-[#E0A44C]/30';
  if (s === 'rejected' || s === 'failed')
    return 'text-[#F87171] bg-[#7F1D1D]/60 border border-[#F87171]/30';
  return 'text-[#94A3B8] bg-[#334155] border border-[#475569]';
}

function statusPill(status: string): string {
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
        <div className="w-8 h-8 rounded-full border-2 border-[#E0A44C] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-[#94A3B8] text-sm">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#F8FAFC] mb-0.5">Profile</h1>
        <p className="text-[#94A3B8] text-xs">
          Manage your account and wallet.
        </p>
      </div>

      {/* User Card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-3 mb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8833A] to-[#E0A44C] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#F8FAFC] font-bold text-sm truncate">
            {user.name}
          </p>
          <p className="text-[#94A3B8] text-[11px]">{user.phone}</p>
          <p className="text-[#64748B] text-[9px] mt-0.5 truncate">
            {user.is_bound
              ? `Bound: ${user.bound_full_name} · ${user.bound_phone}`
              : 'Not bound'}
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl px-4 py-4 mb-3">
        <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-0.5">
          Available Balance
        </p>
        <p className="text-[#E0A44C] font-bold text-2xl mb-3">
          {user.balance.toLocaleString()}{' '}
          <span className="text-sm opacity-70 text-[#F8FAFC]">UGX</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowRecharge(true)}
            className="bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-2.5 rounded-lg text-xs active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20"
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
            className="bg-[#0F172A] border border-[#334155] text-[#F8FAFC] font-semibold py-2.5 rounded-lg text-xs active:scale-[0.98] transition"
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Install App */}
      {!isInstalled && (
        <button
          onClick={handleInstall}
          className="w-full flex items-center gap-3 bg-[#1E293B] border border-[#334155] border-l-4 border-l-[#C8833A] rounded-2xl px-4 py-3 mb-3 active:scale-[0.99] transition"
        >
          <div className="w-9 h-9 rounded-lg bg-[#C8833A]/20 border border-[#C8833A]/40 flex items-center justify-center flex-shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E0A44C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[#F8FAFC] font-bold text-xs">
              Install Vortex App
            </p>
            <p className="text-[#94A3B8] text-[10px] mt-0.5">
              Add to home screen for quick access
            </p>
          </div>
          <ChevronRightIcon size={16} className="text-[#64748B]" />
        </button>
      )}

      {/* Quick Actions */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden mb-3">
        <Link
          href="/task-center"
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#334155]/40 transition border-b border-[#334155]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#C8833A]/20 border border-[#C8833A]/40 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🎯</span>
          </div>
          <span className="text-[#F8FAFC] font-medium text-xs flex-1">
            Task Center
          </span>
          <ChevronRightIcon size={16} className="text-[#64748B]" />
        </Link>

        <button
          onClick={() => setShowHistory(true)}
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#334155]/40 transition border-b border-[#334155]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">📊</span>
          </div>
          <span className="text-[#F8FAFC] font-medium text-xs flex-1 text-left">
            Transaction History
          </span>
          <ChevronRightIcon size={16} className="text-[#64748B]" />
        </button>

        <button
          onClick={() => setShowGift(true)}
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#334155]/40 transition border-b border-[#334155]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🎁</span>
          </div>
          <span className="text-[#F8FAFC] font-medium text-xs flex-1 text-left">
            Redeem Gift Code
          </span>
          <ChevronRightIcon size={16} className="text-[#64748B]" />
        </button>

        <button
          onClick={() => setShowBind(true)}
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#334155]/40 transition border-b border-[#334155]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#E0A44C]/20 border border-[#E0A44C]/40 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🔒</span>
          </div>
          <span className="text-[#F8FAFC] font-medium text-xs flex-1 text-left">
            {user.is_bound ? 'Bound Account' : 'Bind Account'}
          </span>
          <ChevronRightIcon size={16} className="text-[#64748B]" />
        </button>

        <a
          href={TELEGRAM_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#334155]/40 transition border-b border-[#334155]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">✈️</span>
          </div>
          <span className="text-[#F8FAFC] font-medium text-xs flex-1">
            Join Telegram
          </span>
          <ChevronRightIcon size={16} className="text-[#64748B]" />
        </a>

        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#334155]/40 transition"
        >
          <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">💬</span>
          </div>
          <span className="text-[#F8FAFC] font-medium text-xs flex-1">
            WhatsApp Channel
          </span>
          <ChevronRightIcon size={16} className="text-[#64748B]" />
        </a>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#F87171] font-semibold text-xs active:scale-[0.98] transition mb-4"
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
// TRANSACTION HISTORY MODAL
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#1E293B] border-t border-[#334155] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#F8FAFC]">
            Transaction History
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] p-1">
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
                  ? 'bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white'
                  : 'bg-[#0F172A] text-[#94A3B8] border border-[#334155]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : 'Withdrawals'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[#94A3B8] text-sm">No records yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="bg-[#0F172A] border border-[#334155] rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        t.kind === 'deposit'
                          ? 'bg-[#064E3B] text-[#34D399]'
                          : 'bg-[#7F1D1D] text-[#F87171]'
                      }`}
                    >
                      {t.kind === 'deposit' ? '↓' : '↑'}
                    </div>
                    <span className="text-[#F8FAFC] font-semibold text-sm">
                      {t.kind === 'deposit' ? 'Deposit' : 'Withdrawal'}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      t.kind === 'deposit'
                        ? 'text-[#34D399]'
                        : 'text-[#F87171]'
                    }`}
                  >
                    {t.kind === 'deposit' ? '+' : '−'}
                    {t.amount.toLocaleString()} UGX
                  </span>
                </div>
                <p className="text-[#64748B] text-[10px] mb-2">{t.detail}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] text-[10px]">
                    {formatDate(t.created_at)}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusPillClass(t.status)}`}
                  >
                    {statusPill(t.status)}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#1E293B] border-t border-[#334155] rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#F8FAFC]">
            Recharge {step < 4 && `— Step ${step} of 3`}
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {step === 1 && (
          <>
            <label className="block text-[10px] text-[#94A3B8] font-bold mb-1 uppercase tracking-wider">
              Amount (UGX)
            </label>
            <input
              type="number"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition mb-4 text-sm"
              placeholder={`Min ${MIN_DEPOSIT.toLocaleString()}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <label className="block text-[10px] text-[#94A3B8] font-bold mb-1 uppercase tracking-wider">
              Mobile Money Number
            </label>
            <input
              type="tel"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition mb-4 text-sm"
              placeholder="0700123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />

            <div className="bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 mb-4 text-xs text-[#94A3B8]">
              Minimum deposit is {MIN_DEPOSIT.toLocaleString()} UGX.
            </div>

            <button
              onClick={createDeposit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : 'Confirm'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[#94A3B8] text-sm mb-4">
              Select the network you will use to pay{' '}
              <span className="text-[#F8FAFC] font-semibold">
                {numericAmount.toLocaleString()} UGX
              </span>
              .
            </p>

            <button
              onClick={() => {
                setNetwork('AIRTEL');
                setStep(3);
              }}
              className="w-full p-4 rounded-2xl bg-[#0F172A] border border-[#334155] mb-3 text-left active:scale-[0.98] transition flex items-center justify-between"
            >
              <span className="text-[#F8FAFC] font-semibold">Airtel</span>
              <span className="text-[#E0A44C] text-xs font-bold">SELECT →</span>
            </button>

            <button
              disabled
              className="w-full p-4 rounded-2xl bg-[#0F172A]/50 border border-[#334155] mb-3 text-left flex items-center justify-between opacity-50"
            >
              <span className="text-[#64748B] font-semibold">MTN</span>
              <span className="text-[#64748B] text-xs">Coming soon</span>
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 mb-4">
              <p className="text-[#94A3B8] text-xs uppercase mb-1">
                Merchant Code
              </p>
              <p className="text-[#E0A44C] font-bold text-2xl tracking-wider mb-2">
                {MERCHANT_CODE}
              </p>
              <p className="text-[#94A3B8] text-xs">Name: {MERCHANT_NAME}</p>
              <p className="text-[#94A3B8] text-xs mt-1">
                Amount: {numericAmount.toLocaleString()} UGX
              </p>
            </div>

            <div className="bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-3 mb-4 text-xs text-[#94A3B8]">
              <p className="font-semibold text-[#F8FAFC] mb-1">How to pay:</p>
              <p className="mb-1">
                Dial{' '}
                <span className="text-[#E0A44C] font-bold">{AIRTEL_USSD}</span>
              </p>
              <p className="mb-1">
                Choose <strong className="text-[#F8FAFC]">Pay Merchant</strong> and enter the code above.
              </p>
              <p>Complete the payment, then copy the transaction ID.</p>
            </div>

            <label className="block text-[10px] text-[#94A3B8] font-bold mb-1 uppercase tracking-wider">
              Transaction ID
            </label>
            <input
              type="text"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition mb-4 text-sm uppercase font-mono"
              placeholder="e.g. 1234567890"
              value={txid}
              onChange={(e) => setTxid(e.target.value.toUpperCase())}
              autoComplete="off"
            />

            <button
              onClick={submitTxid}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#064E3B] mx-auto flex items-center justify-center mb-4">
                <span className="text-[#34D399] text-3xl">✓</span>
              </div>
              <h4 className="text-[#F8FAFC] font-bold text-lg mb-2">
                Submitted for review
              </h4>
              <p className="text-[#94A3B8] text-sm mb-4">
                Your deposit of {numericAmount.toLocaleString()} UGX is now
                being reviewed.
              </p>
            </div>

            <button
              onClick={onSuccess}
              className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#1E293B] border-t border-[#334155] rounded-t-3xl p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#F8FAFC]">
            Redeem Gift Code
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 mb-4 text-xs text-[#94A3B8]">
          Enter the gift card code you received. The full value will be
          credited to your balance immediately.
        </div>

        <label className="block text-[10px] text-[#94A3B8] font-bold mb-1 uppercase tracking-wider">
          Gift Card Code
        </label>
        <input
          type="text"
          className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition mb-4 text-sm uppercase font-mono"
          placeholder="VRTX-GIFT-XXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#1E293B] border-t border-[#334155] rounded-t-3xl p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#F8FAFC]">Withdraw</h3>
          <button onClick={onClose} className="text-[#94A3B8] p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 mb-4">
          <p className="text-[#94A3B8] text-xs uppercase mb-1">Available</p>
          <p className="text-[#E0A44C] font-bold text-xl">
            {balance.toLocaleString()} UGX
          </p>
        </div>

        <label className="block text-[10px] text-[#94A3B8] font-bold mb-1 uppercase tracking-wider">
          Amount (UGX)
        </label>
        <input
          type="number"
          className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition mb-4 text-sm"
          placeholder={`Min ${MIN_WITHDRAWAL.toLocaleString()}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {numericAmount > 0 && (
          <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 mb-4">
            <div className="flex justify-between py-1">
              <span className="text-[#94A3B8] text-xs">Amount</span>
              <span className="text-[#F8FAFC] text-xs font-semibold">
                {numericAmount.toLocaleString()} UGX
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#94A3B8] text-xs">Fee (15%)</span>
              <span className="text-[#F87171] text-xs font-semibold">
                -{fee.toLocaleString()} UGX
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-[#334155] mt-1 pt-2">
              <span className="text-[#94A3B8] text-xs">You receive</span>
              <span className="text-[#34D399] text-sm font-bold">
                {netAmount.toLocaleString()} UGX
              </span>
            </div>
          </div>
        )}

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 mb-4 text-xs text-[#94A3B8]">
          Minimum withdrawal is {MIN_WITHDRAWAL.toLocaleString()} UGX. A 15%
          fee applies. You must have an active module to withdraw.
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 disabled:opacity-50"
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
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
        <div
          className="w-full max-w-md bg-[#1E293B] border-t border-[#334155] rounded-t-3xl p-5 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#F8FAFC]">Bound Account</h3>
            <button onClick={onClose} className="text-[#94A3B8] p-1">
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 mb-3">
            <p className="text-[#94A3B8] text-xs uppercase mb-1">Full Name</p>
            <p className="text-[#F8FAFC] font-medium text-sm">
              {boundName || '-'}
            </p>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 mb-4">
            <p className="text-[#94A3B8] text-xs uppercase mb-1">Phone</p>
            <p className="text-[#F8FAFC] font-medium text-sm">
              {boundPhone || '-'}
            </p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition mb-2 shadow-lg shadow-[#C8833A]/20"
          >
            Change Bound Account
          </button>
          <p className="text-[#64748B] text-xs text-center">
            You can only change this when you have no pending withdrawal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#1E293B] border-t border-[#334155] rounded-t-3xl p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#F8FAFC]">
            {alreadyBound ? 'Change Bound Account' : 'Bind Account'}
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 mb-4 text-xs text-[#94A3B8]">
          These details are used for withdrawals. Make sure the name matches
          your registered mobile money name.
        </div>

        <label className="block text-[10px] text-[#94A3B8] font-bold mb-1 uppercase tracking-wider">
          Full Registered Name
        </label>
        <input
          type="text"
          className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition mb-4 text-sm"
          placeholder="e.g. John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <label className="block text-[10px] text-[#94A3B8] font-bold mb-1 uppercase tracking-wider">
          Mobile Money Number
        </label>
        <input
          type="tel"
          className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition mb-4 text-sm"
          placeholder="0700123456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 disabled:opacity-50"
        >
          {loading ? 'Saving...' : alreadyBound ? 'Save Changes' : 'Bind Account'}
        </button>

        {alreadyBound && (
          <button
            onClick={() => setEditing(false)}
            className="w-full text-[#64748B] text-xs mt-3 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
