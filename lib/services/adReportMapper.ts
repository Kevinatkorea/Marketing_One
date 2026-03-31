/**
 * 광고 보고서 매핑 엔진
 *
 * Meta CSV/XLSX 로우데이터를 표준 RAW 형식으로 변환하고, 집계 지표를 계산한다.
 * Excel의 INDEX_광고 시트 + 변환용 시트 로직을 코드화한 것.
 */

import type {
  AdMappingConfig,
  AdMappingBranch,
  AdMappingTargetKeyword,
  AdMappingCreativePattern,
  AdReportEntry,
  ReportMetrics,
  MonthSummary,
  BranchSummary,
  WeekSummary,
} from '../../src/types/index.js';

// ============================================================
// Default mapping config (바디움 기준)
// ============================================================

export function getDefaultMappingConfig(): Omit<AdMappingConfig, 'id' | 'projectId' | 'updatedAt'> {
  return {
    branches: [
      { suffix: '서초', fullName: '서초본점' },
      { suffix: '수원', fullName: '수원점' },
      { suffix: '울산', fullName: '울산점' },
      { suffix: '광주', fullName: '광주점' },
      { suffix: '양산', fullName: '양산점' },
      { suffix: '천안', fullName: '천안점' },
      { suffix: '노원', fullName: '노원점' },
      { suffix: '대구', fullName: '대구점' },
      { suffix: '전주', fullName: '전주점' },
      { suffix: '제주', fullName: '제주점' },
      { suffix: '잠실', fullName: '잠실점' },
      { suffix: '남양주', fullName: '남양주점' },
    ],
    targetKeywords: [
      { keyword: '잠재고객', label: '잠재' },
      { keyword: '잠재', label: '잠재' },
      { keyword: '전환', label: '전환' },
    ],
    creativePatterns: [
      { pattern: '체험권.*VIP', label: '체험권(VIP)' },
      { pattern: '체험권.*산후관리', label: '체험권(산후관리)' },
      { pattern: '체험권.*E큐브', label: '체험권(E큐브스파)' },
      { pattern: '체험권.*움핏', label: '체험권(움핏)' },
      { pattern: '움핏', label: '체험권(움핏)' },
      { pattern: '체험단', label: '체험단' },
      { pattern: '체험권', label: '체험권(기타)' },
    ],
    categoryDefault: 'META',
  };
}

// ============================================================
// CSV Parsing
// ============================================================

export interface ParsedRow {
  date: string;        // ISO date
  campaignName: string;
  adSetName: string;
  adName: string;
  impressions: number;
  clicks: number;
  cost: number;
  formRegistrations: number;  // 등록
  leadRegistrations: number;  // 잠재 고객
}

/** Meta CSV 컬럼명 매핑 (한글/영문 모두 지원) */
const COLUMN_ALIASES: Record<string, keyof ParsedRow> = {
  '일': 'date',
  'day': 'date',
  'date': 'date',
  '캠페인 이름': 'campaignName',
  'campaign name': 'campaignName',
  '광고 세트 이름': 'adSetName',
  'ad set name': 'adSetName',
  '광고 이름': 'adName',
  'ad name': 'adName',
  '노출': 'impressions',
  'impressions': 'impressions',
  '링크 클릭': 'clicks',
  'link clicks': 'clicks',
  '클릭수': 'clicks',
  '지출 금액 (krw)': 'cost',
  'amount spent (krw)': 'cost',
  '지출 금액': 'cost',
  '등록': 'formRegistrations',
  'registrations': 'formRegistrations',
  '등록 완료': 'formRegistrations',
  '잠재 고객': 'leadRegistrations',
  'leads': 'leadRegistrations',
};

function normalizeColumnName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Excel serial date → ISO string */
function excelDateToISO(serial: number): string {
  // Excel serial: days since 1899-12-30
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  return d.toISOString().split('T')[0];
}

function parseDate(val: string | number): string {
  if (typeof val === 'number' || (!isNaN(Number(val)) && Number(val) > 40000)) {
    return excelDateToISO(Number(val));
  }
  // Try ISO / common date formats
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return val.toString();
}

function parseNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export function parseCsvText(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(normalizeColumnName);

  // Map header indices
  const colMap: Partial<Record<keyof ParsedRow, number>> = {};
  for (let i = 0; i < headers.length; i++) {
    const alias = COLUMN_ALIASES[headers[i]];
    if (alias) colMap[alias] = i;
  }

  if (colMap.date === undefined || colMap.campaignName === undefined) {
    throw new Error('CSV에 필수 컬럼(일, 캠페인 이름)이 없습니다.');
  }

  const rows: ParsedRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const vals = lines[r].split(delimiter);
    if (vals.length < 2) continue;

    const get = (key: keyof ParsedRow) =>
      colMap[key] !== undefined ? vals[colMap[key]!]?.trim() ?? '' : '';

    const dateStr = get('date');
    if (!dateStr) continue;

    rows.push({
      date: parseDate(dateStr),
      campaignName: get('campaignName'),
      adSetName: get('adSetName'),
      adName: get('adName'),
      impressions: parseNumber(get('impressions')),
      clicks: parseNumber(get('clicks')),
      cost: parseNumber(get('cost')),
      formRegistrations: parseNumber(get('formRegistrations')),
      leadRegistrations: parseNumber(get('leadRegistrations')),
    });
  }

  return rows;
}

// ============================================================
// Mapping Logic
// ============================================================

export function extractBranch(
  adName: string,
  adSetName: string,
  campaignName: string,
  branches: AdMappingBranch[],
): string | null {
  // 1) 광고이름 끝 접미사에서 지점 추출 (가장 정확)
  for (const b of branches) {
    if (adName.endsWith(`_${b.suffix}`) || adName.endsWith(`(${b.suffix})`)) {
      return b.fullName;
    }
  }
  // 2) 광고이름 내 지점명
  for (const b of branches) {
    if (adName.includes(b.suffix)) return b.fullName;
  }
  // 3) 광고세트 이름에서
  for (const b of branches) {
    if (adSetName.includes(`${b.suffix}점`) || adSetName.includes(`${b.suffix}본점`)) {
      return b.fullName;
    }
    if (adSetName.includes(b.suffix)) return b.fullName;
  }
  // 4) 캠페인 이름에서
  for (const b of branches) {
    if (campaignName.includes(b.suffix)) return b.fullName;
  }
  return null;
}

export function extractTarget(
  campaignName: string,
  keywords: AdMappingTargetKeyword[],
): string {
  for (const kw of keywords) {
    if (campaignName.includes(kw.keyword)) return kw.label;
  }
  return '기타';
}

export function extractCreativeName(
  adName: string,
  patterns: AdMappingCreativePattern[],
): string {
  for (const p of patterns) {
    try {
      if (new RegExp(p.pattern, 'i').test(adName)) return p.label;
    } catch {
      // 잘못된 정규식 패턴은 문자열 포함으로 폴백
      if (adName.includes(p.pattern)) return p.label;
    }
  }
  return '기타';
}

export function calculateWeekNumber(date: Date): number {
  const day = date.getDate();
  return Math.min(Math.ceil(day / 7), 5);
}

export function formatMonth(date: Date): string {
  const y = date.getFullYear() % 100;
  const m = date.getMonth() + 1;
  return `${y}년 ${m}월`;
}

export interface TransformResult {
  entry: Omit<AdReportEntry, 'id' | 'createdAt'> | null;
  error: string | null;
}

export function transformRow(
  raw: ParsedRow,
  config: AdMappingConfig,
  projectId: string,
  uploadBatchId: string,
): TransformResult {
  const date = new Date(raw.date);
  if (isNaN(date.getTime())) {
    return { entry: null, error: `잘못된 날짜: ${raw.date}` };
  }

  const branch = extractBranch(raw.adName, raw.adSetName, raw.campaignName, config.branches);
  if (!branch) {
    return { entry: null, error: `지점을 추출할 수 없음: ${raw.adName}` };
  }

  const target = extractTarget(raw.campaignName, config.targetKeywords);
  const targetLabel = `${target}-${branch}`;
  const creativeName = extractCreativeName(raw.adName, config.creativePatterns);
  const category = config.categoryDefault || 'META';
  const cost = raw.cost;
  const registrations = raw.formRegistrations + raw.leadRegistrations;

  return {
    entry: {
      projectId,
      uploadBatchId,
      month: formatMonth(date),
      weekNumber: calculateWeekNumber(date),
      category,
      adChannel: `${category}-${branch}`,
      target: targetLabel,
      creativeName,
      branch,
      date: raw.date,
      campaignGroup: `${category}_${target}_${branch}`,
      adGroupCreative: raw.adSetName || raw.adName,
      impressions: raw.impressions,
      clicks: raw.clicks,
      cost,
      costExVat: cost,
      costInVat: cost,
      registrations,
      rawCampaignName: raw.campaignName,
      rawAdSetName: raw.adSetName,
      rawAdName: raw.adName,
    },
    error: null,
  };
}

// ============================================================
// Metrics Calculation
// ============================================================

function safeDivide(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

export function calculateMetrics(
  impressions: number,
  clicks: number,
  cost: number,
  registrations: number,
): Omit<ReportMetrics, 'impressions' | 'clicks' | 'cost' | 'registrations'> {
  return {
    cpm: safeDivide(cost, impressions) !== null ? (cost / impressions) * 1000 : null,
    ctr: safeDivide(clicks, impressions),
    cpc: safeDivide(cost, clicks),
    cpa: safeDivide(cost, registrations),
    cvr: safeDivide(registrations, clicks),
  };
}

function buildMetrics(entries: AdReportEntry[]): ReportMetrics {
  const impressions = entries.reduce((s, e) => s + e.impressions, 0);
  const clicks = entries.reduce((s, e) => s + e.clicks, 0);
  const cost = entries.reduce((s, e) => s + e.cost, 0);
  const registrations = entries.reduce((s, e) => s + e.registrations, 0);
  return { impressions, clicks, cost, registrations, ...calculateMetrics(impressions, clicks, cost, registrations) };
}

// ============================================================
// Aggregation
// ============================================================

export function aggregateByMonth(entries: AdReportEntry[]): MonthSummary[] {
  const groups = new Map<string, AdReportEntry[]>();
  for (const e of entries) {
    if (!groups.has(e.month)) groups.set(e.month, []);
    groups.get(e.month)!.push(e);
  }

  const results: MonthSummary[] = [];
  for (const [month, items] of groups) {
    const dates = items.map((e) => e.date).sort();
    results.push({
      month,
      period: `${dates[0]} ~ ${dates[dates.length - 1]}`,
      ...buildMetrics(items),
    });
  }

  return results.sort((a, b) => a.month.localeCompare(b.month));
}

export function aggregateByBranch(entries: AdReportEntry[]): BranchSummary[] {
  const groups = new Map<string, AdReportEntry[]>();
  for (const e of entries) {
    if (!groups.has(e.branch)) groups.set(e.branch, []);
    groups.get(e.branch)!.push(e);
  }

  const results: BranchSummary[] = [];
  for (const [branch, items] of groups) {
    results.push({ branch, ...buildMetrics(items) });
  }

  return results.sort((a, b) => a.branch.localeCompare(b.branch));
}

export function aggregateByWeek(entries: AdReportEntry[]): WeekSummary[] {
  const groups = new Map<number, AdReportEntry[]>();
  for (const e of entries) {
    if (!groups.has(e.weekNumber)) groups.set(e.weekNumber, []);
    groups.get(e.weekNumber)!.push(e);
  }

  const results: WeekSummary[] = [];
  for (const [weekNumber, items] of groups) {
    results.push({ weekNumber, ...buildMetrics(items) });
  }

  return results.sort((a, b) => a.weekNumber - b.weekNumber);
}
