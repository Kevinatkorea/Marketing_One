/**
 * AI 프로바이더 공용 모듈
 *
 * 두 개의 프로바이더를 용도별로 분리 사용:
 * - analysisModel (Z.ai GLM-4.5-Flash): 검증·감성분석 — 빠른 분류/추출, 무료
 * - guideModel (Anthropic Claude Haiku 4.5): 가이드 자동 생성 — 구조화 출력 품질·속도 우수
 *
 * Z.ai는 OpenAI 호환 엔드포인트라 @ai-sdk/openai-compatible로 연결.
 * GLM-4.5는 reasoning 모델이라 thinking을 끄지 않으면 content가 빈 문자열로 반환됨.
 * 따라서 분류/추출 호출 시 `thinking.type = 'disabled'`를 providerOptions로 전달한다.
 *
 * 가이드 생성은 복잡한 13필드 JSON 스키마를 한 번에 채워야 해서 GLM-Flash로는
 * Vercel 30s 타임아웃을 자주 초과했음. Claude Haiku로 전환(5~10초).
 *
 * 환경변수: ZAI_API_KEY, ANTHROPIC_API_KEY
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';

const zaiKey = process.env.ZAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
console.log(
  `[ai.ts] ZAI_API_KEY present=${!!zaiKey} ANTHROPIC_API_KEY present=${!!anthropicKey}`
);

const zai = createOpenAICompatible({
  name: 'zai',
  apiKey: zaiKey,
  baseURL: 'https://api.z.ai/api/paas/v4',
});

const anthropic = createAnthropic({
  apiKey: anthropicKey,
});

/** 검증·감성분석용 — 무료 GLM-4.5-Flash (빠른 분류) */
export const analysisModel = zai('glm-4.5-flash');

/** 가이드 생성용 — Claude Haiku 4.5 (구조화 출력) */
export const guideModel = anthropic('claude-haiku-4-5-20251001');

/**
 * analysisModel(generateText/generateObject) 호출 시 함께 넘길 providerOptions.
 * GLM의 reasoning 모드를 끄기 위한 공용 설정.
 */
export const zaiProviderOptions = {
  zai: {
    thinking: { type: 'disabled' },
  },
} as const;
