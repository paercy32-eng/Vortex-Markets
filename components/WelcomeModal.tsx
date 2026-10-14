'use client';

import { useEffect, useState } from 'react';

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

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

        setUserId(data.user.id);

        if (!seen) {
          setName(data.user.name || 'there');
          setShow(true);
        }
      } catch {}
    }
    const timer = setTimeout(check, 800);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    if (userId) {
      localStorage.setItem(`welcome_seen_${userId}`, 'true');
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Banner */}
        <div className="bg-gradient-to-br from-red-600 to-red-800 px-5 pt-5 pb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-2">
            <span className="text-xl">🎉</span>
          </div>
          <h2 className="text-white font-bold text-lg mb-0.5">
            Welcome, {name}!
          </h2>
          <p className="text-white/80 text-[11px]">
            You're now part of Vortex Markets.
          </p>
        </div>

        {/* Compact Body */}
        <div className="px-4 py-4">
          {/* Info Grid — 2x2 compact */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <InfoCard icon="💰" label="Min Deposit" value="10,000" />
            <InfoCard icon="📤" label="Min Withdraw" value="5,000" />
            <InfoCard icon="📊" label="Withdraw Fee" value="15%" />
            <InfoCard icon="⏱️" label="Cycles" value="9 / 35 days" />
          </div>

          <button
            onClick={dismiss}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 rounded-xl active:scale-[0.98] transition text-sm shadow-lg shadow-red-900/20"
          >
            Let's Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center">
      <div className="text-base mb-0.5">{icon}</div>
      <div className="text-gray-500 text-[9px] uppercase tracking-wide font-semibold mb-0.5">
        {label}
      </div>
      <div className="text-red-600 font-bold text-xs">{value}</div>
    </div>
  );
}
