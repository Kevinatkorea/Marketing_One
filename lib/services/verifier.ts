/**
 * 가이드 적합성 검증 엔진 — 2단계: 사전 체크리스트 + AI 분석
 */
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { Guide, VerificationDetail } from '../../src/types/index.js';
import { crawlUrl, type CrawlResult } from './crawler.js';

export interface VerifyResult {
  result: 'ok' | 'warning' | 'fail';
  score: number;
  grade: 'green' | 'yellow' | 'red';
  details: VerificationDetail[];
  issues: string[];
}

// Phase A: 사전 체크리스트 (AI 호출 없이 비용 절감)
function preCheck(crawl: CrawlResult, guide: Guide): { details: VerificationDetail[]; autoFail: boolean } {
  const details: VerificationDetail[] = [];
  let autoFail = false;

  for (const rule of guide.verificationRules) {
    const config = rule.config as Record<string, unknown>;

    if (rule.ruleId === 'required_keywords' || rule.name.includes('키워드 포함')) {
      const keywords = (config.keywords as string[]) || [];
      const minMatch = (config.minMatch as number) || 1;
      const textLower = crawl.text.toLowerCase();
      const matched = keywords.filter((kw) => textLower.includes(kw.toLowerCase()));
      const passed = matched.length >= minMatch;
      const ratio = keywords.length > 0 ? matched.length / keywords.length : 0;
      details.push({
        ruleId: rule.ruleId,
        passed,
        score: Math.round(ratio * rule.weight),
        note: `${matched.length}/${keywords.length} 키워드 포함 (최소 ${minMatch})`,
      });
      if (!passed && rule.isAutoFail) autoFail = true;
    } else if (rule.ruleId === 'forbidden_keywords' || rule.name.includes('금지')) {
      const keywords = (config.keywords as string[]) || [];
      const textLower = crawl.text.toLowerCase();
      const found = keywords.filter((kw) => textLower.includes(kw.toLowerCase()));
      const passed = found.length === 0;
      details.push({
        ruleId: rule.ruleId,
        passed,
        score: passed ? rule.weight : 0,
        note: passed ? '금지 키워드 없음' : `금지 키워드 발견: ${found.join(', ')}`,
      });
      if (!passed && rule.isAutoFail) autoFail = true;
    } else if (rule.ruleId === 'content_structure' || rule.name.includes('구조')) {
      const requireImages = config.requireImages as boolean;
      const requirePurchaseLink = config.requirePurchaseLink as boolean;
      const minLength = (config.minLength as number) || 300;

      const issues: string[] = [];
      if (requireImages && crawl.imageCount === 0) issues.push('이미지 없음');
      if (requirePurchaseLink && crawl.linkCount === 0) issues.push('링크 없음');
      if (crawl.charCount < minLength) issues.push(`글자수 부족 (${crawl.charCount}/${minLength})`);

      const passed = issues.length === 0;
      const ratio = passed ? 1 : Math.max(0, 1 - issues.length * 0.33);
      details.push({
        ruleId: rule.ruleId,
        passed,
        score: Math.round(ratio * rule.weight),
        note: passed
          ? `이미지 ${crawl.imageCount}개, 링크 ${crawl.linkCount}개, ${crawl.charCount}자`
          : issues.join(', '),
      });
      if (!passed && rule.isAutoFail) autoFail = true;
    } else {
      // Tone check, naver policy 등은 Phase B (AI)에서 처리
      details.push({
        ruleId: rule.ruleId,
        passed: true,
        score: 0, // AI 분석 후 업데이트
        note: 'AI 분석 대기',
      });
    }
  }

  return { details, autoFail };
}

// Phase B: AI 분석 (톤앤매너, 정책 준수)
async function aiAnalysis(
  crawl: CrawlResult,
  guide: Guide,
  details: VerificationDetail[],
): Promise<VerificationDetail[]> {
  const aiRules = guide.verificationRules.filter(
    (r) => r.ruleId === 'tone_check' || r.ruleId === 'naver_policy'
      || r.name.includes('톤') || r.name.includes('정책'),
  );

  if (aiRules.length === 0 && !guide.pdfContent) return details;

  const contentSnippet = crawl.text.slice(0, 3000);
  const customGuidelines = guide.customGuidelines || '';
  const pdfSection = guide.pdfContent
    ? `\n## 원본 가이드 문서 (PDF)\n${guide.pdfContent.slice(0, 3000)}\n\n위 PDF 가이드를 기준으로 콘텐츠가 가이드를 잘 따르고 있는지 비교 분석해주세요.\n`
    : '';

  try {
    const { text: aiResult } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: `바이럴 마케팅 콘텐츠를 검증해주세요.

## 콘텐츠
${contentSnippet}

## 가이드라인
${customGuidelines}
${pdfSection}
## 검증 항목
${aiRules.map((r) => `- ${r.name}: ${JSON.stringify(r.config)}`).join('\n')}
${guide.pdfContent ? '- pdf_compliance: PDF 원본 가이드 준수 여부 (가이드 내용 vs 실제 콘텐츠 비교)' : ''}

각 항목에 대해 JSON 배열로 응답하세요. 각 항목:
{"ruleId": "규칙ID", "passed": true/false, "scoreRatio": 0.0~1.0, "note": "설명"}

JSON 배열만 출력하세요.`,
      maxOutputTokens: 500,
    });

    // Parse AI response
    const jsonMatch = aiResult.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const aiDetails = JSON.parse(jsonMatch[0]) as Array<{
        ruleId: string;
        passed: boolean;
        scoreRatio: number;
        note: string;
      }>;

      for (const ai of aiDetails) {
        const rule = aiRules.find((r) => r.ruleId === ai.ruleId);
        if (!rule) continue;
        const idx = details.findIndex((d) => d.ruleId === ai.ruleId);
        if (idx >= 0) {
          details[idx] = {
            ruleId: ai.ruleId,
            passed: ai.passed,
            score: Math.round(ai.scoreRatio * rule.weight),
            note: ai.note,
          };
        }
      }
    }
  } catch {
    // AI 실패 시 기본 점수 부여
    for (const rule of aiRules) {
      const idx = details.findIndex((d) => d.ruleId === rule.ruleId);
      if (idx >= 0 && details[idx].note === 'AI 분석 대기') {
        details[idx] = {
          ruleId: rule.ruleId,
          passed: true,
          score: Math.round(rule.weight * 0.5),
          note: 'AI 분석 실패 - 기본 점수 적용',
        };
      }
    }
  }

  return details;
}

export async function verifyViral(url: string, guide: Guide): Promise<VerifyResult> {
  // Step 1: Crawl
  const crawl = await crawlUrl(url);
  if (!crawl.success) {
    return {
      result: 'fail',
      score: 0,
      grade: 'red',
      details: [{
        ruleId: 'crawl',
        passed: false,
        score: 0,
        note: `크롤링 실패: ${crawl.error}`,
      }],
      issues: [`URL 접근 실패: ${crawl.error}`],
    };
  }

  // Step 2: Phase A — Pre-check
  const { details, autoFail } = preCheck(crawl, guide);

  if (autoFail) {
    const totalScore = details.reduce((sum, d) => sum + d.score, 0);
    return {
      result: 'fail',
      score: totalScore,
      grade: 'red',
      details,
      issues: details.filter((d) => !d.passed).map((d) => d.note),
    };
  }

  // Step 3: Phase B — AI Analysis
  const finalDetails = await aiAnalysis(crawl, guide, details);

  // Step 4: Calculate score
  const totalScore = finalDetails.reduce((sum, d) => sum + d.score, 0);
  const maxScore = guide.verificationRules.reduce((sum, r) => sum + r.weight, 0);
  const normalizedScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let result: 'ok' | 'warning' | 'fail';
  let grade: 'green' | 'yellow' | 'red';
  if (normalizedScore >= 90) {
    result = 'ok';
    grade = 'green';
  } else if (normalizedScore >= 75) {
    result = 'warning';
    grade = 'yellow';
  } else {
    result = 'fail';
    grade = 'red';
  }

  return {
    result,
    score: normalizedScore,
    grade,
    details: finalDetails,
    issues: finalDetails.filter((d) => !d.passed).map((d) => d.note),
  };
}
