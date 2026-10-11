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
  const [selected, setSelected] = useState<Product | null>(null);

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

  // Sort products by cycle_days ascending
  const sorted = [...products].sort((a, b) => a.cycle_days - b.cycle_days);

  // Color per cycle duration for the badge
  function cycleStyle(days: number) {
    if (days <= 5) return 'bg-gradient-to-r from-[#E5484D] to-[#B91C1C]';
    if (days <= 15) return 'bg-gradient-to-r from-[#C8833A] to-[#8A5A28]';
    if (days <= 25) return 'bg-gradient-to-r from-[#6366F1] to-[#4338CA]';
    return 'bg-gradient-to-r from-[#0EA5E9] to-[#0369A1]';
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#F5F2ED] mb-1">Modules</h1>
        <p className="text-[#8A8580] text-sm">
          Pick a module and start earning daily.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#C8833A] border-t-transparent animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-[#1A1A1F] border border-[#2A2823] rounded-2xl text-center py-12">
          <p className="text-[#8A8580] text-sm">No modules available.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {sorted.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelected(product)}
              className="rounded-3xl overflow-hidden bg-[#1A1A1F] border border-[#2A2823] shadow-lg text-left transition active:scale-[0.98] group relative"
            >
              {/* Image Section */}
              <div className="relative w-full h-44 bg-[#131317]">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[#8A8580] text-xs">No image</span>
                  </div>
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1F] via-[#1A1A1F]/50 to-transparent" />

                {/* Cycle Badge (floating top-right) */}
                <div
                  className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-[11px] font-bold text-white shadow-lg ${cycleStyle(
                    product.cycle_days
                  )}`}
                >
                  {product.cycle_days} Days Cycle
                </div>

                {/* Title overlaid */}
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-[#F5F2ED] font-bold text-xl drop-shadow-md">
                    {product.name}
                  </h3>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {/* Premium Stats Row */}
                <div className="flex items-center justify-between mb-4 bg-[#131317] border border-[#2A2823] rounded-2xl p-3">
                  <div className="flex-1 text-center">
                    <div className="text-[9px] text-[#8A8580] font-bold tracking-wider uppercase mb-1">
                      Daily
                    </div>
                    <div className="text-[13px] font-bold text-[#E0A44C]">
                      {product.daily_return.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-[1px] h-8 bg-[#2A2823]" />
                  <div className="flex-1 text-center">
                    <div className="text-[9px] text-[#8A8580] font-bold tracking-wider uppercase mb-1">
                      Total Return
                    </div>
                    <div className="text-[13px] font-bold text-[#F5F2ED]">
                      {product.total_return.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Price + Buy Button */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[9px] text-[#8A8580] font-bold tracking-wider uppercase mb-0.5">
                      Cost
                    </div>
                    <div className="text-lg font-bold text-[#F5F2ED]">
                      UGX {product.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white text-xs font-bold px-5 py-3 rounded-xl shadow-lg shadow-[#C8833A]/20 transition">
                    Buy Module
                  </div>
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1A1A1F] rounded-t-3xl p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#F5F2ED]">Confirm Purchase</h3>
          <button onClick={onClose} className="text-[#8A8580] p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Cycle Badge */}
        <div
          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white mb-3 ${
            product.cycle_days <= 5
              ? 'bg-gradient-to-r from-[#E5484D] to-[#B91C1C]'
              : product.cycle_days <= 15
              ? 'bg-gradient-to-r from-[#C8833A] to-[#8A5A28]'
              : product.cycle_days <= 25
              ? 'bg-gradient-to-r from-[#6366F1] to-[#4338CA]'
              : 'bg-gradient-to-r from-[#0EA5E9] to-[#0369A1]'
          }`}
        >
          {product.cycle_days} Days Cycle
        </div>

        <div className="bg-[#131317] border border-[#2A2823] rounded-2xl p-4 mb-4">
          <h4 className="text-[#F5F2ED] font-bold text-base mb-3">
            {product.name}
          </h4>
          <div className="flex justify-between py-1.5">
            <span className="text-xs text-[#8A8580]">Cost</span>
            <span className="text-xs font-semibold text-[#F5F2ED]">
              UGX {product.price.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-xs text-[#8A8580]">Cycle</span>
            <span className="text-xs font-semibold text-[#F5F2ED]">
              {product.cycle_days} Days
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-xs text-[#8A8580]">Daily Yield</span>
            <span className="text-xs font-semibold text-[#E0A44C]">
              UGX {product.daily_return.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-t border-[#2A2823] mt-1 pt-2.5">
            <span className="text-xs text-[#8A8580]">Expected Return</span>
            <span className="text-sm font-bold text-[#E0A44C]">
              UGX {product.total_return.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#C8833A] to-[#E0A44C] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#C8833A]/20 disabled:opacity-50"
        >
          {loading
            ? 'Processing...'
            : `Buy Module for ${product.price.toLocaleString()} UGX`}
        </button>
      </div>
    </div>
  );
}
