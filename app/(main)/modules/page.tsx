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
        <div className="flex flex-col gap-3">
          {filtered.map((product) => (
            <button
              key={product.id}
              className="card text-left transition active:scale-[0.98]"
              onClick={() => setSelected(product)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-white font-semibold text-base flex-1 min-w-0">
                  {product.name}
                </h3>
                <span className="pill-primary shrink-0">
                  {product.cycle_days} Days
                </span>
              </div>

              <div className="row">
                <span className="row-label">Price</span>
                <span className="row-value">
                  {product.price.toLocaleString()} UGX
                </span>
              </div>
              <div className="row">
                <span className="row-label">Daily Return</span>
                <span className="row-value text-primary">
                  {product.daily_return.toLocaleString()} UGX
                </span>
              </div>
              <div className="row">
                <span className="row-label">Total Return</span>
                <span className="row-value text-success">
                  {product.total_return.toLocaleString()} UGX
                </span>
              </div>
            </button>
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
          <div className="row">
            <span className="row-label">Price</span>
            <span className="row-value">
              {product.price.toLocaleString()} UGX
            </span>
          </div>
          <div className="row">
            <span className="row-label">Cycle</span>
            <span className="row-value">{product.cycle_days} Days</span>
          </div>
          <div className="row">
            <span className="row-label">Daily Return</span>
            <span className="row-value text-primary">
              {product.daily_return.toLocaleString()} UGX
            </span>
          </div>
          <div className="row">
            <span className="row-label">Total Return</span>
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
