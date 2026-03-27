// GET  /api/projects/:pid/virals/:id/comments  — 댓글 목록
// POST /api/projects/:pid/virals/:id/comments  — 댓글 수집 + 감성분석 실행

import { commentRepo, viralRepo } from '../../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam } from '../../../../../lib/api-utils.js';
import { crawlUrl } from '../../../../../lib/services/crawler.js';
import { analyzeComments } from '../../../../../lib/services/sentiment.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Viral ID is required', 400);

    const viral = await viralRepo.findById(id);
    if (!viral) return errorResponse('Viral not found', 404);

    const comments = await commentRepo.listByViral(id);
    return jsonResponse(comments);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to list comments',
      500
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Viral ID is required', 400);

    const viral = await viralRepo.findById(id);
    if (!viral) return errorResponse('Viral not found', 404);

    // Step 1: Crawl comments from URL (basic extraction)
    const crawl = await crawlUrl(viral.url);
    if (!crawl.success) {
      return errorResponse(`URL 크롤링 실패: ${crawl.error}`, 502);
    }

    // Extract comment-like content blocks (simplified)
    // In production, use platform-specific parsers
    const rawComments = extractComments(crawl.text);

    if (rawComments.length === 0) {
      return jsonResponse({
        message: '수집된 댓글이 없습니다',
        collected: 0,
        comments: [],
      });
    }

    // Step 2: AI sentiment analysis
    const sentiments = await analyzeComments(rawComments);

    // Step 3: Save comments
    const now = new Date().toISOString();
    const created = [];
    for (let i = 0; i < rawComments.length; i++) {
      const raw = rawComments[i];
      const sent = sentiments[i];
      const comment = await commentRepo.create({
        viralId: id,
        author: raw.author,
        content: raw.content,
        sentiment: sent.sentiment,
        sentimentScore: sent.sentimentScore,
        isNegative: sent.isNegative,
        category: sent.category,
        priority: sent.priority,
        responseRequired: sent.responseRequired,
        responses: [],
        originalDate: now,
      });
      created.push(comment);
    }

    // Step 4: Update viral comment stats
    const negativeCount = await commentRepo.countNegative(id);
    const allComments = await commentRepo.listByViral(id);
    await viralRepo.update(id, {
      comments: {
        totalCount: allComments.length,
        negativeCount,
        lastCheckedAt: now,
      },
    });

    return jsonResponse({
      message: `${created.length}건 댓글 수집 완료`,
      collected: created.length,
      comments: created,
    }, 201);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to collect comments',
      500
    );
  }
}

/**
 * 본문에서 댓글 추출 (기본 휴리스틱)
 * 실제 프로덕션에서는 플랫폼별 파서 사용
 */
function extractComments(text: string): Array<{ author: string; content: string }> {
  const comments: Array<{ author: string; content: string }> = [];
  // Split by common comment patterns
  const lines = text.split(/\n/).filter((l) => l.trim().length > 5 && l.trim().length < 500);

  // Simple heuristic: short lines after long content blocks may be comments
  let afterContent = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 200) {
      afterContent = true;
      continue;
    }
    if (afterContent && trimmed.length > 5 && trimmed.length < 200) {
      comments.push({
        author: '익명',
        content: trimmed,
      });
    }
  }

  return comments.slice(0, 50); // limit
}
