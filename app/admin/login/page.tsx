'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// ==========================================
// ADMIN LOGIN PAGE
// ==========================================
export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      toast.success('Welcome, ' + data.admin.name);
      router.replace('/admin');
      router.refresh();
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <div className="mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
          ADMIN
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Admin Sign In
        </h1>
        <p className="text-muted text-sm">
          Restricted access. Authorized personnel only.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        <div>
          <label className="input-label">Username</label>
          <input
            type="text"
            className="input"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
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
      </form>
    </div>
  );
}
