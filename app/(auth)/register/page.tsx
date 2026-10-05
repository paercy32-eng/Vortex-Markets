'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ==========================================
// REGISTER FORM
// ==========================================
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          name,
          phone,
          password,
          confirmPassword,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      toast.success('Welcome to Vortex Markets!');
      router.replace('/');
      router.refresh();
    } catch (err) {
      toast.error('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Create account
        </h1>
        <p className="text-muted text-sm">
          Join Vortex Markets and start accessing our modules.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        <div>
          <label className="input-label">Full Name</label>
          <input
            type="text"
            className="input"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div>
          <label className="input-label">Phone Number</label>
          <input
            type="tel"
            className="input"
            placeholder="0700123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            inputMode="tel"
          />
        </div>

        <div>
          <label className="input-label">Password</label>
          <input
            type="password"
            className="input"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="input-label">Confirm Password</label>
          <input
            type="password"
            className="input"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="input-label">
            Referral Code <span className="text-muted/70">(optional)</span>
          </label>
          <input
            type="text"
            className="input uppercase"
            placeholder="VRTX-XXXXX"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            autoComplete="off"
          />
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-muted mt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

// ==========================================
// PAGE
// ==========================================
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
