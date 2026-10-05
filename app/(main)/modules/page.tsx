'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// ==========================================
// TYPES
// ==========================================
interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  created_at: string;
}

// ==========================================
// PAGE
// ==========================================
export default function ModulesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Modules</h1>
        <p className="text-muted text-sm">
          Browse and purchase modules.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted text-sm">No products available yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <button
              key={product.id}
              className="card text-left transition active:scale-[0.98]"
              onClick={() =>
                toast('Product page coming soon')
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base truncate">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-muted text-xs mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-primary font-bold text-sm">
                    {product.price.toLocaleString()} UGX
                  </p>
                  <p className="text-muted text-[10px] mt-1 uppercase">
                    {product.category}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
