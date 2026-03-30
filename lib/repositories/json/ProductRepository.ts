import type { Product, ProductFilters } from '../../../src/types/index.js';
import type { IProductRepository } from '../interfaces/IProductRepository.js';
import { JsonRepository } from './JsonRepository.js';

export class ProductRepository
  extends JsonRepository<Product>
  implements IProductRepository
{
  constructor() {
    super('products.json', 'prod');
  }

  async findAll(filters?: ProductFilters): Promise<Product[]> {
    let items = await this.readAll();

    if (filters?.projectId) {
      items = items.filter((p) => p.projectId === filters.projectId);
    }
    if (filters?.category) {
      items = items.filter((p) => p.category === filters.category);
    }
    if (filters?.campaignStatus) {
      items = items.filter(
        (p) => p.campaignPeriod.status === filters.campaignStatus
      );
    }

    return items;
  }

  async listByProject(projectId: string): Promise<Product[]> {
    return this.findAll({ projectId });
  }

  async create(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    return this.insertOneAutoId((id) => ({
      ...data,
      id,
      createdAt: new Date().toISOString(),
    } as Product));
  }

  async update(
    id: string,
    data: Partial<Omit<Product, 'id' | 'createdAt'>>
  ): Promise<Product> {
    const updated = await this.updateOne(id, data as Partial<Product>);
    if (!updated) throw new Error(`Product not found: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteById(id);
  }
}
