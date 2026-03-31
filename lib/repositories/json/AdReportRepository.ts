import type { AdReportEntry, AdReportFilters } from '../../../src/types/index.js';
import { JsonRepository } from './JsonRepository.js';

export class AdReportRepository extends JsonRepository<AdReportEntry> {
  constructor() {
    super('ad-reports.json', 'adr');
  }

  async findAll(filters?: AdReportFilters): Promise<AdReportEntry[]> {
    let items = await this.readAll();

    if (filters?.projectId) {
      items = items.filter((e) => e.projectId === filters.projectId);
    }
    if (filters?.month) {
      items = items.filter((e) => e.month === filters.month);
    }
    if (filters?.branch) {
      items = items.filter((e) => e.branch === filters.branch);
    }
    if (filters?.category) {
      items = items.filter((e) => e.category === filters.category);
    }
    if (filters?.target) {
      items = items.filter((e) => e.target === filters.target);
    }
    if (filters?.uploadBatchId) {
      items = items.filter((e) => e.uploadBatchId === filters.uploadBatchId);
    }
    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      items = items.filter((e) => e.date >= start && e.date <= end);
    }

    return items;
  }

  async bulkInsert(
    entries: Omit<AdReportEntry, 'id' | 'createdAt'>[],
  ): Promise<AdReportEntry[]> {
    return this.withLock(async () => {
      const items = await this.readAllRaw();
      const now = new Date().toISOString();
      const inserted: AdReportEntry[] = [];

      for (const entry of entries) {
        const id = this.generateIdFromItems(items);
        const full: AdReportEntry = { ...entry, id, createdAt: now } as AdReportEntry;
        items.push(full);
        inserted.push(full);
      }

      await this.writeAllRaw(items);
      return inserted;
    });
  }

  async deleteByUploadBatch(uploadBatchId: string): Promise<number> {
    return this.withLock(async () => {
      const items = await this.readAllRaw();
      const before = items.length;
      const filtered = items.filter((e) => e.uploadBatchId !== uploadBatchId);
      await this.writeAllRaw(filtered);
      return before - filtered.length;
    });
  }

  async getDistinctMonths(projectId: string): Promise<string[]> {
    const items = await this.findAll({ projectId });
    return [...new Set(items.map((e) => e.month))];
  }

  async getDistinctBranches(projectId: string): Promise<string[]> {
    const items = await this.findAll({ projectId });
    return [...new Set(items.map((e) => e.branch))].sort();
  }
}
