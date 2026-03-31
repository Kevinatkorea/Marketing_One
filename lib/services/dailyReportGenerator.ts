/**
 * 일일보고 자동 생성 엔진
 *
 * Meta CSV 자동 데이터 + 수동 입력을 병합하여
 * 지점별 일일보고 데이터를 계산하고, 보고 메시지 텍스트를 생성한다.
 */

import type {
  AdReportEntry,
  AdMappingConfig,
  DailyManualInput,
} from '../../src/types/index.js';

// ============================================================
// Types
// ============================================================

export interface SourceData {
  leads: number;      // 잠재고객
  homepage: number;   // 홈페이지 전환
  adSpend: number;    // 광고비 (당일)
  monthlyAdSpend: number; // 월누적 광고비
}

export interface BranchReportData {
  branch: string;
  sources: Record<string, SourceData>;
  sourceOrder: string[];
  dailyTotal: number;
  monthlyTotal: number;
  dailyCpa: number | null;
  monthlyCpa: number | null;
  memo: string;
}

export interface DailyReportData {
  date: string;
  branches: BranchReportData[];
}

// ============================================================
// Data Aggregation
// ============================================================

/**
 * Meta CSV에서 특정 날짜의 지점별 fb&insta 데이터 집계
 */
export function aggregateMetaByDateAndBranch(
  entries: AdReportEntry[],
  date: string,
): Record<string, { leads: number; homepage: number; adSpend: number }> {
  const result: Record<string, { leads: number; homepage: number; adSpend: number }> = {};

  for (const e of entries) {
    if (e.date !== date) continue;
    if (!result[e.branch]) {
      result[e.branch] = { leads: 0, homepage: 0, adSpend: 0 };
    }
    result[e.branch].leads += e.leadRegistrations || 0;
    result[e.branch].homepage += e.formRegistrations || 0;
    result[e.branch].adSpend += e.cost;
  }

  return result;
}

/**
 * Meta CSV에서 월간 누적 데이터 (1일~targetDate까지)
 */
export function aggregateMetaMonthly(
  entries: AdReportEntry[],
  targetDate: string,
): Record<string, { leads: number; homepage: number; adSpend: number }> {
  // targetDate: "2026-04-01" → yearMonth: "2026-04"
  const yearMonth = targetDate.slice(0, 7);
  const result: Record<string, { leads: number; homepage: number; adSpend: number }> = {};

  for (const e of entries) {
    if (!e.date.startsWith(yearMonth) || e.date > targetDate) continue;
    if (!result[e.branch]) {
      result[e.branch] = { leads: 0, homepage: 0, adSpend: 0 };
    }
    result[e.branch].leads += e.leadRegistrations || 0;
    result[e.branch].homepage += e.formRegistrations || 0;
    result[e.branch].adSpend += e.cost;
  }

  return result;
}

/**
 * 수동 입력에서 월간 누적 데이터
 */
export function aggregateManualMonthly(
  inputs: DailyManualInput[],
  targetDate: string,
): Record<string, Record<string, { leads: number; homepage: number; adSpend: number }>> {
  const yearMonth = targetDate.slice(0, 7);
  // result[branch][source] = { leads, homepage, adSpend }
  const result: Record<string, Record<string, { leads: number; homepage: number; adSpend: number }>> = {};

  for (const input of inputs) {
    if (!input.date.startsWith(yearMonth) || input.date > targetDate) continue;
    if (!result[input.branch]) result[input.branch] = {};

    for (const [source, data] of Object.entries(input.sources)) {
      if (!result[input.branch][source]) {
        result[input.branch][source] = { leads: 0, homepage: 0, adSpend: 0 };
      }
      result[input.branch][source].leads += data.leads;
      result[input.branch][source].homepage += data.homepage;
      result[input.branch][source].adSpend += data.adSpend;
    }
  }

  return result;
}

/**
 * 일일보고 데이터 생성 (Meta 자동 + 수동 병합)
 */
export function buildDailyReportData(
  date: string,
  config: AdMappingConfig,
  allMetaEntries: AdReportEntry[],
  dailyManualInputs: DailyManualInput[],   // 당일 수동 입력
  monthlyManualInputs: DailyManualInput[],  // 월간 수동 입력 (월합계용)
): DailyReportData {
  const metaDaily = aggregateMetaByDateAndBranch(allMetaEntries, date);
  const metaMonthly = aggregateMetaMonthly(allMetaEntries, date);
  const manualMonthly = aggregateManualMonthly(monthlyManualInputs, date);

  // 당일 수동 입력을 branch별로 인덱싱
  const manualByBranch: Record<string, DailyManualInput> = {};
  for (const m of dailyManualInputs) {
    manualByBranch[m.branch] = m;
  }

  const branchOrder = config.dailyReportBranchOrder || config.branches.map((b) => b.fullName);
  const branches: BranchReportData[] = [];

  for (const branch of branchOrder) {
    const sourceOrder = config.branchMediaSources?.[branch] || config.mediaSources || ['fb&insta'];
    const sources: Record<string, SourceData> = {};

    let dailyTotal = 0;
    let monthlyTotal = 0;
    let dailyAdSpendTotal = 0;
    let monthlyAdSpendTotal = 0;

    for (const source of sourceOrder) {
      let dailyLeads = 0;
      let dailyHomepage = 0;
      let dailyAdSpend = 0;
      let mAdSpend = 0;
      let mLeads = 0;
      let mHomepage = 0;

      if (source === 'fb&insta') {
        // Meta 자동 데이터
        const md = metaDaily[branch];
        if (md) {
          dailyLeads = md.leads;
          dailyHomepage = md.homepage;
          dailyAdSpend = md.adSpend;
        }
        const mm = metaMonthly[branch];
        if (mm) {
          mAdSpend = mm.adSpend;
          mLeads = mm.leads;
          mHomepage = mm.homepage;
        }
      } else {
        // 수동 입력 (당일)
        const manual = manualByBranch[branch];
        if (manual?.sources[source]) {
          dailyLeads = manual.sources[source].leads;
          dailyHomepage = manual.sources[source].homepage;
          dailyAdSpend = manual.sources[source].adSpend;
        }
        // 수동 입력 (월간 누적)
        const mm = manualMonthly[branch]?.[source];
        if (mm) {
          mAdSpend = mm.adSpend;
          mLeads = mm.leads;
          mHomepage = mm.homepage;
        }
      }

      const sourceTotal = dailyLeads + dailyHomepage;
      dailyTotal += sourceTotal;
      monthlyTotal += mLeads + mHomepage;
      dailyAdSpendTotal += dailyAdSpend;
      monthlyAdSpendTotal += mAdSpend;

      sources[source] = {
        leads: dailyLeads,
        homepage: dailyHomepage,
        adSpend: dailyAdSpend,
        monthlyAdSpend: mAdSpend,
      };
    }

    // fb&insta의 월간 리드도 monthlyTotal에 포함
    // (위 루프에서 이미 합산됨)

    const dailyCpa = dailyTotal > 0 ? Math.round(dailyAdSpendTotal / dailyTotal) : null;
    const monthlyCpa = monthlyTotal > 0 ? Math.round(monthlyAdSpendTotal / monthlyTotal) : null;

    branches.push({
      branch,
      sources,
      sourceOrder,
      dailyTotal,
      monthlyTotal,
      dailyCpa,
      monthlyCpa,
      memo: manualByBranch[branch]?.memo || '',
    });
  }

  return { date, branches };
}

// ============================================================
// Message Generation
// ============================================================

function formatMoney(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

export function generateReportMessage(
  data: DailyReportData,
  config: AdMappingConfig,
): string {
  const displayNames = config.mediaDisplayNames || {};
  const lines: string[] = [];

  lines.push('금일 일일보고드립니다! 확인 부탁드립니다!');
  lines.push('');

  for (let i = 0; i < data.branches.length; i++) {
    const b = data.branches[i];

    // Branch header
    lines.push(`${i + 1}. ${b.branch}DB`);

    // Sources
    for (const source of b.sourceOrder) {
      const s = b.sources[source];
      if (!s) continue;
      const total = s.leads + s.homepage;
      let line = `- ${source}   ${total}`;

      if (total > 0) {
        const parts: string[] = [];
        if (s.leads > 0) parts.push(`(잠재고객 ${s.leads})`);
        if (s.homepage > 0) parts.push(`(홈페이지 ${s.homepage})`);
        if (parts.length > 0) line += `   ${parts.join(' ')}`;
      }

      lines.push(line);
    }

    lines.push('');
    lines.push(`일합계   ${b.dailyTotal}`);
    lines.push(`월합계   ${b.monthlyTotal}`);
    lines.push('');

    // Ad Spend (monthly cumulative, only sources with adSpend > 0)
    lines.push('3. 사용광고비(월별)');
    for (const source of b.sourceOrder) {
      const s = b.sources[source];
      if (!s || s.monthlyAdSpend <= 0) continue;
      const name = displayNames[source] || source;
      lines.push(`${name}   ${formatMoney(s.monthlyAdSpend)}`);
    }
    lines.push('');

    // CPA
    lines.push('4. 전환당 비용/관리자 참고용');
    lines.push(`일평균   ${b.dailyCpa !== null ? formatMoney(b.dailyCpa) : '0'}`);
    lines.push(`*월평균   ${b.monthlyCpa !== null ? formatMoney(b.monthlyCpa) : '0'}`);

    // Branch separator (except last)
    if (i < data.branches.length - 1) {
      lines.push('--------------------');
    }
  }

  return lines.join('\n');
}
