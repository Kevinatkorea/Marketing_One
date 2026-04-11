import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchGuides,
  createGuide,
  updateGuide,
  deleteGuide,
  generateGuide,
  type GenerateGuideResponse,
} from '../services/guides';
import { fetchProducts, createProduct } from '../services/products';
import { fetchProjectInfo } from '../services/projectInfo';
import { downloadGuidePdf } from '../lib/pdfExport';
import type { Guide, Product, ProjectInfo, VerificationRule } from '../types';

const DEFAULT_RULES: VerificationRule[] = [
  { ruleId: 'required_keywords', name: '필수 키워드 포함', weight: 30, isAutoFail: false, config: { keywords: [], minMatch: 1 } },
  { ruleId: 'forbidden_keywords', name: '금지 키워드 미사용', weight: 25, isAutoFail: true, config: { keywords: [] } },
  { ruleId: 'tone_check', name: '톤앤매너 AI 분석', weight: 20, isAutoFail: false, config: { toneGuide: '' } },
  { ruleId: 'content_structure', name: '콘텐츠 구조', weight: 15, isAutoFail: false, config: { requireImages: true, requirePurchaseLink: false, minLength: 500 } },
  { ruleId: 'naver_policy', name: '네이버 광고 정책', weight: 10, isAutoFail: true, config: { policyVersion: '2026-03' } },
];

function extractFormFromGuide(guide: Guide) {
  const reqRule = guide.verificationRules.find((r) => r.ruleId === 'required_keywords');
  const forbRule = guide.verificationRules.find((r) => r.ruleId === 'forbidden_keywords');
  const toneRule = guide.verificationRules.find((r) => r.ruleId === 'tone_check');
  const structRule = guide.verificationRules.find((r) => r.ruleId === 'content_structure');
  return {
    productId: guide.productId,
    version: guide.version,
    customGuidelines: guide.customGuidelines || '',
    requiredKeywords: (Array.isArray(reqRule?.config?.keywords) ? reqRule.config.keywords : []).join(', '),
    forbiddenKeywords: (Array.isArray(forbRule?.config?.keywords) ? forbRule.config.keywords : []).join(', '),
    toneGuide: String(toneRule?.config?.toneGuide || ''),
    minLength: String(structRule?.config?.minLength || 500),
  };
}

export default function GuideManagement() {
  const { id } = useParams();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Guide | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guide | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  // AI 자동 생성 상태
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genProductId, setGenProductId] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [generatedResult, setGeneratedResult] = useState<GenerateGuideResponse | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: '',
    version: '1.0',
    customGuidelines: '',
    requiredKeywords: '',
    forbiddenKeywords: '',
    toneGuide: '',
    minLength: '500',
  });

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchGuides(id), fetchProducts(id), fetchProjectInfo(id).catch(() => null)])
      .then(([g, p, info]) => {
        setGuides(g);
        setProducts(p);
        setProjectInfo(info);
        if (p.length > 0 && !form.productId) setForm((f) => ({ ...f, productId: p[0].id }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const productName = (productId: string) =>
    products.find((p) => p.id === productId)?.name ?? productId;

  const openCreate = () => {
    setEditTarget(null);
    setPdfFile(null);
    setError('');
    setForm({
      productId: products[0]?.id || '',
      version: '1.0',
      customGuidelines: '',
      requiredKeywords: '',
      forbiddenKeywords: '',
      toneGuide: '',
      minLength: '500',
    });
    setShowModal(true);
  };

  const openEdit = (guide: Guide) => {
    setEditTarget(guide);
    setPdfFile(null);
    setError('');
    setForm(extractFormFromGuide(guide));
    setShowModal(true);
  };

  const openGenerateModal = () => {
    setGenError('');
    setGeneratedResult(null);
    setGenNotes('');
    setGenProductId(products[0]?.id ?? '');
    setShowGenerateModal(true);
  };

  const runGenerate = async () => {
    if (!id || !genProductId) return;
    setGenError('');
    setGenerating(true);
    try {
      const res = await generateGuide(id, genProductId, genNotes.trim() || undefined);
      setGeneratedResult(res);
      loadData();
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (guide: Guide) => {
    const product = products.find((p) => p.id === guide.productId);
    if (!product) return;
    setDownloadingPdf(guide.id);
    try {
      await downloadGuidePdf(guide, product);
    } catch (e) {
      console.error('PDF 내보내기 실패:', e);
      alert(`PDF 내보내기 실패: ${(e as Error).message}`);
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDeleteGuide = async () => {
    if (!id || !deleteTarget) return;
    try {
      await deleteGuide(id, deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch {}
  };

  const handleAddProduct = async () => {
    if (!id || !newProductName.trim()) return;
    setAddingProduct(true);
    try {
      const created = await createProduct(id, {
        name: newProductName,
        category: '일반',
        description: '',
        campaignPeriod: { startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0], status: 'active' },
      });
      const updated = await fetchProducts(id);
      setProducts(updated);
      setForm((f) => ({ ...f, productId: created.id }));
      setNewProductName('');
      setShowAddProduct(false);
    } catch {} finally {
      setAddingProduct(false);
    }
  };

  const buildRules = (): VerificationRule[] => {
    const base = editTarget ? editTarget.verificationRules : DEFAULT_RULES;
    return base.map((r) => {
      if (r.ruleId === 'required_keywords') {
        const kw = form.requiredKeywords.split(',').map((k) => k.trim()).filter(Boolean);
        return { ...r, config: { keywords: kw, minMatch: Math.max(1, Math.ceil(kw.length * 0.6)) } };
      }
      if (r.ruleId === 'forbidden_keywords') {
        return { ...r, config: { keywords: form.forbiddenKeywords.split(',').map((k) => k.trim()).filter(Boolean) } };
      }
      if (r.ruleId === 'tone_check') {
        return { ...r, config: { toneGuide: form.toneGuide || '자연스러운 후기 톤, 과장 금지' } };
      }
      if (r.ruleId === 'content_structure') {
        return { ...r, config: { requireImages: true, requirePurchaseLink: false, minLength: parseInt(form.minLength) || 500 } };
      }
      return r;
    });
  };

  const handleSubmit = async () => {
    if (!id || !form.productId) return;
    setSubmitting(true);
    setError('');
    try {
      const rules = buildRules();
      if (editTarget) {
        await updateGuide(id, editTarget.id, {
          productId: form.productId,
          version: form.version,
          verificationRules: rules,
          customGuidelines: form.customGuidelines,
        });
      } else {
        await createGuide(id, {
          productId: form.productId,
          version: form.version,
          verificationRules: rules,
          customGuidelines: form.customGuidelines,
          isTemplate: false,
        }, pdfFile || undefined);
      }
      setShowModal(false);
      setPdfFile(null);
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100">가이드 관리</h1>
          <p className="text-sm text-zinc-500 mt-1">바이럴 검증 가이드를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openGenerateModal}
            disabled={!projectInfo || products.length === 0}
            title={!projectInfo ? "먼저 '프로젝트정보' 탭에서 정보를 입력하세요" : ''}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <span>🤖</span>
            AI 자동 생성
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + 가이드 등록
          </button>
        </div>
      </div>

      {!projectInfo && (
        <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          AI 자동 생성을 사용하려면 먼저 <span className="font-semibold">프로젝트정보</span> 탭에서 카테고리·경쟁사·자사 설명을 입력해주세요.
        </div>
      )}

      {/* Guide List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-3 sm:px-5 text-zinc-500 font-medium">가이드명</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium hidden sm:table-cell">상품</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium hidden md:table-cell">버전</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium">규칙</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium">상태</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium hidden sm:table-cell">수정일</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {guides.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-600">
                    등록된 가이드가 없습니다. 가이드를 등록해 보세요.
                  </td>
                </tr>
              ) : (
                guides.map((guide) => (
                  <tr
                    key={guide.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3 px-3 sm:px-5 text-zinc-200 font-medium max-w-[140px] sm:max-w-none truncate">
                      <span className="flex items-center gap-1.5">
                        {guide.pdfFileName && <span className="text-red-400 shrink-0" title={guide.pdfFileName}>📄</span>}
                        {guide.customGuidelines || guide.id}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-zinc-400 hidden sm:table-cell">{productName(guide.productId)}</td>
                    <td className="py-3 px-2 sm:px-4 text-zinc-400 hidden md:table-cell">v{guide.version}</td>
                    <td className="py-3 px-2 sm:px-4 text-zinc-400">
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
                    <td className="py-3 px-2 sm:px-4 text-zinc-500 hidden sm:table-cell">
                      {new Date(guide.updatedAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadPdf(guide)}
                          disabled={downloadingPdf === guide.id}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40"
                          title="PDF 다운로드"
                        >
                          {downloadingPdf === guide.id ? (
                            <svg width="12" height="12" viewBox="0 0 16 16" className="animate-spin">
                              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="28" strokeDashoffset="14" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 13h12" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(guide)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                          title="수정"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11.5 1.5l3 3L5 14H2v-3z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(guide)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="삭제"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M4 4l8 8M12 4l-8 8" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 sm:p-6 w-full max-w-lg mx-3 sm:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-zinc-100 mb-4">{editTarget ? '가이드 수정' : '가이드 등록'}</h2>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="block">
                  <span className="text-sm text-zinc-400">상품 선택 *</span>
                  {showAddProduct ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="새 상품명 입력"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddProduct(); if (e.key === 'Escape') setShowAddProduct(false); }}
                      />
                      <button
                        onClick={handleAddProduct}
                        disabled={addingProduct || !newProductName.trim()}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg shrink-0"
                      >
                        {addingProduct ? '...' : '추가'}
                      </button>
                      <button onClick={() => setShowAddProduct(false)} className="px-2 py-2 text-zinc-500 hover:text-zinc-300 text-xs">취소</button>
                    </div>
                  ) : (
                    <div className="mt-1 flex gap-2">
                      <select
                        value={form.productId}
                        onChange={(e) => setForm({ ...form, productId: e.target.value })}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {products.length === 0 && <option value="">상품 없음 — 먼저 추가하세요</option>}
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowAddProduct(true)}
                        className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium rounded-lg shrink-0"
                        title="새 상품 추가"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
                <label className="block">
                  <span className="text-sm text-zinc-400">버전</span>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-zinc-400">필수 키워드 (쉼표 구분)</span>
                <input
                  type="text"
                  value={form.requiredKeywords}
                  onChange={(e) => setForm({ ...form, requiredKeywords: e.target.value })}
                  placeholder="수분크림, 봄 한정, 촉촉"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-400">금지 키워드 (쉼표 구분)</span>
                <input
                  type="text"
                  value={form.forbiddenKeywords}
                  onChange={(e) => setForm({ ...form, forbiddenKeywords: e.target.value })}
                  placeholder="최저가, 할인, 1+1"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-400">톤앤매너 가이드</span>
                <input
                  type="text"
                  value={form.toneGuide}
                  onChange={(e) => setForm({ ...form, toneGuide: e.target.value })}
                  placeholder="자연스러운 후기 톤, 과장 금지"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-400">최소 글자수</span>
                <input
                  type="number"
                  value={form.minLength}
                  onChange={(e) => setForm({ ...form, minLength: e.target.value })}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              {/* PDF Upload — 신규 등록시만 */}
              {!editTarget && (
                <div className="block">
                  <span className="text-sm text-zinc-400">가이드 PDF 업로드</span>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  />
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    className="mt-1 border border-dashed border-zinc-700 rounded-lg p-4 sm:p-6 text-center cursor-pointer hover:border-zinc-500 transition-colors"
                  >
                    {pdfFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-red-400 text-lg">📄</span>
                        <div className="text-left">
                          <p className="text-sm text-blue-400 font-medium truncate max-w-[200px]">{pdfFile.name}</p>
                          <p className="text-xs text-zinc-500">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; }}
                          className="ml-2 text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-zinc-400">블로거에게 전달하는 가이드 PDF를 업로드하세요</p>
                        <p className="text-xs text-zinc-600 mt-1">AI가 내용을 분석하여 바이럴 검증 시 비교합니다</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              {editTarget?.pdfFileName && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-red-400">📄</span>
                  <span>첨부 PDF: {editTarget.pdfFileName}</span>
                </div>
              )}

              <label className="block">
                <span className="text-sm text-zinc-400">기타 가이드라인</span>
                <textarea
                  value={form.customGuidelines}
                  onChange={(e) => setForm({ ...form, customGuidelines: e.target.value })}
                  placeholder="개인 경험 위주로 작성, 비교 제품 언급 자제"
                  rows={2}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.productId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? '저장 중...' : editTarget ? '수정 완료' : '가이드 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 자동 생성 Modal */}
      {showGenerateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
          onClick={() => !generating && setShowGenerateModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-100">🤖 AI 가이드 자동 생성</h2>
              <button
                onClick={() => !generating && setShowGenerateModal(false)}
                disabled={generating}
                className="text-zinc-500 hover:text-zinc-300 text-xl"
              >
                ✕
              </button>
            </div>

            {genError && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {genError}
              </div>
            )}

            {!generatedResult ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  프로젝트정보(카테고리·경쟁사·자사 설명)를 기반으로 블로그 바이럴 가이드를 자동 생성합니다.
                </p>

                <label className="block">
                  <span className="text-sm text-zinc-400">제품 선택 *</span>
                  <select
                    value={genProductId}
                    onChange={(e) => setGenProductId(e.target.value)}
                    disabled={generating}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {products.length === 0 && <option value="">상품 없음 — 먼저 추가하세요</option>}
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-zinc-400">추가 요청사항 (선택)</span>
                  <textarea
                    value={genNotes}
                    onChange={(e) => setGenNotes(e.target.value)}
                    disabled={generating}
                    rows={3}
                    placeholder="이번 가이드에만 강조할 포인트를 적으세요"
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                  />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    disabled={generating}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    취소
                  </button>
                  <button
                    onClick={runGenerate}
                    disabled={generating || !genProductId}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    {generating ? 'AI 생성 중... (3~8초)' : '생성 시작'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  ✓ 가이드가 생성되어 목록에 저장되었습니다.
                </div>

                <div>
                  <h3 className="text-base font-bold text-zinc-100">{generatedResult.preview.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{generatedResult.preview.summary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-800/50 border border-zinc-700/50 rounded p-3">
                    <div className="text-zinc-500 mb-1">타깃 독자</div>
                    <div className="text-zinc-200">{generatedResult.preview.targetAudience}</div>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700/50 rounded p-3">
                    <div className="text-zinc-500 mb-1">톤앤매너</div>
                    <div className="text-zinc-200">{generatedResult.preview.toneAndManner}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-500 mb-1">필수 키워드 ({generatedResult.preview.minRequiredKeywordMatch}개 이상)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedResult.preview.requiredKeywords.map((kw) => (
                      <span key={kw} className="text-xs bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full">{kw}</span>
                    ))}
                  </div>
                </div>

                {generatedResult.preview.forbiddenKeywords.length > 0 && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">금지 키워드</div>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedResult.preview.forbiddenKeywords.map((kw) => (
                        <span key={kw} className="text-xs bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-zinc-500 mb-1">블로그 구성</div>
                  <ul className="text-xs text-zinc-300 space-y-0.5 list-disc ml-4">
                    {generatedResult.preview.blogStructure.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>

                <div>
                  <div className="text-xs text-zinc-500 mb-1">경쟁사 차별화</div>
                  <p className="text-xs text-zinc-300">{generatedResult.preview.competitorDifferentiation}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-emerald-400 mb-1">Do</div>
                    <ul className="text-xs text-zinc-300 space-y-0.5 list-disc ml-4">
                      {generatedResult.preview.doList.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-red-400 mb-1">Don't</div>
                    <ul className="text-xs text-zinc-300 space-y-0.5 list-disc ml-4">
                      {generatedResult.preview.dontList.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => { setGeneratedResult(null); setGenNotes(''); }}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    다시 생성
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(generatedResult.guide)}
                    disabled={downloadingPdf === generatedResult.guide.id}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    {downloadingPdf === generatedResult.guide.id ? 'PDF 생성 중...' : 'PDF 다운로드'}
                  </button>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg"
                  >
                    완료
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteTarget(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 sm:p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-100 mb-2">가이드 삭제</h3>
            <p className="text-sm text-zinc-300 mb-5">
              <span className="font-semibold text-zinc-100">"{deleteTarget.customGuidelines || deleteTarget.id}"</span> 가이드를 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">취소</button>
              <button onClick={handleDeleteGuide} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
