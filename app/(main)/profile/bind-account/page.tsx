'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ProfileUser {
  id: string;
  name: string;
  phone: string;
  is_bound: boolean;
  bound_phone: string | null;
  bound_full_name: string | null;
}

export default function BindAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/profile?t=' + Date.now(), {
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not load profile');
        setLoading(false);
        return;
      }
      setUser(data.user);
      setEditing(!data.user.is_bound);
      setLoading(false);
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function submit() {
    if (!phone || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }
    if (fullName.trim().length < 3) {
      toast.error('Enter your full registered name');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile/bind?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ phone: phone.trim(), fullName: fullName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not save');
        setSaving(false);
        return;
      }

      toast.success(data.message || 'Account bound successfully');
      setTimeout(() => {
        router.push('/profile');
      }, 900);
    } catch {
      toast.error('Network error');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#E0A44C] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-[#94A3B8] text-sm">Could not load account.</p>
      </div>
    );
  }

  const isBound = user.is_bound;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/profile" className="text-[#94A3B8] text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC]">
            {isBound && !editing ? 'Bound Account' : 'Bind Account'}
          </h1>
          <p className="text-[#94A3B8] text-xs">
            {isBound && !editing
              ? 'Details used for withdrawals'
              : 'Set the account to receive your withdrawals'}
          </p>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-[#1E293B] border border-[#334155] border-l-4 border-l-[#C8833A] rounded-xl px-4 py-3 mb-4">
        <p className="text-[#F8FAFC] font-bold text-xs mb-0.5">
          Important
        </p>
        <p className="text-[#94A3B8] text-[11px] leading-relaxed">
          These details are used for withdrawals. Make sure the name matches
          your registered mobile money name exactly.
        </p>
      </div>

      {isBound && !editing ? (
        <>
          {/* Display current binding */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-4 mb-3">
            <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">
              Full Name
            </p>
            <p className="text-[#F8FAFC] font-medium text-sm">
              {user.bound_full_name || '-'}
            </p>
          </div>

          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-4 mb-4">
            <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-1">
              Mobile Money Number
            </p>
            <p className="text-[#F8FAFC] font-medium text-sm">
              {user.bound_phone || '-'}
            </p>
          </div>

          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-3 mb-4">
            <p className="text-[#94A3B8] text-[10px] leading-relaxed">
              You can only change your bound account when you have no pending
              withdrawal. Changing it will not affect withdrawals already in
              progress.
            </p>
          </div>

          <button
            onClick={() => {
              setPhone(user.bound_phone || '');
              setFullName(user.bound_full_name || '');
              setEditing(true);
            }}
            className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 text-sm"
          >
            Change Bound Account
          </button>
        </>
      ) : (
        <>
          {/* Editable form */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-4 mb-3">
            <label className="block text-[10px] text-[#94A3B8] font-bold mb-2 uppercase tracking-wider">
              Full Registered Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition text-sm"
            />
            <p className="text-[#64748B] text-[10px] mt-2">
              Must match the name on your mobile money account exactly.
            </p>
          </div>

          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-4 mb-4">
            <label className="block text-[10px] text-[#94A3B8] font-bold mb-2 uppercase tracking-wider">
              Mobile Money Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0700123456"
              inputMode="tel"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#C8833A] transition text-sm"
            />
            <p className="text-[#64748B] text-[10px] mt-2">
              This is the number that will receive your withdrawals.
            </p>
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 text-sm disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : isBound
              ? 'Save Changes'
              : 'Bind Account'}
          </button>

          {isBound && (
            <button
              onClick={() => setEditing(false)}
              className="w-full text-[#64748B] text-xs mt-3 py-2"
            >
              Cancel
            </button>
          )}
        </>
      )}
    </div>
  );
      }
