import type { Guide } from '../types';
import { get, post, put, del } from './api';

export function fetchGuides(projectId: string): Promise<Guide[]> {
  return get<Guide[]>(`/projects/${projectId}/guides`);
}

export function fetchGuide(projectId: string, guideId: string): Promise<Guide> {
  return get<Guide>(`/projects/${projectId}/guides/${guideId}`);
}

export async function createGuide(
  projectId: string,
  data: Partial<Guide>,
  pdfFile?: File,
): Promise<Guide> {
  if (pdfFile) {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('data', JSON.stringify(data));
    const headers: Record<string, string> = {};
    const apiKey = (import.meta as any).env?.VITE_API_SECRET;
    if (apiKey) headers['x-api-key'] = apiKey;
    const res = await fetch(`/api/projects/${projectId}/guides`, {
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
  return post<Guide>(`/projects/${projectId}/guides`, data);
}

export function updateGuide(projectId: string, guideId: string, data: Partial<Guide>): Promise<Guide> {
  return put<Guide>(`/projects/${projectId}/guides/${guideId}`, data);
}

export function cloneGuide(projectId: string, guideId: string): Promise<Guide> {
  return post<Guide>(`/projects/${projectId}/guides/${guideId}/clone`, {});
}

export function deleteGuide(projectId: string, guideId: string): Promise<void> {
  return del<void>(`/projects/${projectId}/guides/${guideId}`);
}

/** AI 자동 생성 응답 — 새로 저장된 Guide + 프리뷰에 쓸 원본 AI 출력 */
export interface GenerateGuideResponse {
  guide: Guide;
  preview: {
    title: string;
    summary: string;
    targetAudience: string;
    toneAndManner: string;
    requiredKeywords: string[];
    forbiddenKeywords: string[];
    minLength: number;
    minRequiredKeywordMatch: number;
    blogStructure: string[];
    sampleHooks: string[];
    competitorDifferentiation: string;
    doList: string[];
    dontList: string[];
  };
}

export function generateGuide(
  projectId: string,
  productId: string,
  additionalNotes?: string,
): Promise<GenerateGuideResponse> {
  return post<GenerateGuideResponse>(`/projects/${projectId}/guides/generate`, {
    productId,
    ...(additionalNotes ? { additionalNotes } : {}),
  });
}
