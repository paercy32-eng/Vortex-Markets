'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prefill referral code from URL (?ref=XXXXX)
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          password,
          confirmPassword,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
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
      {/* Decorative Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-[#C8833A] rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-[#0EA5E9] rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-6 px-2 text-center">
          <div className="flex justify-center mb-3">
            <Logo size={40} />
          </div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">Create account</h1>
          <p className="text-[#94A3B8] text-xs">Join Vortex Markets and start accessing our modules.</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Phone Number */}
            <div>
              <label className="block text-[10px] text-[#94A3B8] font-bold mb-1.5 tracking-wider uppercase">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0700123456"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3.5 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition text-sm"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] text-[#94A3B8] font-bold mb-1.5 tracking-wider uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3.5 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition pr-14 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[10px] font-semibold"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] text-[#94A3B8] font-bold mb-1.5 tracking-wider uppercase">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3.5 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition text-sm"
                required
              />
            </div>

            {/* Referral Code */}
            <div>
              <label className="block text-[10px] text-[#94A3B8] font-bold mb-1.5 tracking-wider uppercase">
                Referral Code <span className="text-[#475569] lowercase font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="VRTX-XXXXX"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3.5 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition text-sm"
              />
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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[#94A3B8]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#E0A44C] font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="w-8 h-8 rounded-full border-2 border-[#C8833A] border-t-transparent animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
        }
