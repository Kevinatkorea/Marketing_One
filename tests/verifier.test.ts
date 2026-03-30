import { describe, it, expect } from 'vitest';
import { preCheck } from '../lib/services/verifier.js';
import type { CrawlResult } from '../lib/services/crawler.js';
import type { Guide } from '../src/types/index.js';

function makeCrawl(overrides: Partial<CrawlResult> = {}): CrawlResult {
  return {
    success: true,
    title: '테스트 포스트',
    text: '이것은 테스트 콘텐츠입니다. 봄 신상품 리뷰를 작성했습니다. 제품이 정말 좋습니다.',
    imageCount: 3,
    linkCount: 2,
    charCount: 600,
    links: ['https://example.com'],
    ...overrides,
  };
}

function makeGuide(rules: Guide['verificationRules'] = []): Guide {
  return {
    id: 'guide_001',
    projectId: 'proj_001',
    productId: 'prod_001',
    version: '1.0',
    verificationRules: rules,
    customGuidelines: '',
    isTemplate: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as Guide;
}

describe('preCheck', () => {
  describe('required_keywords', () => {
    const rule = {
      ruleId: 'required_keywords',
      name: '필수 키워드 포함',
      weight: 30,
      isAutoFail: false,
      config: { keywords: ['봄', '신상품', '리뷰'], minMatch: 2 },
    };

    it('모든 키워드 포함 시 통과', () => {
      const crawl = makeCrawl({ text: '봄 신상품 리뷰 작성' });
      const result = preCheck(crawl, makeGuide([rule]));
      expect(result.details[0].passed).toBe(true);
      expect(result.details[0].score).toBe(30);
      expect(result.autoFail).toBe(false);
    });

    it('부분 매칭 시 minMatch 이상이면 통과', () => {
      const crawl = makeCrawl({ text: '봄 리뷰 작성' });
      const result = preCheck(crawl, makeGuide([rule]));
      expect(result.details[0].passed).toBe(true);
    });

    it('minMatch 미만이면 실패', () => {
      const crawl = makeCrawl({ text: '안녕하세요' });
      const result = preCheck(crawl, makeGuide([rule]));
      expect(result.details[0].passed).toBe(false);
    });

    it('빈 키워드 목록이면 minMatch 미달로 실패', () => {
      const emptyRule = { ...rule, config: { keywords: [], minMatch: 1 } };
      const result = preCheck(makeCrawl(), makeGuide([emptyRule]));
      expect(result.details[0].passed).toBe(false);
    });

    it('isAutoFail이면 autoFail 트리거', () => {
      const autoFailRule = { ...rule, isAutoFail: true };
      const crawl = makeCrawl({ text: '관계없는 내용' });
      const result = preCheck(crawl, makeGuide([autoFailRule]));
      expect(result.autoFail).toBe(true);
    });
  });

  describe('forbidden_keywords', () => {
    const rule = {
      ruleId: 'forbidden_keywords',
      name: '금지 키워드 미사용',
      weight: 25,
      isAutoFail: true,
      config: { keywords: ['광고', '협찬'] },
    };

    it('금지 키워드 없으면 통과', () => {
      const crawl = makeCrawl({ text: '자연스러운 후기입니다' });
      const result = preCheck(crawl, makeGuide([rule]));
      expect(result.details[0].passed).toBe(true);
      expect(result.details[0].score).toBe(25);
    });

    it('금지 키워드 발견 시 실패 + autoFail', () => {
      const crawl = makeCrawl({ text: '이 글은 광고입니다' });
      const result = preCheck(crawl, makeGuide([rule]));
      expect(result.details[0].passed).toBe(false);
      expect(result.details[0].score).toBe(0);
      expect(result.autoFail).toBe(true);
    });

    it('대소문자 무시', () => {
      const crawl = makeCrawl({ text: '이 글은 협찬 리뷰' });
      const result = preCheck(crawl, makeGuide([rule]));
      expect(result.details[0].passed).toBe(false);
    });
  });

  describe('content_structure', () => {
    const rule = {
      ruleId: 'content_structure',
      name: '콘텐츠 구조',
      weight: 15,
      isAutoFail: false,
      config: { requirePurchaseLink: false, minLength: 500 },
    };

    it('글자수 충분하면 통과', () => {
      const crawl = makeCrawl({ charCount: 600 });
      const result = preCheck(crawl, makeGuide([rule]));
      expect(result.details[0].passed).toBe(true);
    });

    it('글자수 부족하면 실패', () => {
      const crawl = makeCrawl({ charCount: 200 });
      const result = preCheck(crawl, makeGuide([rule]));
      expect(result.details[0].passed).toBe(false);
      expect(result.details[0].note).toContain('글자수 부족');
    });

    it('링크 필수인데 없으면 실패', () => {
      const linkRule = { ...rule, config: { requirePurchaseLink: true, minLength: 100 } };
      const crawl = makeCrawl({ charCount: 200, linkCount: 0 });
      const result = preCheck(crawl, makeGuide([linkRule]));
      expect(result.details[0].passed).toBe(false);
      expect(result.details[0].note).toContain('링크 없음');
    });
  });

  describe('AI 규칙 (tone_check, naver_policy)', () => {
    it('AI 규칙은 대기 상태로 반환', () => {
      const rule = {
        ruleId: 'tone_check',
        name: '톤앤매너 AI 분석',
        weight: 20,
        isAutoFail: false,
        config: { toneGuide: '자연스러운 톤' },
      };
      const result = preCheck(makeCrawl(), makeGuide([rule]));
      expect(result.details[0].note).toBe('AI 분석 대기');
      expect(result.details[0].score).toBe(0);
    });
  });

  describe('복합 규칙', () => {
    it('여러 규칙 동시 적용', () => {
      const rules = [
        { ruleId: 'required_keywords', name: '필수 키워드', weight: 30, isAutoFail: false, config: { keywords: ['봄'], minMatch: 1 } },
        { ruleId: 'forbidden_keywords', name: '금지 키워드', weight: 25, isAutoFail: true, config: { keywords: ['스팸'] } },
        { ruleId: 'content_structure', name: '구조', weight: 15, isAutoFail: false, config: { minLength: 100 } },
      ];
      const crawl = makeCrawl({ text: '봄 신상품 리뷰', charCount: 200 });
      const result = preCheck(crawl, makeGuide(rules));
      expect(result.details).toHaveLength(3);
      expect(result.details[0].passed).toBe(true);  // required_keywords
      expect(result.details[1].passed).toBe(true);  // forbidden_keywords
      expect(result.details[2].passed).toBe(true);  // content_structure
      expect(result.autoFail).toBe(false);
    });
  });
});
