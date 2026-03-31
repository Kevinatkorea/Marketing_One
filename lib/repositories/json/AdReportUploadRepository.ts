import type { AdReportUpload } from '../../../src/types/index.js';
import { JsonRepository } from './JsonRepository.js';

export class AdReportUploadRepository extends JsonRepository<AdReportUpload> {
  constructor() {
    super('ad-report-uploads.json', 'adru');
  }

  async listByProject(projectId: string): Promise<AdReportUpload[]> {
    const items = await this.readAll();
    return items
      .filter((u) => u.projectId === projectId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  async create(data: Omit<AdReportUpload, 'id'>): Promise<AdReportUpload> {
    return this.insertOneAutoId((id) => ({ ...data, id }) as AdReportUpload);
  }

  async updateStatus(
    id: string,
    update: Partial<Pick<AdReportUpload, 'status' | 'processedCount' | 'errorCount' | 'errors' | 'dateRange'>>,
  ): Promise<AdReportUpload | null> {
    return this.updateOne(id, update as Partial<AdReportUpload>);
  }
}
