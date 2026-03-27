import type { Guide, GuideFilters } from '../../../src/types/index.js';

export interface IGuideRepository {
  findById(id: string): Promise<Guide | null>;
  findAll(filters?: GuideFilters): Promise<Guide[]>;
  listByProject(projectId: string): Promise<Guide[]>;
  clone(id: string, overrides?: Partial<Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Guide>;
  create(data: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>): Promise<Guide>;
  update(id: string, data: Partial<Omit<Guide, 'id' | 'createdAt'>>): Promise<Guide>;
  delete(id: string): Promise<boolean>;
}
