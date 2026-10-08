'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RegisterForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Create account
        </h1>
        <p className="text-muted text-sm">
          Join Vortex Markets and start accessing our modules.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form
        action="/api/auth/register"
        method="POST"
        onSubmit={() => setSubmitting(true)}
        className="flex-1 flex flex-col gap-4"
      >
        <div>
          <label htmlFor="name" className="input-label">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="input"
            placeholder="John Doe"
            required
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="phone" className="input-label">
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="input"
            placeholder="0700123456"
            required
            autoComplete="username"
            inputMode="tel"
          />
        </div>

        <div>
          <label htmlFor="password" className="input-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            placeholder="At least 6 characters"
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="input-label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="input"
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        <div>
          <label htmlFor="referralCode" className="input-label">
            Referral Code <span className="text-muted/70">(optional)</span>
          </label>
          <input
            id="referralCode"
            name="referralCode"
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
          disabled={submitting}
        >
          {submitting ? 'Creating account...' : 'Create Account'}
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
