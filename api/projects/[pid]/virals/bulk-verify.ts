// POST /api/projects/:pid/virals/bulk-verify — 일괄 검증 실행

import { viralRepo, guideRepo } from '../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam, parseBody } from '../../../../lib/api-utils.js';
import { verifyViral } from '../../../../lib/services/verifier.js';

export async function POST(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);

    const body = (await parseBody(request)) as { viralIds?: string[]; batchId?: string } | null;

    // 대상 바이럴 목록 결정
    let virals;
    if (body?.viralIds && body.viralIds.length > 0) {
      const all = await viralRepo.findAll({ projectId: pid });
      virals = all.filter((v) => body.viralIds!.includes(v.id));
    } else if (body?.batchId) {
      const all = await viralRepo.findAll({ projectId: pid });
      virals = all.filter((v) => v.batchId === body.batchId);
    } else {
      // 미검증 바이럴 전체
      const all = await viralRepo.findAll({ projectId: pid });
      virals = all.filter((v) => v.status === 'pending');
    }

    if (virals.length === 0) {
      return jsonResponse({ message: '검증할 바이럴이 없습니다', results: [] });
    }

    // 가이드 캐시
    const guideCache = new Map();
    const results = [];

    for (const viral of virals) {
      try {
        let guide = guideCache.get(viral.guideId);
        if (!guide && viral.guideId) {
          guide = await guideRepo.findById(viral.guideId);
          if (guide) guideCache.set(viral.guideId, guide);
        }

        if (!guide) {
          results.push({ id: viral.id, title: viral.title, status: 'skipped', reason: '가이드 없음' });
          continue;
        }

        const verifyResult = await verifyViral(viral.url, guide);
        const now = new Date().toISOString();
        const attempt = (viral.verificationHistory?.length ?? 0) + 1;

        await viralRepo.update(viral.id, {
          status: verifyResult.result === 'fail' ? 'failed' : 'verified',
          verification: { ...verifyResult, checkedAt: now },
          verificationHistory: [
            ...(viral.verificationHistory || []),
            { attempt, result: verifyResult.result, score: verifyResult.score, verifiedAt: now },
          ],
        });

        results.push({
          id: viral.id,
          title: viral.title,
          status: 'verified',
          result: verifyResult.result,
          score: verifyResult.score,
        });
      } catch (err) {
        results.push({
          id: viral.id,
          title: viral.title,
          status: 'error',
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const verified = results.filter((r) => r.status === 'verified').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return jsonResponse({
      message: `${verified}건 검증 완료, ${skipped}건 스킵, ${errors}건 오류`,
      summary: { verified, skipped, errors, total: virals.length },
      results,
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Bulk verification failed',
      500,
    );
  }
}
