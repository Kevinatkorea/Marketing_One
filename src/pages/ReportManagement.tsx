import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  uploadMetaCsv, fetchReportUploads, deleteReportUpload,
  fetchReportSummary, fetchBranchReports,
  fetchMappingConfig, updateMappingConfig, fetchAvailableMonths,
  type ReportSummaryResponse, type UploadResult,
} from '../services/reports';
import type { AdReportUpload, AdMappingConfig, BranchSummary } from '../types';

const mainTabs = [
  { key: 'upload', label: 'CSV 업로드' },
  { key: 'summary', label: '종합보고서' },
  { key: 'branches', label: '지점별보고서' },
  { key: 'config', label: '매핑설정' },
] as const;
type TabKey = (typeof mainTabs)[number]['key'];

// ============================================================
// Helpers
// ============================================================

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}
function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return `${(n * 100).toFixed(2)}%`;
}
function won(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return `₩${Math.round(n).toLocaleString('ko-KR')}`;
}

// ============================================================
// Main Component
// ============================================================

export default function ReportManagement() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('upload');

  if (!projectId) return null;

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800">
        <nav className="flex gap-1 -mb-px">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'upload' && <UploadTab projectId={projectId} />}
      {activeTab === 'summary' && <SummaryTab projectId={projectId} />}
      {activeTab === 'branches' && <BranchesTab projectId={projectId} />}
      {activeTab === 'config' && <ConfigTab projectId={projectId} />}
    </div>
  );
}

// ============================================================
// Tab 1: CSV Upload
// ============================================================

function UploadTab({ projectId }: { projectId: string }) {
  const [uploads, setUploads] = useState<AdReportUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadUploads = useCallback(async () => {
    const data = await fetchReportUploads(projectId);
    setUploads(data);
  }, [projectId]);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setResult(null);
    try {
      const res = await uploadMetaCsv(projectId, file, mode);
      setResult(res);
      loadUploads();
    } catch (e) {
      setResult({ message: (e as Error).message, uploadId: '', summary: { total: 0, processed: 0, errors: 0 }, errors: [], dateRange: { start: '', end: '' } });
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  };

  const handleDelete = async (uploadId: string) => {
    if (!confirm('이 업로드와 관련된 모든 데이터가 삭제됩니다.')) return;
    await deleteReportUpload(projectId, uploadId);
    loadUploads();
  };

  return (
    <div className="space-y-6">
      {/* Upload Mode */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-400">업로드 모드:</span>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} className="accent-blue-500" />
          <span className="text-zinc-300">추가</span>
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="accent-blue-500" />
          <span className="text-zinc-300">교체 (같은 월 덮어쓰기)</span>
        </label>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.tsv,.txt"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
        />
        {uploading ? (
          <div className="text-blue-400 animate-pulse">처리 중...</div>
        ) : (
          <>
            <div className="text-3xl mb-2">📄</div>
            <div className="text-zinc-300 font-medium">Meta 광고 CSV/XLSX 파일을 드래그하거나 클릭하세요</div>
            <div className="text-zinc-500 text-sm mt-1">지원 형식: .csv, .xlsx, .tsv</div>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 ${result.summary.processed > 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <div className="font-medium text-zinc-200 mb-2">{result.message}</div>
          {result.summary.processed > 0 && (
            <div className="text-sm text-zinc-400">
              총 {result.summary.total}행 중 {result.summary.processed}건 처리 | {result.summary.errors}건 오류
              {result.dateRange.start && ` | 기간: ${result.dateRange.start} ~ ${result.dateRange.end}`}
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-sm text-red-400 font-medium">오류 상세:</div>
              {result.errors.slice(0, 10).map((err, i) => (
                <div key={i} className="text-xs text-zinc-400">
                  행 {err.row}: {err.message}
                </div>
              ))}
              {result.errors.length > 10 && (
                <div className="text-xs text-zinc-500">... 외 {result.errors.length - 10}건</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload History */}
      {uploads.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">업로드 이력</h3>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium">파일명</th>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium">업로드일</th>
                  <th className="text-right px-4 py-2 text-zinc-400 font-medium">처리</th>
                  <th className="text-right px-4 py-2 text-zinc-400 font-medium">오류</th>
                  <th className="text-left px-4 py-2 text-zinc-400 font-medium">기간</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {uploads.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-300">{u.fileName}</td>
                    <td className="px-4 py-2 text-zinc-400">{new Date(u.uploadedAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-2 text-right text-zinc-300">{u.processedCount}</td>
                    <td className="px-4 py-2 text-right text-zinc-300">{u.errorCount}</td>
                    <td className="px-4 py-2 text-zinc-400">{u.dateRange.start && `${u.dateRange.start} ~ ${u.dateRange.end}`}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tab 2: Summary Report
// ============================================================

function SummaryTab({ projectId }: { projectId: string }) {
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [summary, setSummary] = useState<ReportSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableMonths(projectId).then((m) => {
      setMonths(m);
      if (m.length > 0) setSelectedMonth(m[m.length - 1]);
    });
  }, [projectId]);

  useEffect(() => {
    if (!selectedMonth) { setLoading(false); return; }
    setLoading(true);
    fetchReportSummary(projectId, selectedMonth).then((s) => {
      setSummary(s);
      setLoading(false);
    });
  }, [projectId, selectedMonth]);

  if (loading) return <div className="text-zinc-400 py-12 text-center animate-pulse">로딩 중...</div>;
  if (!summary?.totals) return <div className="text-zinc-500 py-12 text-center">데이터가 없습니다. CSV를 먼저 업로드해주세요.</div>;

  const t = summary.totals;
  const stats = [
    { label: '노출수', value: fmt(t.impressions) },
    { label: '클릭수', value: fmt(t.clicks) },
    { label: '광고비', value: won(t.cost) },
    { label: '신청완료', value: fmt(t.registrations) },
    { label: 'CPM', value: won(t.cpm) },
    { label: 'CTR', value: pct(t.ctr) },
    { label: 'CPC', value: won(t.cpc) },
    { label: 'CPA', value: won(t.cpa) },
    { label: 'CVR', value: pct(t.cvr) },
  ];

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-zinc-400">월 선택:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-1.5 text-sm"
        >
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
            <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
            <div className="text-lg font-semibold text-zinc-100">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Weekly Trend Chart */}
      {summary.weeklyBreakdown.length > 0 && (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">주간 추이</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={summary.weeklyBreakdown.map((w) => ({ name: `${w.weekNumber}주차`, cost: w.cost, regs: w.registrations, clicks: w.clicks }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cost" name="광고비" stroke="#3b82f6" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="regs" name="신청완료" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Branch Comparison Chart */}
      {summary.branchSummary.length > 0 && (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">지점별 비교</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.branchSummary} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis dataKey="branch" type="category" tick={{ fill: '#a1a1aa', fontSize: 12 }} width={55} />
              <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8 }} formatter={(v) => won(v as number)} />
              <Legend />
              <Bar dataKey="cost" name="광고비" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="registrations" name="신청완료" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Trend Table */}
      {summary.monthlyTrend.length > 1 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-3">월별 추이</h3>
          <div className="rounded-lg border border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50">
                <tr>
                  {['월', '기간', '노출수', '클릭수', 'CPM', 'CTR', 'CPC', '광고비', '신청완료', 'CPA', 'CVR'].map((h) => (
                    <th key={h} className="px-3 py-2 text-zinc-400 font-medium text-right first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {summary.monthlyTrend.map((m) => (
                  <tr key={m.month} className={`hover:bg-zinc-800/30 ${m.month === selectedMonth ? 'bg-blue-500/5' : ''}`}>
                    <td className="px-3 py-2 text-zinc-300 font-medium">{m.month}</td>
                    <td className="px-3 py-2 text-zinc-400 text-right">{m.period}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{fmt(m.impressions)}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{fmt(m.clicks)}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{won(m.cpm)}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{pct(m.ctr)}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{won(m.cpc)}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{won(m.cost)}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{fmt(m.registrations)}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{won(m.cpa)}</td>
                    <td className="px-3 py-2 text-zinc-300 text-right">{pct(m.cvr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tab 3: Branch Reports
// ============================================================

function BranchesTab({ projectId }: { projectId: string }) {
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableMonths(projectId).then((m) => {
      setMonths(m);
      if (m.length > 0) setSelectedMonth(m[m.length - 1]);
    });
  }, [projectId]);

  useEffect(() => {
    if (!selectedMonth) { setLoading(false); return; }
    setLoading(true);
    fetchBranchReports(projectId, selectedMonth).then((b) => {
      setBranches(b);
      setLoading(false);
    });
  }, [projectId, selectedMonth]);

  if (loading) return <div className="text-zinc-400 py-12 text-center animate-pulse">로딩 중...</div>;
  if (branches.length === 0) return <div className="text-zinc-500 py-12 text-center">데이터가 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm text-zinc-400">월 선택:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-1.5 text-sm"
        >
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div key={b.branch} className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
            <div className="text-base font-semibold text-zinc-100 mb-3">{b.branch}</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-zinc-500 text-xs">노출수</div>
                <div className="text-zinc-200 font-medium">{fmt(b.impressions)}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs">클릭수</div>
                <div className="text-zinc-200 font-medium">{fmt(b.clicks)}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs">광고비</div>
                <div className="text-zinc-200 font-medium">{won(b.cost)}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs">신청완료</div>
                <div className="text-emerald-400 font-medium">{fmt(b.registrations)}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs">CPA</div>
                <div className="text-zinc-200 font-medium">{won(b.cpa)}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs">CVR</div>
                <div className="text-zinc-200 font-medium">{pct(b.cvr)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Branch Table */}
      <div className="rounded-lg border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              {['지점', '노출수', '클릭수', 'CPM', 'CTR', 'CPC', '광고비', '신청완료', 'CPA', 'CVR'].map((h) => (
                <th key={h} className="px-3 py-2 text-zinc-400 font-medium text-right first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {branches.map((b) => (
              <tr key={b.branch} className="hover:bg-zinc-800/30">
                <td className="px-3 py-2 text-zinc-300 font-medium">{b.branch}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{fmt(b.impressions)}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{fmt(b.clicks)}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{won(b.cpm)}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{pct(b.ctr)}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{won(b.cpc)}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{won(b.cost)}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{fmt(b.registrations)}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{won(b.cpa)}</td>
                <td className="px-3 py-2 text-zinc-300 text-right">{pct(b.cvr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Tab 4: Mapping Config
// ============================================================

function ConfigTab({ projectId }: { projectId: string }) {
  const [config, setConfig] = useState<AdMappingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchMappingConfig(projectId).then(setConfig);
  }, [projectId]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMsg('');
    try {
      const updated = await updateMappingConfig(projectId, {
        branches: config.branches,
        targetKeywords: config.targetKeywords,
        creativePatterns: config.creativePatterns,
        categoryDefault: config.categoryDefault,
      });
      setConfig(updated);
      setMsg('저장 완료');
    } catch (e) {
      setMsg(`오류: ${(e as Error).message}`);
    }
    setSaving(false);
  };

  if (!config) return <div className="text-zinc-400 py-12 text-center animate-pulse">로딩 중...</div>;

  return (
    <div className="space-y-8">
      {/* Branches */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-300">지점 매핑</h3>
          <button
            onClick={() => setConfig({ ...config, branches: [...config.branches, { suffix: '', fullName: '' }] })}
            className="text-xs text-blue-400 hover:text-blue-300"
          >+ 추가</button>
        </div>
        <div className="space-y-2">
          {config.branches.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={b.suffix}
                onChange={(e) => { const arr = [...config.branches]; arr[i] = { ...arr[i], suffix: e.target.value }; setConfig({ ...config, branches: arr }); }}
                placeholder="접미사 (예: 서초)"
                className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-1.5 text-sm w-32"
              />
              <span className="text-zinc-500">→</span>
              <input
                value={b.fullName}
                onChange={(e) => { const arr = [...config.branches]; arr[i] = { ...arr[i], fullName: e.target.value }; setConfig({ ...config, branches: arr }); }}
                placeholder="지점명 (예: 서초본점)"
                className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-1.5 text-sm flex-1"
              />
              <button onClick={() => setConfig({ ...config, branches: config.branches.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300 text-xs px-2">삭제</button>
            </div>
          ))}
        </div>
      </section>

      {/* Target Keywords */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-300">타겟 키워드</h3>
          <button
            onClick={() => setConfig({ ...config, targetKeywords: [...config.targetKeywords, { keyword: '', label: '' }] })}
            className="text-xs text-blue-400 hover:text-blue-300"
          >+ 추가</button>
        </div>
        <div className="space-y-2">
          {config.targetKeywords.map((kw, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={kw.keyword}
                onChange={(e) => { const arr = [...config.targetKeywords]; arr[i] = { ...arr[i], keyword: e.target.value }; setConfig({ ...config, targetKeywords: arr }); }}
                placeholder="키워드 (예: 잠재고객)"
                className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-1.5 text-sm w-40"
              />
              <span className="text-zinc-500">→</span>
              <input
                value={kw.label}
                onChange={(e) => { const arr = [...config.targetKeywords]; arr[i] = { ...arr[i], label: e.target.value }; setConfig({ ...config, targetKeywords: arr }); }}
                placeholder="라벨 (예: 잠재)"
                className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-1.5 text-sm flex-1"
              />
              <button onClick={() => setConfig({ ...config, targetKeywords: config.targetKeywords.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300 text-xs px-2">삭제</button>
            </div>
          ))}
        </div>
      </section>

      {/* Creative Patterns */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-300">소재명 패턴</h3>
          <button
            onClick={() => setConfig({ ...config, creativePatterns: [...config.creativePatterns, { pattern: '', label: '' }] })}
            className="text-xs text-blue-400 hover:text-blue-300"
          >+ 추가</button>
        </div>
        <div className="space-y-2">
          {config.creativePatterns.map((cp, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={cp.pattern}
                onChange={(e) => { const arr = [...config.creativePatterns]; arr[i] = { ...arr[i], pattern: e.target.value }; setConfig({ ...config, creativePatterns: arr }); }}
                placeholder="패턴 (예: 체험권.*VIP)"
                className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-1.5 text-sm w-48 font-mono"
              />
              <span className="text-zinc-500">→</span>
              <input
                value={cp.label}
                onChange={(e) => { const arr = [...config.creativePatterns]; arr[i] = { ...arr[i], label: e.target.value }; setConfig({ ...config, creativePatterns: arr }); }}
                placeholder="라벨 (예: 체험권(VIP))"
                className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-1.5 text-sm flex-1"
              />
              <button onClick={() => setConfig({ ...config, creativePatterns: config.creativePatterns.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300 text-xs px-2">삭제</button>
            </div>
          ))}
        </div>
        <div className="text-xs text-zinc-500 mt-2">패턴은 정규식(regex)을 지원합니다. 순서대로 매칭되며, 먼저 일치하는 패턴이 적용됩니다.</div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        {msg && <span className={`text-sm ${msg.startsWith('오류') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</span>}
      </div>
    </div>
  );
}
