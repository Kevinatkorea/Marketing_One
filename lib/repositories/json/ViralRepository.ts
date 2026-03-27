import type {
  Viral,
  ViralFilters,
  PaginationParams,
  PaginatedResult,
} from '../../../src/types/index.js';
import type { IViralRepository } from '../interfaces/IViralRepository.js';
import { JsonRepository } from './JsonRepository.js';

export class ViralRepository
  extends JsonRepository<Viral>
  implements IViralRepository
{
  constructor() {
    super('virals.json', 'viral');
  }

  async findAll(filters?: ViralFilters): Promise<Viral[]> {
    let items = await this.readAll();
    items = this.applyFilters(items, filters);
    return items;
  }

  async listByProject(
    projectId: string,
    filters?: Omit<ViralFilters, 'projectId'>,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Viral>> {
    let items = await this.readAll();
    items = this.applyFilters(items, { ...filters, projectId });

    const total = items.length;
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const data = items.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async bulkInsert(
    itemsData: Omit<Viral, 'id' | 'createdAt'>[]
  ): Promise<Viral[]> {
    return this.withLock(async () => {
      const existing = await this.readAllRaw();
      const now = new Date().toISOString();

      // Find current max ID
      let maxNum = 0;
      for (const item of existing) {
        const match = item.id.match(/_(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }

      const newItems: Viral[] = itemsData.map((data, index) => ({
        ...data,
        id: `viral_${String(maxNum + index + 1).padStart(3, '0')}`,
        createdAt: now,
      }));

      await this.writeAllRaw([...existing, ...newItems]);
      return newItems;
    });
  }

  async checkDuplicates(
    urls: string[]
  ): Promise<{ url: string; exists: boolean }[]> {
    const items = await this.readAll();
    const existingUrls = new Set(items.map((v) => v.url));
    return urls.map((url) => ({ url, exists: existingUrls.has(url) }));
  }

  async create(data: Omit<Viral, 'id' | 'createdAt'>): Promise<Viral> {
    const viral: Viral = {
      ...data,
      id: await this.generateId(),
      createdAt: new Date().toISOString(),
    };
    return this.insertOne(viral);
  }

  async update(
    id: string,
    data: Partial<Omit<Viral, 'id' | 'createdAt'>>
  ): Promise<Viral> {
    const updated = await this.updateOne(id, data as Partial<Viral>);
    if (!updated) throw new Error(`Viral not found: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteById(id);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private applyFilters(items: Viral[], filters?: ViralFilters): Viral[] {
    if (!filters) return items;

    if (filters.projectId) {
      items = items.filter((v) => v.projectId === filters.projectId);
    }
    if (filters.productId) {
      items = items.filter((v) => v.productId === filters.productId);
    }
    if (filters.guideId) {
      items = items.filter((v) => v.guideId === filters.guideId);
    }
    if (filters.status) {
      items = items.filter((v) => v.status === filters.status);
    }
    if (filters.verificationResult) {
      items = items.filter(
        (v) => v.verification.result === filters.verificationResult
      );
    }
    if (filters.platform) {
      items = items.filter((v) => v.platform === filters.platform);
    }
    if (filters.batchId) {
      items = items.filter((v) => v.batchId === filters.batchId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.author.toLowerCase().includes(q) ||
          v.cafeName.toLowerCase().includes(q)
      );
    }

    return items;
  }
}
