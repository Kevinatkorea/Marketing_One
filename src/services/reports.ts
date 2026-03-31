import type {
  AdReportUpload,
  AdReportEntry,
  AdMappingConfig,
  ReportMetrics,
  MonthSummary,
  BranchSummary,
  WeekSummary,
  PaginatedResult,
} from '../types';
import { get, post, put, del } from './api';

const BASE_URL = '/api';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = (import.meta as any).env?.VITE_API_SECRET;
  if (apiKey) headers['x-api-key'] = apiKey;
  return headers;
}

// --- Upload ---

export interface UploadResult {
  message: string;
  uploadId: string;
  summary: { total: number; processed: number; errors: number };
  errors: Array<{ row: number; field: string; message: string }>;
  dateRange: { start: string; end: string };
}

export async function uploadMetaCsv(
  projectId: string,
  file: File,
  mode: 'append' | 'replace' = 'append',
): Promise<UploadResult> {
  // 클라이언트에서 텍스트로 읽어 JSON body로 전송 (Vercel 4.5MB body 제한 우회)
  let csvText: string;

  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
    csvText = await file.text();
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    // 브라우저에서 XLSX 파싱 → "변환용" 시트를 CSV 텍스트로 변환 (Vercel 4.5MB 제한 우회)
    const XLSX = await import('xlsx');
    const data = new Uint8Array(await file.arrayBuffer());
    const wb = XLSX.read(data, { type: 'array' });
    // "변환용" 시트 우선, 없으면 첫 번째 시트
    const sheetName = wb.SheetNames.includes('변환용') ? '변환용' : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error('워크시트를 찾을 수 없습니다');
    csvText = XLSX.utils.sheet_to_csv(ws, { FS: '\t' });
  } else {
    throw new Error('지원하지 않는 파일 형식입니다 (.csv, .xlsx)');
  }

  const res = await fetch(`${BASE_URL}/projects/${projectId}/reports/upload`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvText, fileName: file.name, mode }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export function fetchReportUploads(projectId: string): Promise<AdReportUpload[]> {
  return get<AdReportUpload[]>(`/projects/${projectId}/reports/uploads`);
}

export function deleteReportUpload(projectId: string, uploadId: string): Promise<{ message: string }> {
  return del<{ message: string }>(`/projects/${projectId}/reports/uploads/${uploadId}`);
}

// --- Summary ---

export interface ReportSummaryResponse {
  month: string | null;
  totals: (MonthSummary & ReportMetrics) | null;
  weeklyBreakdown: WeekSummary[];
  branchSummary: BranchSummary[];
  monthlyTrend: MonthSummary[];
}

export function fetchReportSummary(projectId: string, month?: string): Promise<ReportSummaryResponse> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return get<ReportSummaryResponse>(`/projects/${projectId}/reports/summary${qs}`);
}

// --- Branch ---

export function fetchBranchReports(projectId: string, month?: string): Promise<BranchSummary[]> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return get<BranchSummary[]>(`/projects/${projectId}/reports/branches${qs}`);
}

export interface BranchDetailResponse {
  branch: string;
  month: string | null;
  weeks: WeekSummary[];
  months: MonthSummary[];
  totalEntries: number;
}

export function fetchBranchDetail(
  projectId: string,
  branch: string,
  month?: string,
): Promise<BranchDetailResponse> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return get<BranchDetailResponse>(`/projects/${projectId}/reports/branches/${encodeURIComponent(branch)}${qs}`);
}

// --- Raw Data ---

export function fetchRawData(
  projectId: string,
  filters?: { month?: string; branch?: string; page?: number; pageSize?: number },
): Promise<PaginatedResult<AdReportEntry>> {
  const params = new URLSearchParams();
  if (filters?.month) params.set('month', filters.month);
  if (filters?.branch) params.set('branch', filters.branch);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString();
  return get<PaginatedResult<AdReportEntry>>(`/projects/${projectId}/reports/raw${qs ? `?${qs}` : ''}`);
}

// --- Mapping Config ---

export function fetchMappingConfig(projectId: string): Promise<AdMappingConfig> {
  return get<AdMappingConfig>(`/projects/${projectId}/reports/mapping-config`);
}

export function updateMappingConfig(
  projectId: string,
  config: Partial<AdMappingConfig>,
): Promise<AdMappingConfig> {
  return put<AdMappingConfig>(`/projects/${projectId}/reports/mapping-config`, config);
}

// --- Months ---

export function fetchAvailableMonths(projectId: string): Promise<string[]> {
  return get<string[]>(`/projects/${projectId}/reports/months`);
}

// --- Daily Reports (일일보고) ---

export interface DailySourceData {
  leads: number;
  homepage: number;
  adSpend: number;
  monthlyAdSpend: number;
}

export interface BranchReportData {
  branch: string;
  sources: Record<string, DailySourceData>;
  sourceOrder: string[];
  dailyTotal: number;
  monthlyTotal: number;
  dailyCpa: number | null;
  monthlyCpa: number | null;
  memo: string;
}

export interface DailyReportResponse {
  date: string;
  branches: BranchReportData[];
  message: string;
}

export function fetchDailyReport(projectId: string, date: string): Promise<DailyReportResponse> {
  return get<DailyReportResponse>(`/projects/${projectId}/daily-reports?date=${date}`);
}

export function saveDailyReport(
  projectId: string,
  data: {
    date: string;
    branches: Array<{
      branch: string;
      sources: Record<string, { leads: number; homepage: number; adSpend: number }>;
      memo?: string;
    }>;
  },
): Promise<DailyReportResponse> {
  return post<DailyReportResponse>(`/projects/${projectId}/daily-reports`, data);
}

export function fetchDailyReportMessage(projectId: string, date: string): Promise<{ message: string }> {
  return get<{ message: string }>(`/projects/${projectId}/daily-reports/message?date=${date}`);
}

export interface MetaSummaryResponse {
  date: string;
  branches: Record<string, { leads: number; homepage: number; adSpend: number }>;
  branchOrder: string[];
}

export function fetchMetaSummary(projectId: string, date: string): Promise<MetaSummaryResponse> {
  return get<MetaSummaryResponse>(`/projects/${projectId}/daily-reports/meta-summary?date=${date}`);
}
