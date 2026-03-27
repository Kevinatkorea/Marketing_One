import type { Project, ProjectFilters } from '../../../src/types/index.js';

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findAll(filters?: ProjectFilters): Promise<Project[]>;
  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project>;
  delete(id: string): Promise<boolean>;
}
