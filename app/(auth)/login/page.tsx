'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ==========================================
// LOGIN FORM
// ==========================================
function LoginForm() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!phone || !password) {
      toast.error('Please enter phone and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      toast.success(`Welcome back, ${data.user?.name?.split(' ')[0] || 'trader'}!`);
      router.replace('/');
      router.refresh();
    } catch (err) {
      toast.error('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back
        </h1>
        <p className="text-muted text-sm">
          Sign in to access your signals and account.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
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
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-muted mt-2">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary font-semibold">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

// ==========================================
// PAGE
// ==========================================
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
