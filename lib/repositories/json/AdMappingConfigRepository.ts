import type { AdMappingConfig } from '../../../src/types/index.js';
import { JsonRepository } from './JsonRepository.js';
import { getDefaultMappingConfig } from '../../services/adReportMapper.js';

export class AdMappingConfigRepository extends JsonRepository<AdMappingConfig> {
  constructor() {
    super('ad-mapping-configs.json', 'amc');
  }

  async findByProject(projectId: string): Promise<AdMappingConfig | null> {
    const items = await this.readAll();
    return items.find((c) => c.projectId === projectId) ?? null;
  }

  /** 프로젝트의 매핑 설정을 반환. 없으면 기본값으로 자동 생성. */
  async getOrCreate(projectId: string): Promise<AdMappingConfig> {
    const existing = await this.findByProject(projectId);
    if (existing) return existing;

    const defaults = getDefaultMappingConfig();
    return this.insertOneAutoId((id) => ({
      id,
      projectId,
      ...defaults,
      updatedAt: new Date().toISOString(),
    }));
  }

  async upsert(
    projectId: string,
    data: Partial<Omit<AdMappingConfig, 'id' | 'projectId'>>,
  ): Promise<AdMappingConfig> {
    const existing = await this.findByProject(projectId);
    if (existing) {
      const updated = await this.updateOne(existing.id, {
        ...data,
        updatedAt: new Date().toISOString(),
      } as Partial<AdMappingConfig>);
      return updated!;
    }

    const defaults = getDefaultMappingConfig();
    return this.insertOneAutoId((id) => ({
      ...defaults,
      ...data,
      id,
      projectId,
      updatedAt: new Date().toISOString(),
    } as AdMappingConfig));
  }
}
