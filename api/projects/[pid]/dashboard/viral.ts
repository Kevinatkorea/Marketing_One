// GET /api/projects/:pid/dashboard/viral  — Return viral dashboard statistics

import { viralRepo, projectRepo } from '../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam } from '../../../../lib/api-utils.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);

    const project = await projectRepo.findById(pid);
    if (!project) return errorResponse('Project not found', 404);

    // Get all virals for this project (unpaginated)
    const allVirals = await viralRepo.findAll({ projectId: pid });

    const totalVirals = allVirals.length;
    const verifiedCount = allVirals.filter((v) => v.status === 'verified').length;
    const pendingCount = allVirals.filter((v) => v.status === 'pending').length;
    const failedCount = allVirals.filter((v) => v.status === 'failed').length;

    // Result distribution
    const resultDistribution = {
      ok: allVirals.filter((v) => v.verification.result === 'ok').length,
      warning: allVirals.filter((v) => v.verification.result === 'warning').length,
      fail: allVirals.filter((v) => v.verification.result === 'fail').length,
      pending: allVirals.filter((v) => v.verification.result === null).length,
    };

    // Count negative comments across all virals in the project
    let negativeCommentCount = 0;
    for (const viral of allVirals) {
      negativeCommentCount += viral.comments.negativeCount;
    }

    // Aggregate fail reasons from verification issues
    const failReasonMap = new Map<string, number>();
    for (const viral of allVirals) {
      if (viral.verification.issues && viral.verification.issues.length > 0) {
        for (const issue of viral.verification.issues) {
          failReasonMap.set(issue, (failReasonMap.get(issue) || 0) + 1);
        }
      }
    }
    const failReasons = Array.from(failReasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return jsonResponse({
      totalVirals,
      verifiedCount,
      pendingCount,
      failedCount,
      resultDistribution,
      negativeCommentCount,
      failReasons,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to get dashboard data',
      500
    );
  }
}
