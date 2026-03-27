import { create } from 'zustand';
import type { Project } from '../types';
import * as projectApi from '../services/projects';

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  error: string | null;
  setCurrentProject: (project: Project | null) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  loading: false,
  error: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await projectApi.fetchProjects();
      set({ projects, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  fetchProject: async (id: string) => {
    try {
      const project = await projectApi.fetchProject(id);
      set({ currentProject: project });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
