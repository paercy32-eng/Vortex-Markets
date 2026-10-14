'use client';

import { useEffect, useState } from 'react';

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/profile?t=' + Date.now(), {
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data.user) return;

        const userKey = `welcome_seen_${data.user.id}`;
        const seen = localStorage.getItem(userKey);

        if (!seen) {
          setName(data.user.name || 'there');
          setShow(true);
        }
      } catch {}
    }
    // Small delay so the page settles first
    const timer = setTimeout(check, 800);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    // Remember that this user has seen the welcome
    fetch('/api/profile?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.id) {
          localStorage.setItem(`welcome_seen_${data.user.id}`, 'true');
        }
      })
      .catch(() => {});
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="bg-gradient-to-br from-red-600 to-red-800 px-6 pt-8 pb-10 text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-3">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-white font-bold text-2xl mb-1">
            Welcome, {name}!
          </h2>
          <p className="text-white/80 text-sm">
            You're now part of Vortex Markets.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-5">
            <p className="text-gray-600 text-sm text-center leading-relaxed">
              Your journey to smart earning starts here. Take a moment to
              review the key details below, then start investing in your
              first module.
            </p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoCard
              icon="💰"
              label="Minimum Deposit"
              value="UGX 10,000"
              accent="text-red-600"
            />
            <InfoCard
              icon="📤"
              label="Minimum Withdraw"
              value="UGX 5,000"
              accent="text-red-600"
            />
            <InfoCard
              icon="📊"
              label="Withdraw Fee"
              value="15%"
              accent="text-red-600"
            />
            <InfoCard
              icon="⏱️"
              label="Product Cycles"
              value="9 or 35 days"
              accent="text-red-600"
            />
          </div>

          {/* Button */}
          <button
            onClick={dismiss}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition shadow-lg shadow-red-900/20"
          >
            Let's Get Started
          </button>

          <p className="text-gray-400 text-[10px] text-center mt-3">
            You can review these details anytime in your Profile.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1">
        {label}
      </div>
      <div className={`${accent} font-bold text-sm`}>{value}</div>
    </div>
  );
}
