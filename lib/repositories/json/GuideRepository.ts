import type { Guide, GuideFilters } from '../../../src/types/index.js';
import type { IGuideRepository } from '../interfaces/IGuideRepository.js';
import { JsonRepository } from './JsonRepository.js';

export class GuideRepository
  extends JsonRepository<Guide>
  implements IGuideRepository
{
  constructor() {
    super('guides.json', 'guide');
  }

  async findAll(filters?: GuideFilters): Promise<Guide[]> {
    let items = await this.readAll();

    if (filters?.projectId) {
      items = items.filter((g) => g.projectId === filters.projectId);
    }
    if (filters?.productId) {
      items = items.filter((g) => g.productId === filters.productId);
    }
    if (filters?.isTemplate !== undefined) {
      items = items.filter((g) => g.isTemplate === filters.isTemplate);
    }

    return items;
  }

  async listByProject(projectId: string): Promise<Guide[]> {
    return this.findAll({ projectId });
  }

  async clone(
    id: string,
    overrides?: Partial<Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Guide> {
    const source = await this.findById(id);
    if (!source) throw new Error(`Guide not found: ${id}`);

    const now = new Date().toISOString();
    return this.insertOneAutoId((id) => ({
      ...source,
      ...overrides,
      id,
      isTemplate: false,
      createdAt: now,
      updatedAt: now,
    } as Guide));
  }

  async create(
    data: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Guide> {
    const now = new Date().toISOString();
    return this.insertOneAutoId((id) => ({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    } as Guide));
  }

  async update(
    id: string,
    data: Partial<Omit<Guide, 'id' | 'createdAt'>>
  ): Promise<Guide> {
    const updated = await this.updateOne(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    } as Partial<Guide>);
    if (!updated) throw new Error(`Guide not found: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteById(id);
  }
}
