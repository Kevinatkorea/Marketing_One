import type { Viral, ViralFilters, PaginationParams, PaginatedResult } from '../../../src/types/index.js';

export interface IViralRepository {
  findById(id: string): Promise<Viral | null>;
  findAll(filters?: ViralFilters): Promise<Viral[]>;
  listByProject(
    projectId: string,
    filters?: Omit<ViralFilters, 'projectId'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Viral>>;
  bulkInsert(items: Omit<Viral, 'id' | 'createdAt'>[]): Promise<Viral[]>;
  checkDuplicates(urls: string[]): Promise<{ url: string; exists: boolean }[]>;
  create(data: Omit<Viral, 'id' | 'createdAt'>): Promise<Viral>;
  update(id: string, data: Partial<Omit<Viral, 'id' | 'createdAt'>>): Promise<Viral>;
  delete(id: string): Promise<boolean>;
}
