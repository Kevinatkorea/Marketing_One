/**
 * AI 프로바이더 공용 모듈 — Z.ai GLM (OpenAI 호환)
 *
 * Z.ai는 OpenAI 호환 엔드포인트를 제공하므로 @ai-sdk/openai-compatible로 연결한다.
 * 검증(verifier.ts)과 댓글 감성분석(sentiment.ts)에서 공유 사용.
 *
 * 모델 선택 기준:
 * - glm-4.5-flash: 무료, 한국어 지원 양호, 단순 분류/추출 작업에 충분
 *
 * 주의 — GLM-4.5는 reasoning 모델:
 * 기본값에서는 "thinking"에 토큰을 대부분 소모하여 실제 content가 빈 문자열로 반환된다.
 * 분류/추출 같은 작업에는 추론이 오히려 방해되므로 `thinking.type = 'disabled'`를 항상 전달한다.
 *
 * 환경변수: ZAI_API_KEY
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// 진단 로그: Vercel Functions 로그에서 env 주입 상태를 확인하기 위함
const zaiKey = process.env.ZAI_API_KEY;
console.log(
  `[ai.ts] ZAI_API_KEY present=${!!zaiKey} length=${zaiKey?.length ?? 0}`
);

const zai = createOpenAICompatible({
  name: 'zai',
  apiKey: zaiKey,
  baseURL: 'https://api.z.ai/api/paas/v4',
});

/** 기본 분석 모델 — 무료 GLM-4.5-Flash */
export const analysisModel = zai('glm-4.5-flash');

/**
 * generateText 호출 시 함께 넘길 providerOptions.
 * GLM의 reasoning 모드를 끄기 위한 공용 설정.
 */
export const zaiProviderOptions = {
  zai: {
    thinking: { type: 'disabled' },
  },
} as const;
