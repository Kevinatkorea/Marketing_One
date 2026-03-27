import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { bulkTextRegister, bulkExcelRegister, downloadTemplate, type BulkExcelResult } from '../services/virals';
import { fetchGuides } from '../services/guides';
import { fetchProducts } from '../services/products';
import type { Guide, Product } from '../types';

type TabKey = 'paste' | 'excel';

export default function BulkRegistration() {
  const { id } = useParams();
  const location = useLocation();
  const isBulk = location.pathname.endsWith('/bulk');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('paste');
  const [text, setText] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedGuide, setSelectedGuide] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ count: number; batchId: string } | null>(null);
  const [excelResult, setExcelResult] = useState<BulkExcelResult | null>(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchProducts(id), fetchGuides(id)])
      .then(([p, g]) => {
        setProducts(p);
        setGuides(g);
        if (p.length > 0) setSelectedProduct(p[0].id);
        if (g.length > 0) setSelectedGuide(g[0].id);
      })
      .catch(() => {});
  }, [id]);

  const handleTextSubmit = async () => {
    if (!id || !text.trim() || !selectedProduct || !selectedGuide) return;
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await bulkTextRegister(id, {
        productId: selectedProduct,
        guideId: selectedGuide,
        text,
      });
      setResult({ count: res.count, batchId: res.batchId });
      setText('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelSubmit = async () => {
    if (!id || !selectedFile || !selectedProduct || !selectedGuide) return;
    setSubmitting(true);
    setError('');
    setExcelResult(null);
    try {
      const res = await bulkExcelRegister(id, selectedFile, selectedProduct, selectedGuide);
      setExcelResult(res);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">
          {isBulk ? '바이럴 일괄 등록' : '바이럴 등록'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isBulk
            ? '여러 바이럴 URL을 한 번에 등록합니다'
            : '바이럴 URL을 등록합니다'}
        </p>
      </div>

      {/* Product / Guide Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">상품 선택</span>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {products.length === 0 && <option value="">상품 없음</option>}
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">가이드 선택</span>
          <select
            value={selectedGuide}
            onChange={(e) => setSelectedGuide(e.target.value)}
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {guides.length === 0 && <option value="">가이드 없음</option>}
            {guides.map((g) => (
              <option key={g.id} value={g.id}>v{g.version} - {g.customGuidelines || g.id}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('paste')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'paste'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          텍스트 붙여넣기
        </button>
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'excel'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          엑셀 업로드
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
        {activeTab === 'paste' ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">
                바이럴 텍스트 (카페명 / 제목 / URL)
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="mt-2 w-full h-32 sm:h-48 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder={
                  '서초맘모여라\n나이드니까 옷핏이 별루에요\nhttps://cafe.naver.com/cafeseochomoms/112637\n\n행복한여왕\n뒷모습 더 스트레스면 뭐부터 해야 하나요\nhttps://cafe.naver.com/playtomato/1277393'
                }
              />
            </label>

            {result && (
              <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
                {result.count}건 등록 완료 (배치: {result.batchId})
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleTextSubmit}
                disabled={submitting || !text.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? '등록 중...' : '등록하기'}
              </button>
              <span className="text-xs text-zinc-500">
                3줄 반복(카페명/제목/URL), 파이프(|) 구분, 탭 구분 형식 지원
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-zinc-700 rounded-lg p-6 sm:p-12 text-center hover:border-zinc-600 transition-colors cursor-pointer"
            >
              {selectedFile ? (
                <>
                  <div className="text-3xl mb-3">📄</div>
                  <p className="text-sm text-blue-400 font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-3">📁</div>
                  <p className="text-sm text-zinc-400">
                    엑셀 파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-xs text-zinc-600 mt-2">
                    .xlsx, .xls, .csv 형식 지원
                  </p>
                </>
              )}
            </div>

            {excelResult && (
              <div className="text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                <p className="text-emerald-400 font-medium">{excelResult.message}</p>
                <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                  <span>성공: {excelResult.summary.success}건</span>
                  <span>중복: {excelResult.summary.duplicate}건</span>
                  <span>오류: {excelResult.summary.error}건</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleExcelSubmit}
                disabled={submitting || !selectedFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? '업로드 중...' : '업로드 & 등록'}
              </button>
              <a
                href={id ? downloadTemplate(id) : '#'}
                className="px-4 py-2 bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-600 transition-colors"
              >
                템플릿 다운로드
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
