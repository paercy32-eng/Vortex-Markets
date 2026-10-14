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
        className="w-full max-w-sm bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="bg-gradient-to-br from-[#C8833A]/20 to-[#E0A44C]/5 px-5 pt-5 pb-5 text-center border-b border-[#334155]">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C8833A] to-[#E0A44C] mx-auto flex items-center justify-center mb-2 shadow-lg shadow-[#C8833A]/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h2 className="text-[#F8FAFC] font-bold text-lg mb-0.5">
            Welcome, {name}!
          </h2>
          <p className="text-[#94A3B8] text-[11px]">
            You're now part of Vortex Markets.
          </p>
        </div>

        {/* Compact Body */}
        <div className="px-4 py-4">
          {/* Info Grid — 2x2 compact */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <InfoCard
              icon="wallet"
              label="Min Deposit"
              value="10,000"
            />
            <InfoCard
              icon="send"
              label="Min Withdraw"
              value="5,000"
            />
            <InfoCard
              icon="percent"
              label="Withdraw Fee"
              value="15%"
            />
            <InfoCard
              icon="clock"
              label="Cycles"
              value="9 / 35 days"
            />
          </div>

          <button
            onClick={dismiss}
            className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3 rounded-xl active:scale-[0.98] transition text-sm shadow-lg shadow-[#C8833A]/20"
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
  icon: 'wallet' | 'send' | 'percent' | 'clock';
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-2.5 text-center">
      <div className="flex items-center justify-center mb-1">
        {icon === 'wallet' && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E0A44C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        )}
        {icon === 'send' && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E0A44C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
        {icon === 'percent' && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E0A44C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="6.5" cy="6.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
        )}
        {icon === 'clock' && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E0A44C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}
      </div>
      <div className="text-[#94A3B8] text-[9px] uppercase tracking-wide font-semibold mb-0.5">
        {label}
      </div>
      <div className="text-[#E0A44C] font-bold text-xs">{value}</div>
    </div>
  );
        }
