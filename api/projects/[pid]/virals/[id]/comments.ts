// GET  /api/projects/:pid/virals/:id/comments  — List comments for viral
// POST /api/projects/:pid/virals/:id/comments  — Trigger comment collection (placeholder)

import { commentRepo, viralRepo } from '../../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam } from '../../../../../lib/api-utils.js';

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

    // Placeholder: generate mock comments
    const now = new Date().toISOString();
    const mockComments = [
      {
        viralId: id,
        author: '사용자A',
        content: '좋은 정보 감사합니다!',
        sentiment: 'positive' as const,
        sentimentScore: 0.8,
        isNegative: false,
        category: '긍정반응',
        priority: 'ignore' as const,
        responseRequired: false,
        responses: [],
        originalDate: now,
      },
      {
        viralId: id,
        author: '사용자B',
        content: '광고 같은데요...',
        sentiment: 'negative' as const,
        sentimentScore: -0.6,
        isNegative: true,
        category: '광고의심',
        priority: 'high' as const,
        responseRequired: true,
        responses: [],
        originalDate: now,
      },
    ];

    const created = [];
    for (const data of mockComments) {
      const comment = await commentRepo.create(data);
      created.push(comment);
    }

    // Update viral's comment counts
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
      message: 'Comment collection complete (mock)',
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
