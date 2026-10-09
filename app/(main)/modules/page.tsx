'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CloseIcon } from '@/components/icons';

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
  image_url: string | null;
  created_at: string;
}

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
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground mb-1">Modules</h1>
        <p className="text-muted text-sm">
          Pick a module and start earning daily.
        </p>
      </div>

      {/* Group tabs */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {GROUPS.map((g) => {
          const isActive = activeGroup === g.days;
          return (
            <button
              key={g.days}
              onClick={() => setActiveGroup(g.days)}
              className={`py-2.5 rounded-full text-xs font-semibold transition ${
                isActive
                  ? 'bg-primary text-[#FFFFFF]'
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
          <p className="text-muted text-sm">No modules in this group.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelected(product)}
              className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm text-left transition active:scale-[0.98] group relative"
            >
              {/* Image */}
              <div className="relative w-full h-40 bg-gray-100">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted text-xs">No image</span>
                  </div>
                )}
                {/* Dark gradient overlay for better text readability on image */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {/* Title overlaid on image */}
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-white font-bold text-xl drop-shadow-md">
                    {product.name}
                  </h3>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {/* 2x2 Grid matching the layout */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-5">
                  <div>
                    <p className="text-muted text-[11px] uppercase tracking-wide mb-0.5">
                      Cost
                    </p>
                    <p className="text-foreground font-bold text-sm">
                      UGX {product.price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px] uppercase tracking-wide mb-0.5">
                      Term
                    </p>
                    <p className="text-foreground font-bold text-sm">
                      {product.cycle_days} Days
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px] uppercase tracking-wide mb-0.5">
                      Daily Yield
                    </p>
                    <p className="text-foreground font-bold text-sm">
                      UGX {product.daily_return.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px] uppercase tracking-wide mb-0.5">
                      Expected Return
                    </p>
                    <p className="text-foreground font-bold text-sm">
                      UGX {product.total_return.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Red Buy Module Button */}
                <div className="w-full py-3.5 rounded-xl bg-[#e52b2b] hover:bg-[#c42222] text-white text-center text-sm font-semibold transition-colors">
                  Buy Module
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <PurchaseModal
          product={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            setSelected(null);
            toast.success('Module purchased successfully!');
            router.push('/my-modules');
          }}
        />
      )}
    </div>
  );
}

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
        // The backend will reject the purchase if the user
        // does not have an approved deposit for their first purchase.
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
          <h4 className="text-foreground font-semibold text-base mb-3">
            {product.name}
          </h4>
          <div className="row">
            <span className="row-label">Cost</span>
            <span className="row-value">
              UGX {product.price.toLocaleString()}
            </span>
          </div>
          <div className="row">
            <span className="row-label">Term</span>
            <span className="row-value">{product.cycle_days} Days</span>
          </div>
          <div className="row">
            <span className="row-label">Daily Yield</span>
            <span className="row-value text-primary">
              UGX {product.daily_return.toLocaleString()}
            </span>
          </div>
          <div className="row">
            <span className="row-label">Expected Return</span>
            <span className="row-value text-primary">
              UGX {product.total_return.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading
            ? 'Processing...'
            : `Buy Module for ${product.price.toLocaleString()} UGX`}
        </button>
      </div>
    </div>
  );
}
