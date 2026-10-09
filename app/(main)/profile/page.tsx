'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CloseIcon, ChevronRightIcon } from '@/components/icons';

const MIN_WITHDRAWAL = 4000;
const WITHDRAWAL_FEE_RATE = 0.15;
const MIN_DEPOSIT = 10000;
const MERCHANT_CODE = '7182484';
const MERCHANT_NAME = 'Essentials Limited';
const AIRTEL_USSD = '185*9#';

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
  const [showDepositHistory, setShowDepositHistory] = useState(false);
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);

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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card text-center py-12">
        <p className="text-muted text-sm">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Profile</h1>
        <p className="text-muted text-sm">Manage your account and wallet.</p>
      </div>

      <div className="card mb-4">
        <p className="text-foreground font-semibold text-base">{user.name}</p>
        <p className="text-muted text-sm mt-0.5">{user.phone}</p>
        <p className="text-muted text-xs mt-1">
          {user.is_bound
            ? `Bound: ${user.bound_full_name} · ${user.bound_phone}`
            : 'Account not bound'}
        </p>
      </div>

      <div className="card mb-4">
        <p className="text-muted text-xs uppercase tracking-wide mb-1">
          Balance
        </p>
        <p className="text-foreground font-bold text-3xl">
          {user.balance.toLocaleString()}{' '}
          <span className="text-lg">UGX</span>
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => setShowRecharge(true)}
            className="btn-primary text-sm py-3"
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
            className="btn-secondary text-sm py-3"
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="card mb-4 p-0">
        <button
          onClick={() => setShowGift(true)}
          className="row w-full px-4"
        >
          <span className="row-label">Redeem Gift Code</span>
          <ChevronRightIcon size={18} className="text-muted" />
        </button>
        <button
          onClick={() => setShowDepositHistory(true)}
          className="row w-full px-4"
        >
          <span className="row-label">Deposit History</span>
          <ChevronRightIcon size={18} className="text-muted" />
        </button>
        <button
          onClick={() => setShowWithdrawHistory(true)}
          className="row w-full px-4"
        >
          <span className="row-label">Withdraw History</span>
          <ChevronRightIcon size={18} className="text-muted" />
        </button>
        <button
          onClick={() => setShowBind(true)}
          className="row w-full px-4"
        >
          <span className="row-label">
            {user.is_bound ? 'Bound Account' : 'Bind Account'}
          </span>
          <ChevronRightIcon size={18} className="text-muted" />
        </button>
        <a
          href="https://t.me/+GM_Fo41-HFsxNTc0"
          target="_blank"
          rel="noopener noreferrer"
          className="row w-full px-4"
        >
          <span className="row-label">Join Telegram</span>
          <ChevronRightIcon size={18} className="text-muted" />
        </a>
        <a
          href="https://whatsapp.com/channel/0029Vb9OlFtKrWR36rpMst0O"
          target="_blank"
          rel="noopener noreferrer"
          className="row w-full px-4"
        >
          <span className="row-label">Follow WhatsApp Channel</span>
          <ChevronRightIcon size={18} className="text-muted" />
        </a>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl bg-danger/10 text-danger font-semibold text-sm active:scale-[0.98] transition"
      >
        Sign Out
      </button>

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

      {showDepositHistory && (
        <HistoryModal
          title="Deposit History"
          onClose={() => setShowDepositHistory(false)}
          empty={deposits.length === 0}
        >
          {deposits.map((d) => (
            <div key={d.id} className="card mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-foreground font-semibold text-sm">
                  {d.amount.toLocaleString()} UGX
                </span>
                <span className={statusPillClass(d.status)}>
                  {statusLabel(d.status)}
                </span>
              </div>
              <p className="text-muted text-xs">{formatDate(d.created_at)}</p>
            </div>
          ))}
        </HistoryModal>
      )}

      {showWithdrawHistory && (
        <HistoryModal
          title="Withdraw History"
          onClose={() => setShowWithdrawHistory(false)}
          empty={withdrawals.length === 0}
        >
          {withdrawals.map((w) => (
            <div key={w.id} className="card mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-foreground font-semibold text-sm">
                  {w.amount.toLocaleString()} UGX
                </span>
                <span className={statusPillClass(w.status)}>
                  {statusLabel(w.status)}
                </span>
              </div>
              <p className="text-muted text-xs">
                To: {w.recipient_name} · {w.recipient_phone}
              </p>
              <p className="text-muted text-xs mt-1">
                {formatDate(w.created_at)}
              </p>
            </div>
          ))}
        </HistoryModal>
      )}
    </div>
  );
}

// ==========================================
// RECHARGE MODAL — multi-step
// ==========================================
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
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* STEP 1: Amount + phone */}
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

            <div className="modal-note mb-4">
              Minimum deposit is {MIN_DEPOSIT.toLocaleString()} UGX.
            </div>

            <button
              onClick={createDeposit}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Please wait...' : 'Confirm'}
            </button>
          </>
        )}

        {/* STEP 2: Select network */}
        {step === 2 && (
          <>
            <p className="text-muted text-sm mb-4">
              Select the network you will use to pay{' '}
              <span className="text-foreground font-semibold">
                {numericAmount.toLocaleString()} UGX
              </span>
              .
            </p>

            <button
              onClick={() => {
                setNetwork('AIRTEL');
                setStep(3);
              }}
              className="w-full p-4 rounded-2xl border border-border bg-card mb-3 text-left active:scale-[0.98] transition flex items-center justify-between"
            >
              <span className="text-foreground font-semibold">Airtel</span>
              <span className="text-primary text-xs font-bold">SELECT →</span>
            </button>

            <button
              disabled
              className="w-full p-4 rounded-2xl border border-border bg-gray-50 mb-3 text-left flex items-center justify-between opacity-50"
            >
              <span className="text-muted font-semibold">MTN</span>
              <span className="text-muted text-xs">Coming soon</span>
            </button>
          </>
        )}

        {/* STEP 3: Merchant code + txid */}
        {step === 3 && (
          <>
            <div className="card-flat mb-4">
              <p className="text-muted text-xs uppercase mb-1">
                Merchant Code
              </p>
              <p className="text-primary font-bold text-2xl tracking-wider mb-2">
                {MERCHANT_CODE}
              </p>
              <p className="text-muted text-xs">Name: {MERCHANT_NAME}</p>
              <p className="text-muted text-xs mt-1">
                Amount: {numericAmount.toLocaleString()} UGX
              </p>
            </div>

            <div className="modal-note mb-4">
              <p className="font-semibold text-foreground mb-1">
                How to pay:
              </p>
              <p className="mb-1">
                Dial <span className="text-primary font-bold">{AIRTEL_USSD}</span> on your Airtel line.
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
              className="btn-primary w-full"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success/10 mx-auto flex items-center justify-center mb-4">
                <span className="text-success text-3xl">✓</span>
              </div>
              <h4 className="text-foreground font-bold text-lg mb-2">
                Submitted for review
              </h4>
              <p className="text-muted text-sm mb-4">
                Your deposit of {numericAmount.toLocaleString()} UGX is now
                being reviewed. You'll see it as <strong>Reviewing</strong> in
                your deposit history. Once approved, it will show as{' '}
                <strong>Completed</strong> and the balance will be credited.
              </p>
            </div>

            <button
              onClick={() => {
                onSuccess();
              }}
              className="btn-primary w-full"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// GIFT CARD MODAL
// ==========================================
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
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="modal-note mb-4">
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
          className="btn-primary w-full"
        >
          {loading ? 'Redeeming...' : 'Redeem'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// WITHDRAW MODAL
// ==========================================
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

      toast.success(data.message || 'Withdrawal request submitted');
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
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="card-flat mb-4">
          <p className="text-muted text-xs uppercase mb-1">Available</p>
          <p className="text-foreground font-bold text-xl">
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
          <div className="card-flat mb-4">
            <div className="row">
              <span className="row-label">Amount</span>
              <span className="row-value">
                {numericAmount.toLocaleString()} UGX
              </span>
            </div>
            <div className="row">
              <span className="row-label">Fee (15%)</span>
              <span className="row-value text-danger">
                -{fee.toLocaleString()} UGX
              </span>
            </div>
            <div className="row">
              <span className="row-label">You receive</span>
              <span className="row-value text-success">
                {netAmount.toLocaleString()} UGX
              </span>
            </div>
          </div>
        )}

        <div className="modal-note mb-4">
          Minimum withdrawal is {MIN_WITHDRAWAL.toLocaleString()} UGX. A 15%
          fee applies. You must have an active module to withdraw.
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Submitting...' : 'Request Withdrawal'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// BIND MODAL
// ==========================================
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
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  if (alreadyBound) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="modal-title mb-0">Bound Account</h3>
            <button onClick={onClose} className="text-muted p-1">
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="card-flat mb-2">
            <p className="text-muted text-xs uppercase mb-1">Full Name</p>
            <p className="text-foreground font-medium">{boundName || '-'}</p>
          </div>
          <div className="card-flat mb-4">
            <p className="text-muted text-xs uppercase mb-1">Phone</p>
            <p className="text-foreground font-medium">{boundPhone || '-'}</p>
          </div>
          <div className="modal-note">
            To change these details, please contact support.
          </div>
        </div>
      </div>
    );
  }

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
        toast.error(data.error || 'Could not bind');
        setLoading(false);
        return;
      }

      toast.success('Account bound');
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
          <h3 className="modal-title mb-0">Bind Account</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="modal-note mb-4">
          These details are used for withdrawals. They can only be set once.
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
        />

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Binding...' : 'Bind Account'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// HISTORY MODAL
// ==========================================
function HistoryModal({
  title,
  onClose,
  empty,
  children,
}: {
  title: string;
  onClose: () => void;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="modal-title mb-0">{title}</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {empty ? (
          <div className="text-center py-10">
            <p className="text-muted text-sm">No records yet.</p>
          </div>
        ) : (
          <div>{children}</div>
        )}
      </div>
    </div>
  );
                  }
