import { create } from 'zustand';
import type { Project } from '../types';

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: '2026 봄 신상품 런칭',
    description: '2026년 봄 시즌 신상품 바이럴 마케팅 캠페인',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-03-25T10:30:00Z',
    status: 'active',
    owner: '김마케터',
  },
  {
    id: '2',
    name: '여름 프로모션 캠페인',
    description: '여름 시즌 할인 프로모션 바이럴 캠페인',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-20T14:00:00Z',
    status: 'active',
    owner: '박기획',
  },
  {
    id: '3',
    name: '겨울 시즌 리뷰',
    description: '지난 겨울 시즌 바이럴 성과 분석',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    status: 'archived',
    owner: '이분석',
  },
];

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project | null) => void;
  fetchProjects: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  setCurrentProject: (project) => set({ currentProject: project }),
  fetchProjects: () => set({ projects: MOCK_PROJECTS }),
}));
