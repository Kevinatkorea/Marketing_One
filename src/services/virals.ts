import type { Viral, ViralFilters, PaginatedResult, Comment } from '../types';
import { get, post, put, del } from './api';

export function fetchVirals(
  projectId: string,
  filters?: ViralFilters & { page?: number; pageSize?: number },
): Promise<PaginatedResult<Viral>> {
  const params = new URLSearchParams();
  if (filters?.productId) params.set('productId', filters.productId);
  if (filters?.guideId) params.set('guideId', filters.guideId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.verificationResult) params.set('verificationResult', filters.verificationResult);
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString();
  return get<PaginatedResult<Viral>>(`/projects/${projectId}/virals${qs ? `?${qs}` : ''}`);
}

export function fetchViral(projectId: string, viralId: string): Promise<Viral> {
  return get<Viral>(`/projects/${projectId}/virals/${viralId}`);
}

export function createViral(projectId: string, data: Partial<Viral>): Promise<Viral> {
  return post<Viral>(`/projects/${projectId}/virals`, data);
}

export function updateViral(projectId: string, viralId: string, data: Partial<Viral>): Promise<Viral> {
  return put<Viral>(`/projects/${projectId}/virals/${viralId}`, data);
}

export function deleteViral(projectId: string, viralId: string): Promise<void> {
  return del<void>(`/projects/${projectId}/virals/${viralId}`);
}

export function verifyViral(projectId: string, viralId: string): Promise<Viral> {
  return post<Viral>(`/projects/${projectId}/virals/${viralId}/verify`, {});
}

export function fetchViralComments(projectId: string, viralId: string): Promise<Comment[]> {
  return get<Comment[]>(`/projects/${projectId}/virals/${viralId}/comments`);
}

export interface BulkTextResult {
  message: string;
  batchId: string;
  count: number;
  entries: Viral[];
}

export function bulkTextRegister(
  projectId: string,
  data: { productId: string; guideId: string; text: string },
): Promise<BulkTextResult> {
  return post<BulkTextResult>(`/projects/${projectId}/virals/bulk-text`, data);
}

export function checkDuplicates(
  projectId: string,
  urls: string[],
): Promise<{ duplicates: string[] }> {
  return post<{ duplicates: string[] }>(`/projects/${projectId}/virals/check-duplicates`, { urls });
}

export interface BulkExcelResult {
  message: string;
  batchId: string;
  summary: { success: number; duplicate: number; error: number };
  results: Array<{ row: number; status: string; title?: string; error?: string }>;
}

export async function bulkExcelRegister(
  projectId: string,
  file: File,
  productId: string,
  guideId: string,
): Promise<BulkExcelResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('productId', productId);
  formData.append('guideId', guideId);
  const headers: Record<string, string> = {};
  const apiKey = (import.meta as any).env?.VITE_API_SECRET;
  if (apiKey) headers['x-api-key'] = apiKey;
  const res = await fetch(`/api/projects/${projectId}/virals/bulk-excel`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export function downloadTemplate(projectId: string): string {
  return `/api/projects/${projectId}/virals/export-template`;
}

export interface BulkVerifyResult {
  message: string;
  summary: { verified: number; skipped: number; errors: number; total: number };
  results: Array<{ id: string; title: string; status: string; result?: string; score?: number }>;
}

export function bulkVerify(
  projectId: string,
  data: { viralIds?: string[]; batchId?: string },
): Promise<BulkVerifyResult> {
  return post<BulkVerifyResult>(`/projects/${projectId}/virals/bulk-verify`, data);
}
