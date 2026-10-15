'use client';

import { useEffect, useState } from 'react';

const TELEGRAM_LINK = 'https://t.me/+XXU8Ig4lhRQyY2U0';
const WHATSAPP_LINK = 'https://whatsapp.com/channel/0029Vb8p4NM90x2r2rzFGN3Y';

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

  // Lock body scroll while modal is open
  useEffect(() => {
    if (show) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [show]);

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
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-sm bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Body */}
        <div className="px-5 py-5">
          {/* Title */}
          <div className="text-center mb-4">
            <h2 className="text-[#F8FAFC] font-bold text-lg mb-0.5">
              Welcome, {name}!
            </h2>
            <p className="text-[#94A3B8] text-[11px]">
              You're now part of Vortex Markets.
            </p>
          </div>

          {/* Info Grid — 2x2 compact */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <InfoCard icon="wallet" label="Min Deposit" value="10,000" />
            <InfoCard icon="send" label="Min Withdraw" value="5,000" />
            <InfoCard icon="percent" label="Withdraw Fee" value="15%" />
            <InfoCard icon="clock" label="Cycles" value="9 / 35 days" />
          </div>

          {/* Okay button */}
          <button
            onClick={dismiss}
            className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3 rounded-xl active:scale-[0.98] transition text-sm shadow-lg shadow-[#C8833A]/20 mb-3"
          >
            Okay
          </button>

          {/* Community buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={TELEGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#229ED9] text-white font-bold py-2.5 rounded-xl active:scale-[0.98] transition text-xs shadow-lg shadow-[#229ED9]/20"
            >
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
              </svg>
              Telegram
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-2.5 rounded-xl active:scale-[0.98] transition text-xs shadow-lg shadow-[#25D366]/20"
            >
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              WhatsApp
            </a>
          </div>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="#E0A44C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        )}
        {icon === 'send' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#E0A44C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
        {icon === 'percent' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#E0A44C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="6.5" cy="6.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
        )}
        {icon === 'clock' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#E0A44C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
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
