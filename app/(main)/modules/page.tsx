'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CloseIcon } from '@/components/icons';

// ==========================================
// TYPES
// ==========================================
interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  cycle_days: number;
  daily_return: number;
  total_return: number;
  group_label: string | null;
  created_at: string;
}

// ==========================================
// PAGE
// ==========================================
export default function ModulesPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<number>(15);
  const [selected, setSelected] = useState<Product | null>(null);

  const GROUPS = [
    { days: 15, label: '15 Days' },
    { days: 25, label: '25 Days' },
    { days: 45, label: '45 Days' },
  ];

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/products?t=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not load products');
        setLoading(false);
        return;
      }

      setProducts(data.products || []);
      setLoading(false);
    } catch (err) {
      toast.error('Network error');
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = products.filter((p) => p.cycle_days === activeGroup);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Modules</h1>
        <p className="text-muted text-sm">
          Pick a module and start earning daily.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {GROUPS.map((g) => {
          const isActive = activeGroup === g.days;
          return (
            <button
              key={g.days}
              onClick={() => setActiveGroup(g.days)}
              className={`py-2.5 rounded-full text-xs font-semibold transition ${
                isActive
                  ? 'bg-primary text-black'
                  : 'bg-card border border-border text-muted'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted text-sm">No products in this group.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((product) => (
            /* NEW CARD LAYOUT MATCHING THE IMAGE */
            <div
              key={product.id}
              className="relative w-full rounded-2xl overflow-hidden shadow-lg transition transform active:scale-[0.98] cursor-pointer group"
              onClick={() => setSelected(product)}
            >
              {/* Background Image */}
              {/* Replace this URL with your actual dynamic product image if available */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: 'url("https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80")',
                }}
              ></div>

              {/* Gradient Overlay (Darkens the right side for text readability) */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/60 to-black/80"></div>

              {/* Content Container */}
              <div className="relative z-10 p-5 flex flex-col h-full">
                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-5">
                  {product.name}
                </h3>

                {/* Stats Grid (2x2) */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6">
                  <div>
                    <p className="text-gray-400 text-xs font-medium mb-1">Cost</p>
                    <p className="text-white font-bold text-lg">
                      UGX {product.price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium mb-1">Term</p>
                    <p className="text-white font-bold text-lg">
                      {product.cycle_days} Days
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium mb-1">Daily Yield</p>
                    <p className="text-white font-bold text-lg">
                      UGX {product.daily_return.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium mb-1">Expected Return</p>
                    <p className="text-white font-bold text-lg">
                      UGX {product.total_return.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Buy Button */}
                <button className="mt-auto w-full bg-[#e52b2b] hover:bg-[#c42222] text-white font-semibold py-3.5 px-4 rounded-xl transition duration-200">
                  Buy Asset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase modal */}
      {selected && (
        <PurchaseModal
          product={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            setSelected(null);
            toast.success('Module purchased!');
            router.push('/my-modules');
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// PURCHASE MODAL
// ==========================================
function PurchaseModal({
  product,
  onClose,
  onSuccess,
}: {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch('/api/purchase?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Purchase failed');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="modal-title mb-0">Confirm Purchase</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="card-flat mb-4">
          <h4 className="text-white font-semibold text-lg mb-3">
            {product.name}
          </h4>
          {/* UPDATED LABELS TO MATCH THE NEW CARD LAYOUT */}
          <div className="row">
            <span className="row-label">Cost</span>
            <span className="row-value">
              {product.price.toLocaleString()} UGX
            </span>
          </div>
          <div className="row">
            <span className="row-label">Term</span>
            <span className="row-value">{product.cycle_days} Days</span>
          </div>
          <div className="row">
            <span className="row-label">Daily Yield</span>
            <span className="row-value text-primary">
              {product.daily_return.toLocaleString()} UGX
            </span>
          </div>
          <div className="row">
            <span className="row-label">Expected Return</span>
            <span className="row-value text-success">
              {product.total_return.toLocaleString()} UGX
            </span>
          </div>
        </div>

        <div className="modal-note mb-4">
          {product.price.toLocaleString()} UGX will be deducted from your
          balance. Daily returns are credited at 00:30 EAT for{' '}
          {product.cycle_days} days.
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading
            ? 'Processing...'
            : `Buy for ${product.price.toLocaleString()} UGX`}
        </button>
      </div>
    </div>
  );
          }
