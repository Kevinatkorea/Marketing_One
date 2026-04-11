/**
 * 가이드 자동 생성 서비스
 *
 * 프로젝트정보(카테고리·경쟁사·자사설명·핵심키워드)와 제품 정보를 입력으로 받아
 * Z.ai GLM 모델로 블로그 바이럴 마케팅 가이드를 구조화된 형태로 생성한다.
 *
 * 출력은 두 부분:
 * 1) 검증 룰 (VerificationRule[]) — verifier.ts 호환 형식 (required_keywords, forbidden_keywords, content_structure, tone_check, naver_policy)
 * 2) customGuidelines (markdown) — 사람이 읽는 내러티브 (타깃·톤·구성·Do/Don't·차별화 등)
 */
import { generateText, Output } from 'ai';
import { z } from 'zod';
import type {
  Guide,
  Product,
  ProjectInfo,
  VerificationRule,
} from '../../src/types/index.js';
import { guideModel } from './ai.js';

// --- LLM 출력 스키마 ----------------------------------------------------

const GuideOutputSchema = z.object({
  title: z.string().describe('가이드 제목'),
  summary: z.string().describe('가이드 요약 (2~3 문장)'),
  targetAudience: z.string().describe('핵심 타깃 독자'),
  toneAndManner: z.string().describe('톤앤매너 가이드'),
  requiredKeywords: z
    .array(z.string())
    .describe('본문에 반드시 포함되어야 할 키워드. 자사 제품명·카테고리·핵심키워드를 포함해 최소 3개 이상.'),
  forbiddenKeywords: z
    .array(z.string())
    .describe('사용 금지 키워드 (경쟁사 브랜드명, 과장 광고 표현 등)'),
  minLength: z.number().int().describe('본문 최소 글자수. 300 이상이어야 함.'),
  minRequiredKeywordMatch: z
    .number()
    .int()
    .describe('requiredKeywords 중 몇 개 이상 포함되어야 하는지. 1 이상.'),
  blogStructure: z
    .array(z.string())
    .describe('블로그 글 구성 단계별 가이드 (예: ["1. 인트로 — 문제 제기", "2. 본문 — 해결책 소개", ...])'),
  sampleHooks: z.array(z.string()).describe('후킹용 도입부 샘플 문장 3~5개'),
  competitorDifferentiation: z.string().describe('경쟁사 대비 차별화 포인트를 강조하는 방법'),
  doList: z.array(z.string()).describe('반드시 지켜야 할 규칙 (Do)'),
  dontList: z.array(z.string()).describe('하지 말아야 할 것 (Don\'t)'),
});

export type GuideOutput = z.infer<typeof GuideOutputSchema>;

// --- 프롬프트 ----------------------------------------------------------

function buildPrompt(info: ProjectInfo, product: Product, additionalNotes?: string): string {
  const competitorsText = info.competitors.length
    ? info.competitors
        .map(
          (c, i) =>
            `  ${i + 1}. ${c.name}${c.keywords.length ? ` — 키워드: ${c.keywords.join(', ')}` : ''}`
        )
        .join('\n')
    : '  (등록된 경쟁사 없음)';

  const notesSection = additionalNotes?.trim()
    ? `\n## 이번 가이드에만 반영할 추가 요청사항\n${additionalNotes.trim()}\n`
    : '';

  const projectNotesSection = info.additionalNotes?.trim()
    ? `\n## 프로젝트 공통 추가 메모\n${info.additionalNotes.trim()}\n`
    : '';

  return `다음 프로젝트 정보와 제품 정보를 기반으로, 블로그 바이럴 마케팅 작성 가이드를 작성해주세요.

## 카테고리
- 대분류: ${info.categoryL1}
- 소분류: ${info.categoryL2 || '(미지정)'}

## 자사 제품/서비스 설명
${info.ownDescription}

## 핵심 키워드
${info.coreKeywords.join(', ')}

## 경쟁사
${competitorsText}

## 이번에 작성할 제품
- 이름: ${product.name}
- 카테고리: ${product.category}
- 설명: ${product.description}
${projectNotesSection}${notesSection}
## 요구사항
- requiredKeywords에는 자사 제품명(${product.name}), 카테고리 핵심 표현, 코어 키워드가 반드시 포함되어야 합니다.
- forbiddenKeywords에는 경쟁사 브랜드명과 네이버 정책상 금지되는 과장/의학적 표현을 포함하세요.
- 블로그 구성(blogStructure)은 실제 바이럴 작성자가 바로 따라할 수 있도록 단계별로 구체적이어야 합니다.
- 샘플 후킹 문장(sampleHooks)은 독자의 클릭과 체류를 유도할 수 있는 강력한 도입부여야 합니다.
- 경쟁사 차별화(competitorDifferentiation)는 자사 제품이 왜 더 나은지를 구체적으로 제시해야 합니다.
- 전체 톤은 자연스럽고 진솔한 사용자 후기 스타일이어야 합니다.`;
}

// --- 검증 룰 매핑 -------------------------------------------------------

function buildVerificationRules(output: GuideOutput): VerificationRule[] {
  return [
    {
      ruleId: 'required_keywords',
      name: '필수 키워드 포함',
      weight: 30,
      isAutoFail: false,
      config: {
        keywords: output.requiredKeywords,
        minMatch: output.minRequiredKeywordMatch,
      },
    },
    {
      ruleId: 'forbidden_keywords',
      name: '금지 키워드 미포함',
      weight: 20,
      isAutoFail: true,
      config: {
        keywords: output.forbiddenKeywords,
      },
    },
    {
      ruleId: 'content_structure',
      name: '콘텐츠 구조',
      weight: 20,
      isAutoFail: false,
      config: {
        minLength: output.minLength,
        requirePurchaseLink: false,
      },
    },
    {
      ruleId: 'tone_check',
      name: '톤앤매너',
      weight: 15,
      isAutoFail: false,
      config: {
        expected: output.toneAndManner,
      },
    },
    {
      ruleId: 'naver_policy',
      name: '네이버 정책 준수',
      weight: 15,
      isAutoFail: false,
      config: {},
    },
  ];
}

// --- customGuidelines (Markdown) 매핑 -----------------------------------

function buildCustomGuidelines(output: GuideOutput): string {
  const lines: string[] = [];
  lines.push(`# ${output.title}`);
  lines.push('');
  lines.push(output.summary);
  lines.push('');
  lines.push('## 타깃 독자');
  lines.push(output.targetAudience);
  lines.push('');
  lines.push('## 톤앤매너');
  lines.push(output.toneAndManner);
  lines.push('');
  lines.push('## 블로그 구성');
  output.blogStructure.forEach((step) => lines.push(`- ${step}`));
  lines.push('');
  lines.push('## 후킹 문장 샘플');
  output.sampleHooks.forEach((hook) => lines.push(`- ${hook}`));
  lines.push('');
  lines.push('## 경쟁사 대비 차별화 포인트');
  lines.push(output.competitorDifferentiation);
  lines.push('');
  lines.push('## Do');
  output.doList.forEach((d) => lines.push(`- ${d}`));
  lines.push('');
  lines.push("## Don't");
  output.dontList.forEach((d) => lines.push(`- ${d}`));
  lines.push('');
  lines.push('## 필수 포함 키워드');
  lines.push(output.requiredKeywords.join(', '));
  lines.push('');
  lines.push('## 사용 금지 키워드');
  lines.push(output.forbiddenKeywords.length ? output.forbiddenKeywords.join(', ') : '(없음)');
  return lines.join('\n');
}

// --- 외부에서 쓰는 엔트리 -----------------------------------------------

export interface GeneratedGuidePayload {
  verificationRules: VerificationRule[];
  customGuidelines: string;
  output: GuideOutput;
}

export async function generateGuideFromProjectInfo(
  projectInfo: ProjectInfo,
  product: Product,
  additionalNotes?: string
): Promise<GeneratedGuidePayload> {
  const prompt = buildPrompt(projectInfo, product, additionalNotes);

  const { output } = await generateText({
    model: guideModel,
    output: Output.object({ schema: GuideOutputSchema }),
    system:
      '당신은 한국어 블로그 바이럴 마케팅 가이드 작성 전문가입니다. 네이버 블로그/카페 바이럴 콘텐츠 작성자들이 참고할 수 있는 실전 가이드를 JSON 스키마에 맞춰 한국어로 작성합니다.',
    prompt,
  });

  return {
    verificationRules: buildVerificationRules(output),
    customGuidelines: buildCustomGuidelines(output),
    output,
  };
}

/**
 * Guide repository에 저장할 데이터를 구성 (id/createdAt/updatedAt 제외).
 */
export function buildGuideDraft(
  projectId: string,
  productId: string,
  payload: GeneratedGuidePayload
): Omit<Guide, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId,
    productId,
    version: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    verificationRules: payload.verificationRules,
    customGuidelines: payload.customGuidelines,
    pdfFileName: `${payload.output.title}.pdf`,
    isTemplate: false,
  };
}
