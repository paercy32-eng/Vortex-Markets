'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CloseIcon } from '@/components/icons';

export default function AdminGiftCardsPage() {
  const router = useRouter();
  const [value, setValue] = useState('5000');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  async function createCodes(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: Number(value),
          quantity: Number(quantity),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create codes');
      } else {
        toast.success(data.message || 'Codes created successfully');
        setGeneratedCodes(data.codes || []);
        setShowModal(false);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 bg-gray-50 text-gray-900">
      <div className="flex items-center gap-3 mb-4 px-2">
        <Link href="/admin" className="text-gray-500 text-xl">←</Link>
        <h1 className="text-xl font-bold text-gray-900">Gift Cards</h1>
      </div>

      <div className="max-w-md mx-auto">
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition shadow-md mb-6"
        >
          + Create Gift Card
        </button>

        {generatedCodes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Recently Generated Codes:</h2>
            <div className="space-y-2">
              {generatedCodes.map((code, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center font-mono font-bold text-lg text-gray-900 tracking-wider select-all">
                  {code}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              These expire in 5 minutes or when fully claimed.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create Gift Cards</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 p-1">
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={createCodes} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">
                  Total Value (UGX)
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="input-light"
                  placeholder="e.g. 5000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">
                  Quantity (1-100)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-light"
                  min="1"
                  max="100"
                  required
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 leading-relaxed">
                Codes are auto-generated. Each code expires after <strong className="text-gray-900">5 minutes</strong> or when the total value is fully claimed by users (winnings are random between 25 - 700 UGX).
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Generate Codes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
