'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back
        </h1>
        <p className="text-muted text-sm">
          Sign in to access your account and modules.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form
        action="/api/auth/login"
        method="POST"
        onSubmit={() => setSubmitting(true)}
        className="flex-1 flex flex-col gap-4"
      >
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
            autoFocus
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
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
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
