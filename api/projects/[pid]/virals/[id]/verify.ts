// POST /api/projects/:pid/virals/:id/verify  — 가이드 적합성 검증 실행

import { viralRepo, guideRepo } from '../../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam } from '../../../../../lib/api-utils.js';
import { verifyViral } from '../../../../../lib/services/verifier.js';

export async function POST(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Viral ID is required', 400);

    const viral = await viralRepo.findById(id);
    if (!viral) return errorResponse('Viral not found', 404);

    // Find the associated guide
    const guide = viral.guideId ? await guideRepo.findById(viral.guideId) : null;
    if (!guide) {
      return errorResponse('가이드를 찾을 수 없습니다. 바이럴에 가이드를 연결해주세요.', 400);
    }

    // Run verification
    const result = await verifyViral(viral.url, guide);

    const now = new Date().toISOString();
    const attempt = (viral.verificationHistory?.length ?? 0) + 1;

    const updated = await viralRepo.update(id, {
      status: result.result === 'fail' ? 'failed' : 'verified',
      verification: {
        ...result,
        checkedAt: now,
      },
      verificationHistory: [
        ...(viral.verificationHistory || []),
        { attempt, result: result.result, score: result.score, verifiedAt: now },
      ],
    });

    return jsonResponse({
      message: '검증 완료',
      verification: updated.verification,
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to verify viral',
      500
    );
  }
}
