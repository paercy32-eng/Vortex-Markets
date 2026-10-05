'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import BottomNav from '@/components/BottomNav';
import { RefreshIcon } from '@/components/icons';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    // Re-fetch current route to reload client data
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Refreshed');
    }, 600);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between px-5 py-4">
          <h1 className="text-lg font-bold text-white">Vortex Markets</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-full text-muted hover:text-primary transition active:scale-95"
            aria-label="Refresh"
          >
            <RefreshIcon
              className={refreshing ? 'animate-spin-slow' : ''}
            />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 pb-28">
        {children}
      </main>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
