import type { Project, ProjectFilters } from '../types';
import { get, post, put, del } from './api';

export function fetchProjects(filters?: ProjectFilters): Promise<Project[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.owner) params.set('owner', filters.owner);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return get<Project[]>(`/projects${qs ? `?${qs}` : ''}`);
}

export function fetchProject(id: string): Promise<Project> {
  return get<Project>(`/projects/${id}`);
}

export function createProject(data: Partial<Project>): Promise<Project> {
  return post<Project>('/projects', data);
}

export function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  return put<Project>(`/projects/${id}`, data);
}

export function deleteProject(id: string): Promise<void> {
  return del<void>(`/projects/${id}`);
}
