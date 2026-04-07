/**
 * 댓글 감성분석 서비스 — Z.ai GLM 기반
 */
import { generateText } from 'ai';
import { analysisModel, zaiProviderOptions } from './ai.js';

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1.0 ~ 1.0
  isNegative: boolean;
  category: string;
  priority: 'immediate' | 'high' | 'monitor' | 'ignore';
  responseRequired: boolean;
}

export async function analyzeComments(
  comments: Array<{ author: string; content: string }>,
): Promise<SentimentResult[]> {
  if (comments.length === 0) return [];

  const commentList = comments
    .map((c, i) => `[${i}] ${c.author}: ${c.content}`)
    .join('\n');

  try {
    const { text: aiResult } = await generateText({
      model: analysisModel,
      providerOptions: zaiProviderOptions,
      prompt: `바이럴 마케팅 게시물의 댓글을 분석하세요.

## 댓글 목록
${commentList}

각 댓글에 대해 JSON 배열로 응답하세요:
[
  {
    "index": 0,
    "sentiment": "positive" | "neutral" | "negative",
    "sentimentScore": -1.0 ~ 1.0,
    "isNegative": true/false,
    "category": "카테고리 (긍정반응/일반질문/광고의심/불만/거짓정보/신상노출/스팸 중 택1)",
    "priority": "immediate" | "high" | "monitor" | "ignore",
    "responseRequired": true/false
  }
]

분류 기준:
- immediate: 거짓정보, 신상(개인정보) 노출
- high: 불만, 답변 필요 질문, 광고의심
- monitor: 약간 부정적이지만 대응 불필요
- ignore: 긍정, 중립, 스팸

JSON 배열만 출력하세요.`,
      maxOutputTokens: 1000,
    });

    const jsonMatch = aiResult.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid AI response');

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      index: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      sentimentScore: number;
      isNegative: boolean;
      category: string;
      priority: 'immediate' | 'high' | 'monitor' | 'ignore';
      responseRequired: boolean;
    }>;

    return comments.map((_, i) => {
      const ai = parsed.find((p) => p.index === i);
      if (!ai) {
        return {
          sentiment: 'neutral' as const,
          sentimentScore: 0,
          isNegative: false,
          category: '분석실패',
          priority: 'ignore' as const,
          responseRequired: false,
        };
      }
      return {
        sentiment: ai.sentiment,
        sentimentScore: ai.sentimentScore,
        isNegative: ai.isNegative,
        category: ai.category,
        priority: ai.priority,
        responseRequired: ai.responseRequired,
      };
    });
  } catch {
    // AI 실패 시 기본 중립 반환
    return comments.map(() => ({
      sentiment: 'neutral' as const,
      sentimentScore: 0,
      isNegative: false,
      category: '분석실패',
      priority: 'ignore' as const,
      responseRequired: false,
    }));
  }
}
