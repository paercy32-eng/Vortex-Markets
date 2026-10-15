'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `+256${phone.replace(/^0+/, '')}`,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
      } else {
        router.replace('/modules');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 py-8 overflow-hidden bg-[#0F172A]">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/file_00000000f0908208a260140851fb0990.png)',
        }}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/85 via-[#0F172A]/90 to-[#0F172A]/95" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 px-2 text-center">
          <div className="flex justify-center mb-4">
            <Logo size={48} />
          </div>
          <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">
            Welcome back
          </h1>
          <p className="text-[#94A3B8] text-sm">
            Sign in to access your account and modules.
          </p>
        </div>

        <div className="bg-[#1E293B]/90 backdrop-blur-xl border border-[#334155] rounded-3xl p-6 shadow-2xl">
          <form
            onSubmit={handleSubmit}
            name="login-form"
            autoComplete="on"
            className="space-y-5"
          >
            {/* Phone Number */}
            <div>
              <label
                htmlFor="login-phone"
                className="block text-[10px] text-[#94A3B8] font-bold mb-2 tracking-wider uppercase"
              >
                Phone Number
              </label>
              <div className="flex items-center bg-[#0F172A] border border-[#334155] rounded-xl focus-within:border-[#C8833A] transition overflow-hidden">
                <span className="pl-4 pr-2 text-[#F8FAFC] text-sm font-semibold select-none border-r border-[#334155]">
                  +256
                </span>
                <input
                  id="login-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))
                  }
                  placeholder="700123456"
                  className="w-full bg-transparent px-3 py-3.5 text-[#F8FAFC] placeholder-[#475569] focus:outline-none text-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-[10px] text-[#94A3B8] font-bold mb-2 tracking-wider uppercase"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3.5 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition pr-12 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] p-1"
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-[#F87171] bg-[#450A0A] rounded-xl px-4 py-3 border border-[#7F1D1D]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 text-sm mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#94A3B8]">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-[#E0A44C] font-bold hover:underline"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
                }
