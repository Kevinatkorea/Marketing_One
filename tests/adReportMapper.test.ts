import { describe, it, expect } from 'vitest';
import {
  parseCsvText,
  extractBranch,
  extractTarget,
  extractCreativeName,
  calculateWeekNumber,
  formatMonth,
  transformRow,
  calculateMetrics,
  aggregateByMonth,
  aggregateByBranch,
  aggregateByWeek,
  getDefaultMappingConfig,
} from '../lib/services/adReportMapper';
import type { AdMappingConfig, AdReportEntry } from '../src/types';

// 테스트용 기본 매핑 설정
const defaults = getDefaultMappingConfig();
const config: AdMappingConfig = {
  id: 'test',
  projectId: 'proj_001',
  ...defaults,
  updatedAt: '2026-03-31T00:00:00Z',
};

// ============================================================
// extractBranch
// ============================================================

describe('extractBranch', () => {
  it('광고이름 끝 접미사 _서초 → 서초본점', () => {
    expect(extractBranch('체험권(VIP)_서초', '', '', config.branches)).toBe('서초본점');
  });

  it('광고이름 끝 접미사 _수원 → 수원점', () => {
    expect(extractBranch('체험단(리얼모델_6월)_수원', '', '', config.branches)).toBe('수원점');
  });

  it('광고이름 내 울산 포함 → 울산점', () => {
    expect(extractBranch('EMS스파_울산', '', '', config.branches)).toBe('울산점');
  });

  it('광고세트에서 지점 추출', () => {
    expect(extractBranch('알수없는광고', '잠재고객_서초점(권)', '', config.branches)).toBe('서초본점');
  });

  it('캠페인에서 지점 추출', () => {
    expect(extractBranch('알수없는광고', '알수없는세트', '(비스킷)바디움_잠재고객_울산', config.branches)).toBe('울산점');
  });

  it('매칭 실패 시 null 반환', () => {
    expect(extractBranch('알수없음', '알수없음', '알수없음', config.branches)).toBeNull();
  });

  it('잠실 → 잠실점', () => {
    expect(extractBranch('체험권_잠실', '', '', config.branches)).toBe('잠실점');
  });
});

// ============================================================
// extractTarget
// ============================================================

describe('extractTarget', () => {
  it('캠페인에 잠재고객 포함 → 잠재', () => {
    expect(extractTarget('(비스킷)바디움_잠재고객캠페인', config.targetKeywords)).toBe('잠재');
  });

  it('캠페인에 전환 포함 → 전환', () => {
    expect(extractTarget('(비스킷)바디움_전환_서초', config.targetKeywords)).toBe('전환');
  });

  it('매칭 실패 → 기타', () => {
    expect(extractTarget('알수없는캠페인', config.targetKeywords)).toBe('기타');
  });
});

// ============================================================
// extractCreativeName
// ============================================================

describe('extractCreativeName', () => {
  it('체험권(VIP) → 체험권(VIP)', () => {
    expect(extractCreativeName('체험권(VIP)_서초', config.creativePatterns)).toBe('체험권(VIP)');
  });

  it('체험단 → 체험단', () => {
    expect(extractCreativeName('체험단(리얼모델_6월)_수원', config.creativePatterns)).toBe('체험단');
  });

  it('E큐브스파 → 체험권(E큐브스파)', () => {
    expect(extractCreativeName('체험권(E큐브_6월)_울산', config.creativePatterns)).toBe('체험권(E큐브스파)');
  });

  it('움핏 → 체험권(움핏)', () => {
    expect(extractCreativeName('움핏2월_양식변경_서초', config.creativePatterns)).toBe('체험권(움핏)');
  });

  it('산후관리 → 체험권(산후관리)', () => {
    expect(extractCreativeName('체험권(산후관리)_수원', config.creativePatterns)).toBe('체험권(산후관리)');
  });

  it('매칭 실패 → 기타', () => {
    expect(extractCreativeName('완전히알수없는소재', config.creativePatterns)).toBe('기타');
  });
});

// ============================================================
// calculateWeekNumber / formatMonth
// ============================================================

describe('calculateWeekNumber', () => {
  it('1일 → 1주차', () => expect(calculateWeekNumber(new Date('2026-03-01'))).toBe(1));
  it('7일 → 1주차', () => expect(calculateWeekNumber(new Date('2026-03-07'))).toBe(1));
  it('8일 → 2주차', () => expect(calculateWeekNumber(new Date('2026-03-08'))).toBe(2));
  it('15일 → 3주차', () => expect(calculateWeekNumber(new Date('2026-03-15'))).toBe(3));
  it('29일 → 5주차', () => expect(calculateWeekNumber(new Date('2026-03-29'))).toBe(5));
  it('31일 → 5주차 (cap)', () => expect(calculateWeekNumber(new Date('2026-03-31'))).toBe(5));
});

describe('formatMonth', () => {
  it('2026-03-15 → 26년 3월', () => expect(formatMonth(new Date('2026-03-15'))).toBe('26년 3월'));
  it('2025-12-01 → 25년 12월', () => expect(formatMonth(new Date('2025-12-01'))).toBe('25년 12월'));
  it('2024-10-05 → 24년 10월', () => expect(formatMonth(new Date('2024-10-05'))).toBe('24년 10월'));
});

// ============================================================
// parseCsvText
// ============================================================

describe('parseCsvText', () => {
  it('탭 구분 CSV 파싱', () => {
    const csv = [
      '일\t캠페인 이름\t광고 세트 이름\t광고 이름\t노출\t링크 클릭\t통화\t지출 금액 (KRW)\t등록\t잠재 고객',
      '2026-03-15\t(비스킷)바디움_잠재고객캠페인\t잠재고객_서초점(권)\t체험권(VIP)_서초\t1587\t25\tKRW\t45759\t\t4',
    ].join('\n');

    const rows = parseCsvText(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].campaignName).toBe('(비스킷)바디움_잠재고객캠페인');
    expect(rows[0].adName).toBe('체험권(VIP)_서초');
    expect(rows[0].impressions).toBe(1587);
    expect(rows[0].clicks).toBe(25);
    expect(rows[0].cost).toBe(45759);
    expect(rows[0].leadRegistrations).toBe(4);
  });

  it('쉼표 구분 CSV 파싱', () => {
    const csv = [
      '일,캠페인 이름,광고 세트 이름,광고 이름,노출,링크 클릭,지출 금액 (KRW),잠재 고객',
      '2026-03-15,(비스킷)바디움_전환_수원,전환_수원점,체험단_수원,500,10,20000,3',
    ].join('\n');

    const rows = parseCsvText(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].cost).toBe(20000);
    expect(rows[0].leadRegistrations).toBe(3);
  });

  it('빈 CSV → 빈 배열', () => {
    expect(parseCsvText('')).toHaveLength(0);
  });

  it('필수 컬럼 없으면 에러', () => {
    expect(() => parseCsvText('col1\tcol2\n1\t2')).toThrow();
  });
});

// ============================================================
// transformRow
// ============================================================

describe('transformRow', () => {
  it('정상 변환', () => {
    const result = transformRow(
      {
        date: '2026-03-15',
        campaignName: '(비스킷)바디움_잠재고객캠페인',
        adSetName: '잠재고객_서초점(권)',
        adName: '체험권(VIP)_서초',
        impressions: 1587,
        clicks: 25,
        cost: 45759,
        formRegistrations: 0,
        leadRegistrations: 4,
      },
      config,
      'proj_001',
      'batch_001',
    );

    expect(result.error).toBeNull();
    expect(result.entry).not.toBeNull();
    expect(result.entry!.branch).toBe('서초본점');
    expect(result.entry!.target).toBe('잠재-서초본점');
    expect(result.entry!.creativeName).toBe('체험권(VIP)');
    expect(result.entry!.month).toBe('26년 3월');
    expect(result.entry!.weekNumber).toBe(3);
    expect(result.entry!.campaignGroup).toBe('META_잠재_서초본점');
    expect(result.entry!.adChannel).toBe('META-서초본점');
    expect(result.entry!.registrations).toBe(4);
  });

  it('지점 추출 실패 시 에러', () => {
    const result = transformRow(
      {
        date: '2026-03-15',
        campaignName: '알수없음',
        adSetName: '알수없음',
        adName: '알수없음',
        impressions: 100,
        clicks: 5,
        cost: 1000,
        formRegistrations: 0,
        leadRegistrations: 0,
      },
      config,
      'proj_001',
      'batch_001',
    );

    expect(result.entry).toBeNull();
    expect(result.error).toContain('지점을 추출할 수 없음');
  });

  it('잘못된 날짜 시 에러', () => {
    const result = transformRow(
      {
        date: 'invalid',
        campaignName: '(비스킷)바디움_전환_서초',
        adSetName: '',
        adName: '체험단_서초',
        impressions: 100,
        clicks: 5,
        cost: 1000,
        formRegistrations: 0,
        leadRegistrations: 0,
      },
      config,
      'proj_001',
      'batch_001',
    );

    expect(result.entry).toBeNull();
    expect(result.error).toContain('날짜');
  });
});

// ============================================================
// calculateMetrics
// ============================================================

describe('calculateMetrics', () => {
  it('정상 계산', () => {
    const m = calculateMetrics(10000, 200, 500000, 20);
    expect(m.cpm).toBe(50000);
    expect(m.ctr).toBe(0.02);
    expect(m.cpc).toBe(2500);
    expect(m.cpa).toBe(25000);
    expect(m.cvr).toBe(0.1);
  });

  it('0으로 나눗셈 시 null', () => {
    const m = calculateMetrics(0, 0, 0, 0);
    expect(m.cpm).toBeNull();
    expect(m.ctr).toBeNull();
    expect(m.cpc).toBeNull();
    expect(m.cpa).toBeNull();
    expect(m.cvr).toBeNull();
  });
});

// ============================================================
// Aggregation
// ============================================================

function makeEntry(overrides: Partial<AdReportEntry>): AdReportEntry {
  return {
    id: 'adr_001',
    projectId: 'proj_001',
    uploadBatchId: 'batch_001',
    month: '26년 3월',
    weekNumber: 1,
    category: 'META',
    adChannel: 'META-서초본점',
    target: '잠재-서초본점',
    creativeName: '체험권(VIP)',
    branch: '서초본점',
    date: '2026-03-01',
    campaignGroup: 'META_잠재_서초본점',
    adGroupCreative: 'VIP 관리_서초',
    impressions: 1000,
    clicks: 50,
    cost: 100000,
    costExVat: 100000,
    costInVat: 100000,
    registrations: 10,
    rawCampaignName: '',
    rawAdSetName: '',
    rawAdName: '',
    createdAt: '2026-03-31T00:00:00Z',
    ...overrides,
  };
}

describe('aggregateByMonth', () => {
  it('월별 집계', () => {
    const entries = [
      makeEntry({ month: '26년 3월', impressions: 1000, clicks: 50, cost: 100000, registrations: 10 }),
      makeEntry({ month: '26년 3월', impressions: 2000, clicks: 100, cost: 200000, registrations: 20 }),
      makeEntry({ month: '26년 2월', impressions: 500, clicks: 25, cost: 50000, registrations: 5 }),
    ];
    const result = aggregateByMonth(entries);
    expect(result).toHaveLength(2);

    const mar = result.find((r) => r.month === '26년 3월')!;
    expect(mar.impressions).toBe(3000);
    expect(mar.clicks).toBe(150);
    expect(mar.cost).toBe(300000);
    expect(mar.registrations).toBe(30);
  });
});

describe('aggregateByBranch', () => {
  it('지점별 집계', () => {
    const entries = [
      makeEntry({ branch: '서초본점', cost: 100000, registrations: 10 }),
      makeEntry({ branch: '서초본점', cost: 200000, registrations: 20 }),
      makeEntry({ branch: '수원점', cost: 50000, registrations: 5 }),
    ];
    const result = aggregateByBranch(entries);
    expect(result).toHaveLength(2);

    const seo = result.find((r) => r.branch === '서초본점')!;
    expect(seo.cost).toBe(300000);
    expect(seo.registrations).toBe(30);
  });
});

describe('aggregateByWeek', () => {
  it('주차별 집계', () => {
    const entries = [
      makeEntry({ weekNumber: 1, cost: 100000 }),
      makeEntry({ weekNumber: 1, cost: 50000 }),
      makeEntry({ weekNumber: 2, cost: 200000 }),
    ];
    const result = aggregateByWeek(entries);
    expect(result).toHaveLength(2);
    expect(result[0].weekNumber).toBe(1);
    expect(result[0].cost).toBe(150000);
    expect(result[1].weekNumber).toBe(2);
    expect(result[1].cost).toBe(200000);
  });
});
