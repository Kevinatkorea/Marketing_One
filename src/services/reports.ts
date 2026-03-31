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
import { get, put, del } from './api';

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
    // XLSX는 FormData로 전송 (일반적으로 작은 파일)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    const res = await fetch(`${BASE_URL}/projects/${projectId}/reports/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || res.statusText);
    }
    return res.json();
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
