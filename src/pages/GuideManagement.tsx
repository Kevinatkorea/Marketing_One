import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchGuides } from '../services/guides';
import { fetchProducts } from '../services/products';
import type { Guide, Product } from '../types';

export default function GuideManagement() {
  const { id } = useParams();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchGuides(id), fetchProducts(id)])
      .then(([g, p]) => {
        setGuides(g);
        setProducts(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const productName = (productId: string) =>
    products.find((p) => p.id === productId)?.name ?? productId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        가이드를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">가이드 관리</h1>
          <p className="text-sm text-zinc-500 mt-1">바이럴 검증 가이드를 관리합니다</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
          + 가이드 등록
        </button>
      </div>

      {/* Guide List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-5 text-zinc-500 font-medium">가이드명</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">상품</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">버전</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">검증 규칙</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">상태</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">수정일</th>
              </tr>
            </thead>
            <tbody>
              {guides.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600">
                    등록된 가이드가 없습니다.
                  </td>
                </tr>
              ) : (
                guides.map((guide) => (
                  <tr
                    key={guide.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3 px-5 text-zinc-200 font-medium">
                      {guide.customGuidelines || guide.id}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{productName(guide.productId)}</td>
                    <td className="py-3 px-4 text-zinc-400">v{guide.version}</td>
                    <td className="py-3 px-4 text-zinc-400">
                      {guide.verificationRules.length}개
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          guide.isTemplate
                            ? 'bg-zinc-700/50 text-zinc-400'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {guide.isTemplate ? '템플릿' : '활성'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {new Date(guide.updatedAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
