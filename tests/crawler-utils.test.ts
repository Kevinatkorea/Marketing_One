import { describe, it, expect } from 'vitest';

// crawler.ts의 유틸리티 함수를 테스트하기 위해 직접 로직을 복제하여 테스트
// (내부 함수는 export되지 않으므로 로직 기반 테스트)

describe('URL 추출 (extractUrl 로직)', () => {
  function extractUrl(raw: string): string {
    const m = raw.match(/https?:\/\/[^\s]+/);
    return m ? m[0] : raw.trim();
  }

  it('순수 URL 반환', () => {
    expect(extractUrl('https://cafe.naver.com/test/123')).toBe('https://cafe.naver.com/test/123');
  });

  it('제목+URL 혼합에서 URL만 추출', () => {
    expect(extractUrl('봄 신상품 리뷰 https://cafe.naver.com/test/123')).toBe('https://cafe.naver.com/test/123');
  });

  it('빈 문자열이면 빈 문자열 반환', () => {
    expect(extractUrl('')).toBe('');
  });

  it('URL 없으면 원본 트림 반환', () => {
    expect(extractUrl('  제목만 있는 경우  ')).toBe('제목만 있는 경우');
  });
});

describe('네이버 카페 URL 파싱 (parseNaverCafeUrl 로직)', () => {
  function parseNaverCafeUrl(url: string): { cafeName: string; articleId: string } | null {
    let m = url.match(/cafe\.naver\.com\/ca-fe\/web\/cafes\/([^/?#]+)\/articles\/(\d+)/);
    if (m) return { cafeName: m[1], articleId: m[2] };
    m = url.match(/cafe\.naver\.com\/([^/?#]+)\/(\d+)/);
    if (m) return { cafeName: m[1], articleId: m[2] };
    return null;
  }

  it('모바일 URL 형식 파싱', () => {
    const result = parseNaverCafeUrl('https://m.cafe.naver.com/ca-fe/web/cafes/testcafe/articles/12345');
    expect(result).toEqual({ cafeName: 'testcafe', articleId: '12345' });
  });

  it('데스크탑 URL 형식 파싱', () => {
    const result = parseNaverCafeUrl('https://cafe.naver.com/testcafe/12345');
    expect(result).toEqual({ cafeName: 'testcafe', articleId: '12345' });
  });

  it('비매칭 URL은 null', () => {
    expect(parseNaverCafeUrl('https://blog.naver.com/test')).toBeNull();
    expect(parseNaverCafeUrl('https://google.com')).toBeNull();
  });

  it('쿼리 파라미터가 있어도 파싱', () => {
    const result = parseNaverCafeUrl('https://cafe.naver.com/testcafe/12345?ref=kakao');
    expect(result).toEqual({ cafeName: 'testcafe', articleId: '12345' });
  });
});

describe('네이버 블로그 URL 감지', () => {
  function isNaverBlog(url: string): boolean {
    return /blog\.naver\.com/.test(url);
  }

  it('네이버 블로그 URL 감지', () => {
    expect(isNaverBlog('https://blog.naver.com/testuser/123')).toBe(true);
    expect(isNaverBlog('https://m.blog.naver.com/testuser/123')).toBe(true);
  });

  it('비블로그 URL은 false', () => {
    expect(isNaverBlog('https://cafe.naver.com/test')).toBe(false);
    expect(isNaverBlog('https://google.com')).toBe(false);
  });
});

describe('ID 생성 (generateIdFromItems 로직)', () => {
  function generateIdFromItems(items: { id: string }[], prefix: string): string {
    if (items.length === 0) return `${prefix}_001`;
    let maxNum = 0;
    for (const item of items) {
      const match = item.id.match(/_(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `${prefix}_${String(maxNum + 1).padStart(3, '0')}`;
  }

  it('빈 배열이면 001', () => {
    expect(generateIdFromItems([], 'viral')).toBe('viral_001');
  });

  it('기존 항목 다음 번호', () => {
    const items = [{ id: 'viral_001' }, { id: 'viral_002' }, { id: 'viral_003' }];
    expect(generateIdFromItems(items, 'viral')).toBe('viral_004');
  });

  it('비연속 번호에서 최대값 + 1', () => {
    const items = [{ id: 'viral_001' }, { id: 'viral_010' }];
    expect(generateIdFromItems(items, 'viral')).toBe('viral_011');
  });

  it('3자리 패딩', () => {
    const items = [{ id: 'prod_099' }];
    expect(generateIdFromItems(items, 'prod')).toBe('prod_100');
  });
});
