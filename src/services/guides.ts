import type { Guide } from '../types';
import { get, post, put } from './api';

export function fetchGuides(projectId: string): Promise<Guide[]> {
  return get<Guide[]>(`/projects/${projectId}/guides`);
}

export function fetchGuide(projectId: string, guideId: string): Promise<Guide> {
  return get<Guide>(`/projects/${projectId}/guides/${guideId}`);
}

export function createGuide(projectId: string, data: Partial<Guide>): Promise<Guide> {
  return post<Guide>(`/projects/${projectId}/guides`, data);
}

export function updateGuide(projectId: string, guideId: string, data: Partial<Guide>): Promise<Guide> {
  return put<Guide>(`/projects/${projectId}/guides/${guideId}`, data);
}

export function cloneGuide(projectId: string, guideId: string): Promise<Guide> {
  return post<Guide>(`/projects/${projectId}/guides/${guideId}/clone`, {});
}
