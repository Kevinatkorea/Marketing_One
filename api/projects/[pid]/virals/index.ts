// GET  /api/projects/:pid/virals  — List virals with filters + pagination
// POST /api/projects/:pid/virals  — Create single viral

import { viralRepo, projectRepo } from '../../../../lib/repositories/index.js';
import { createViralSchema } from '../../../../lib/validations.js';
import {
  parseBody,
  errorResponse,
  jsonResponse,
  getPathParam,
  getQueryParams,
} from '../../../../lib/api-utils.js';
import type { ViralFilters } from '../../../../src/types/index.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);

    const project = await projectRepo.findById(pid);
    if (!project) return errorResponse('Project not found', 404);

    const params = getQueryParams(request);

    const filters: Omit<ViralFilters, 'projectId'> = {
      productId: params.get('productId') || undefined,
      guideId: params.get('guideId') || undefined,
      status: (params.get('status') as ViralFilters['status']) || undefined,
      verificationResult:
        (params.get('verificationResult') as ViralFilters['verificationResult']) || undefined,
      platform: params.get('platform') || undefined,
      batchId: params.get('batchId') || undefined,
      search: params.get('search') || undefined,
    };

    const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(params.get('limit') || params.get('pageSize') || '20', 10) || 20));

    const result = await viralRepo.listByProject(pid, filters, { page, pageSize });
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to list virals',
      500
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);

    const project = await projectRepo.findById(pid);
    if (!project) return errorResponse('Project not found', 404);

    const body = await parseBody(request);
    const parsed = createViralSchema.safeParse({ ...(body as Record<string, unknown>), projectId: pid });
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const viralData = {
      ...parsed.data,
      batchId: null,
      status: 'pending' as const,
      verification: {
        result: null,
        score: null,
        grade: null,
        checkedAt: null,
        details: [],
        issues: [],
      },
      verificationHistory: [],
      comments: {
        totalCount: 0,
        negativeCount: 0,
        lastCheckedAt: null,
      },
    };

    const viral = await viralRepo.create(viralData);
    return jsonResponse(viral, 201);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to create viral',
      500
    );
  }
}
