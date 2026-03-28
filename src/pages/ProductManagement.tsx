import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProducts, createProduct, deleteProduct } from '../services/products';
import type { Product } from '../types';

export default function ProductManagement() {
  const { id } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: '', description: '' });

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    fetchProducts(id)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    if (!id || !form.name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await createProduct(id, {
        name: form.name,
        category: form.category || '일반',
        description: form.description,
        campaignPeriod: {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
          status: 'active',
        },
      });
      setShowModal(false);
      setForm({ name: '', category: '', description: '' });
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !deleteTarget) return;
    try {
      await deleteProduct(id, deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch {}
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-zinc-500">상품을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100">상품 관리</h1>
          <p className="text-sm text-zinc-500 mt-1">바이럴 캠페인 대상 상품/서비스를 관리합니다</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + 상품 등록
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {products.length === 0 ? (
          <div className="col-span-full text-center py-16 text-zinc-600">
            등록된 상품이 없습니다. 상품을 등록해 보세요.
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 relative group">
              <button
                onClick={() => setDeleteTarget(p)}
                className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 bg-zinc-800/80 border border-zinc-700/50 transition-all z-10"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">
                  {p.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  p.campaignPeriod.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/50 text-zinc-400'
                }`}>
                  {p.campaignPeriod.status === 'active' ? '진행중' : p.campaignPeriod.status === 'upcoming' ? '예정' : '종료'}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 pr-8">{p.name}</h3>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.description}</p>
              <div className="mt-3 pt-2 border-t border-zinc-800 text-xs text-zinc-600">
                {p.campaignPeriod.startDate} ~ {p.campaignPeriod.endDate}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 sm:p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-zinc-100 mb-4">상품 등록</h2>
            {error && <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-zinc-400">상품명 *</span>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="스프링 모이스처 크림" className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-400">카테고리</span>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="스킨케어, 식품, 패션 등" className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-400">설명</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="상품에 대한 간단한 설명" rows={2}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">취소</button>
              <button onClick={handleCreate} disabled={submitting || !form.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {submitting ? '등록 중...' : '상품 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteTarget(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 sm:p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-100 mb-2">상품 삭제</h3>
            <p className="text-sm text-zinc-300 mb-5">
              <span className="font-semibold text-zinc-100">"{deleteTarget.name}"</span>을(를) 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">취소</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
