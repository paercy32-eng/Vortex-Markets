'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RefreshIcon, CloseIcon } from '@/components/icons';

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
  image_url: string | null;
  created_at: string;
}

// ==========================================
// PAGE
// ==========================================
export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/admin/products?t=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        toast.error(data.error || 'Could not load products');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setProducts(data.products || []);
      setLoading(false);
      setRefreshing(false);
    } catch {
      toast.error('Network error');
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-4">
          <div>
            <Link
              href="/admin"
              className="text-muted text-xs hover:text-primary"
            >
              ← Dashboard
            </Link>
            <h1 className="text-lg font-bold text-white leading-tight">
              Products
            </h1>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-2 rounded-full text-muted hover:text-primary transition active:scale-95"
            aria-label="Refresh"
          >
            <RefreshIcon className={refreshing ? 'animate-spin-slow' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-5 py-5 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
          </div>
        ) : products.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted text-sm">No products found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setEditing(p)}
                className="card text-left transition active:scale-[0.98]"
              >
                <div className="flex items-start gap-3 mb-3">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-muted text-[10px]">No img</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {p.name}
                    </p>
                    <p className="text-muted text-xs mt-0.5">
                      {p.cycle_days} Days · {p.group_label || '—'}
                    </p>
                  </div>

                  <span className="pill-primary shrink-0">
                    {p.price.toLocaleString()}
                  </span>
                </div>

                <div className="row">
                  <span className="row-label">Daily Return</span>
                  <span className="row-value text-primary text-sm">
                    {p.daily_return.toLocaleString()} UGX
                  </span>
                </div>
                <div className="row">
                  <span className="row-label">Total Return</span>
                  <span className="row-value text-success text-sm">
                    {p.total_return.toLocaleString()} UGX
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {editing && (
        <EditProductModal
          product={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            load(true);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// EDIT PRODUCT MODAL
// ==========================================
function EditProductModal({
  product,
  onClose,
  onSuccess,
}: {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [price, setPrice] = useState(String(product.price));
  const [cycleDays, setCycleDays] = useState(String(product.cycle_days));
  const [dailyReturn, setDailyReturn] = useState(
    String(product.daily_return)
  );
  const [groupLabel, setGroupLabel] = useState(product.group_label || '');
  const [imageUrl, setImageUrl] = useState(product.image_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side check
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', product.id);

      const res = await fetch(
        '/api/admin/products/upload?t=' + Date.now(),
        {
          method: 'POST',
          body: formData,
          cache: 'no-store',
        }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
        setUploading(false);
        return;
      }

      setImageUrl(data.image_url);
      toast.success('Image uploaded');
      setUploading(false);
    } catch {
      toast.error('Network error');
      setUploading(false);
    }
  }

  async function save() {
    // Basic validation
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!Number(price) || Number(price) < 0) {
      toast.error('Enter a valid price');
      return;
    }
    if (!Number(cycleDays) || Number(cycleDays) <= 0) {
      toast.error('Enter a valid cycle');
      return;
    }
    if (!Number(dailyReturn) || Number(dailyReturn) < 0) {
      toast.error('Enter a valid daily return');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/products/${product.id}?t=` + Date.now(),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            price: Number(price),
            cycle_days: Number(cycleDays),
            daily_return: Number(dailyReturn),
            group_label: groupLabel.trim(),
            image_url: imageUrl,
          }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Save failed');
        setSaving(false);
        return;
      }

      toast.success('Product updated');
      onSuccess();
    } catch {
      toast.error('Network error');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="modal-title mb-0">Edit Product</h3>
          <button onClick={onClose} className="text-muted p-1">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Image upload */}
        <label className="input-label">Product Image</label>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-20 h-20 rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-muted text-[10px]">No image</span>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-3 rounded-full bg-primary/10 text-primary text-xs font-semibold active:scale-95 transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : imageUrl ? 'Change Image' : 'Upload Image'}
            </button>
            {imageUrl && (
              <button
                onClick={() => setImageUrl('')}
                className="w-full py-2 text-danger text-[11px] mt-1"
              >
                Remove image
              </button>
            )}
          </div>
        </div>

        {/* Name */}
        <label className="input-label">Name</label>
        <input
          type="text"
          className="input mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Description */}
        <label className="input-label">Description</label>
        <textarea
          className="input mb-4"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />

        {/* Price + Cycle */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="input-label">Price (UGX)</label>
            <input
              type="number"
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Cycle (days)</label>
            <input
              type="number"
              className="input"
              value={cycleDays}
              onChange={(e) => setCycleDays(e.target.value)}
            />
          </div>
        </div>

        {/* Daily Return + Group Label */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="input-label">Daily Return (UGX)</label>
            <input
              type="number"
              className="input"
              value={dailyReturn}
              onChange={(e) => setDailyReturn(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Group Label</label>
            <input
              type="text"
              className="input"
              value={groupLabel}
              onChange={(e) => setGroupLabel(e.target.value)}
              placeholder="e.g. 15 Days"
            />
          </div>
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving || uploading}
          className="btn-primary w-full"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
