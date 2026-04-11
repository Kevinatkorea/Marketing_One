import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { ProjectInfo, Competitor } from '../types';
import { fetchProjectInfo, saveProjectInfo, type ProjectInfoInput } from '../services/projectInfo';

const CATEGORY_L1_OPTIONS = [
  '자동차', '뷰티', '식품', '패션', 'IT/가전', '교육', '금융', '의료/건강', '여행/레저', '생활/리빙', '기타',
];

const EMPTY_COMPETITOR: Competitor = { name: '', keywords: [] };

function toInput(info: ProjectInfo | null): ProjectInfoInput {
  return {
    categoryL1: info?.categoryL1 ?? '',
    categoryL2: info?.categoryL2 ?? '',
    ownDescription: info?.ownDescription ?? '',
    coreKeywords: info?.coreKeywords ?? [],
    competitors: info?.competitors ?? [],
    additionalNotes: info?.additionalNotes ?? '',
  };
}

export default function ProjectInfoPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectInfoInput>(toInput(null));

  // chip input buffers
  const [keywordBuf, setKeywordBuf] = useState('');
  const [competitorKwBufs, setCompetitorKwBufs] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchProjectInfo(id)
      .then((info) => {
        setForm(toInput(info));
        setSavedAt(info?.updatedAt ?? null);
        setCompetitorKwBufs((info?.competitors ?? []).map(() => ''));
      })
      .catch(() => setError('프로젝트 정보를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  const addKeyword = () => {
    const v = keywordBuf.trim();
    if (!v) return;
    if (form.coreKeywords.includes(v)) {
      setKeywordBuf('');
      return;
    }
    setForm({ ...form, coreKeywords: [...form.coreKeywords, v] });
    setKeywordBuf('');
  };

  const removeKeyword = (kw: string) => {
    setForm({ ...form, coreKeywords: form.coreKeywords.filter((k) => k !== kw) });
  };

  const addCompetitor = () => {
    setForm({ ...form, competitors: [...form.competitors, { ...EMPTY_COMPETITOR }] });
    setCompetitorKwBufs([...competitorKwBufs, '']);
  };

  const removeCompetitor = (idx: number) => {
    setForm({ ...form, competitors: form.competitors.filter((_, i) => i !== idx) });
    setCompetitorKwBufs(competitorKwBufs.filter((_, i) => i !== idx));
  };

  const updateCompetitorName = (idx: number, name: string) => {
    const next = form.competitors.map((c, i) => (i === idx ? { ...c, name } : c));
    setForm({ ...form, competitors: next });
  };

  const addCompetitorKeyword = (idx: number) => {
    const buf = competitorKwBufs[idx]?.trim();
    if (!buf) return;
    const target = form.competitors[idx];
    if (target.keywords.includes(buf)) {
      const bufs = [...competitorKwBufs];
      bufs[idx] = '';
      setCompetitorKwBufs(bufs);
      return;
    }
    const next = form.competitors.map((c, i) =>
      i === idx ? { ...c, keywords: [...c.keywords, buf] } : c,
    );
    setForm({ ...form, competitors: next });
    const bufs = [...competitorKwBufs];
    bufs[idx] = '';
    setCompetitorKwBufs(bufs);
  };

  const removeCompetitorKeyword = (idx: number, kw: string) => {
    const next = form.competitors.map((c, i) =>
      i === idx ? { ...c, keywords: c.keywords.filter((k) => k !== kw) } : c,
    );
    setForm({ ...form, competitors: next });
  };

  const handleSave = async () => {
    if (!id) return;
    setError('');

    if (!form.categoryL1) {
      setError('카테고리 대분류를 선택하세요');
      return;
    }
    if (form.ownDescription.trim().length < 10) {
      setError('자사 설명은 최소 10자 이상이어야 합니다');
      return;
    }
    if (form.coreKeywords.length === 0) {
      setError('핵심 키워드를 최소 1개 이상 입력하세요');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveProjectInfo(id, {
        ...form,
        competitors: form.competitors.filter((c) => c.name.trim()),
      });
      setSavedAt(saved.updatedAt);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        프로젝트 정보를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-zinc-100">프로젝트 정보</h1>
        <p className="text-sm text-zinc-500 mt-1">
          이곳에 등록한 정보는 <span className="text-blue-400">가이드 관리</span> 탭의 AI 자동 생성에 활용됩니다.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {savedAt && !error && (
        <div className="text-xs text-zinc-500">
          최근 저장: {new Date(savedAt).toLocaleString('ko-KR')}
        </div>
      )}

      {/* 카테고리 */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200">카테고리</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-400">대분류 *</span>
            <select
              value={form.categoryL1}
              onChange={(e) => setForm({ ...form, categoryL1: e.target.value })}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">선택...</option>
              {CATEGORY_L1_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400">소분류</span>
            <input
              type="text"
              value={form.categoryL2}
              onChange={(e) => setForm({ ...form, categoryL2: e.target.value })}
              placeholder="예: 전기차, 스킨케어, 커피"
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
        </div>
      </section>

      {/* 자사 설명 */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">자사 제품/서비스 설명 *</h2>
        <textarea
          value={form.ownDescription}
          onChange={(e) => setForm({ ...form, ownDescription: e.target.value })}
          rows={5}
          placeholder="자사의 제품 또는 서비스에 대한 설명, 핵심 가치, 타깃 고객 등을 자세히 적어주세요. (10자 이상)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
        />
        <div className="text-xs text-zinc-600 text-right">{form.ownDescription.length} / 3000</div>
      </section>

      {/* 핵심 키워드 */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">
          핵심 키워드 * <span className="text-xs font-normal text-zinc-500">(Enter로 추가)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {form.coreKeywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 bg-blue-500/15 text-blue-300 text-xs px-2.5 py-1 rounded-full"
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="text-blue-400/60 hover:text-red-400"
                aria-label="삭제"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            type="text"
            value={keywordBuf}
            onChange={(e) => setKeywordBuf(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
              }
            }}
            onBlur={addKeyword}
            placeholder="키워드 입력 후 Enter"
            className="flex-1 min-w-[180px] bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* 경쟁사 */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">경쟁사</h2>
          <button
            onClick={addCompetitor}
            className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg"
          >
            + 경쟁사 추가
          </button>
        </div>

        {form.competitors.length === 0 && (
          <div className="text-xs text-zinc-600 py-4 text-center">등록된 경쟁사가 없습니다.</div>
        )}

        <div className="space-y-3">
          {form.competitors.map((comp, idx) => (
            <div key={idx} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={comp.name}
                  onChange={(e) => updateCompetitorName(idx, e.target.value)}
                  placeholder="경쟁사/브랜드명"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeCompetitor(idx)}
                  className="text-zinc-500 hover:text-red-400 px-2"
                  aria-label="경쟁사 삭제"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {comp.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 bg-zinc-700/50 text-zinc-300 text-xs px-2 py-0.5 rounded-full"
                  >
                    {kw}
                    <button
                      onClick={() => removeCompetitorKeyword(idx, kw)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={competitorKwBufs[idx] ?? ''}
                  onChange={(e) => {
                    const bufs = [...competitorKwBufs];
                    bufs[idx] = e.target.value;
                    setCompetitorKwBufs(bufs);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCompetitorKeyword(idx);
                    }
                  }}
                  onBlur={() => addCompetitorKeyword(idx)}
                  placeholder="경쟁 키워드 Enter"
                  className="flex-1 min-w-[140px] bg-zinc-900 border border-zinc-700 rounded-full px-2.5 py-0.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 추가 메모 */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">
          추가 메모 <span className="text-xs font-normal text-zinc-500">(선택 — 가이드 생성 시 추가 반영됩니다)</span>
        </h2>
        <textarea
          value={form.additionalNotes ?? ''}
          onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
          rows={3}
          placeholder="이번 시즌 캠페인 컨셉, 강조할 이벤트, 피해야 할 이슈 등"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
        />
      </section>

      {/* 저장 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
