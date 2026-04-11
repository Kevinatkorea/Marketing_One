import type { ProjectInfo } from '../types';
import { get, put } from './api';

export type ProjectInfoInput = Omit<ProjectInfo, 'updatedAt'>;

export function fetchProjectInfo(projectId: string): Promise<ProjectInfo | null> {
  return get<ProjectInfo | null>(`/projects/${projectId}/project-info`);
}

export function saveProjectInfo(
  projectId: string,
  data: ProjectInfoInput,
): Promise<ProjectInfo> {
  return put<ProjectInfo>(`/projects/${projectId}/project-info`, data);
}
