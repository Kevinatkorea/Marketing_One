import type { Product, ProductFilters } from '../../../src/types/index.js';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(filters?: ProductFilters): Promise<Product[]>;
  listByProject(projectId: string): Promise<Product[]>;
  create(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product>;
  update(id: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product>;
  delete(id: string): Promise<boolean>;
}
