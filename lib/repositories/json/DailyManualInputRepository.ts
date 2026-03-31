import type { DailyManualInput } from '../../../src/types/index.js';
import { JsonRepository } from './JsonRepository.js';

export class DailyManualInputRepository extends JsonRepository<DailyManualInput> {
  constructor() {
    super('daily-manual-inputs.json', 'dmi');
  }

  async findByDate(projectId: string, date: string): Promise<DailyManualInput[]> {
    const items = await this.readAll();
    return items.filter((i) => i.projectId === projectId && i.date === date);
  }

  async findByDateAndBranch(projectId: string, date: string, branch: string): Promise<DailyManualInput | null> {
    const items = await this.readAll();
    return items.find((i) => i.projectId === projectId && i.date === date && i.branch === branch) ?? null;
  }

  /** 해당 월의 모든 수동 입력 (월합계 계산용) */
  async findByMonth(projectId: string, yearMonth: string): Promise<DailyManualInput[]> {
    // yearMonth: "2026-04" 형식
    const items = await this.readAll();
    return items.filter((i) => i.projectId === projectId && i.date.startsWith(yearMonth));
  }

  /** 같은 날짜+지점이면 덮어쓰기, 없으면 생성 */
  async upsert(
    projectId: string,
    date: string,
    branch: string,
    data: Pick<DailyManualInput, 'sources' | 'memo'>,
  ): Promise<DailyManualInput> {
    const existing = await this.findByDateAndBranch(projectId, date, branch);
    const now = new Date().toISOString();

    if (existing) {
      const updated = await this.updateOne(existing.id, {
        sources: data.sources,
        memo: data.memo,
        updatedAt: now,
      } as Partial<DailyManualInput>);
      return updated!;
    }

    return this.insertOneAutoId((id) => ({
      id,
      projectId,
      date,
      branch,
      sources: data.sources,
      memo: data.memo,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /** 한 날짜의 모든 지점 수동 입력을 한 번에 저장 */
  async upsertAll(
    projectId: string,
    date: string,
    inputs: Array<{ branch: string; sources: DailyManualInput['sources']; memo: string }>,
  ): Promise<DailyManualInput[]> {
    const results: DailyManualInput[] = [];
    for (const input of inputs) {
      const result = await this.upsert(projectId, date, input.branch, input);
      results.push(result);
    }
    return results;
  }
}
