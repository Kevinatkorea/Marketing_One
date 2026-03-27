// GET /api/projects/:pid/virals/check-duplicates?urls=url1,url2,...  — Check duplicate URLs

import { viralRepo, projectRepo } from '../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam, getQueryParams } from '../../../../lib/api-utils.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);
    const project = await projectRepo.findById(pid);
    if (!project) return errorResponse('Project not found', 404);

    const params = getQueryParams(request);
    const urlsParam = params.get('urls');

    if (!urlsParam) {
      return errorResponse('Query parameter "urls" is required', 400);
    }

    const urls = urlsParam.split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      return errorResponse('At least one URL is required', 400);
    }

    const results = await viralRepo.checkDuplicates(urls);
    const duplicateCount = results.filter((r) => r.exists).length;

    return jsonResponse({
      total: urls.length,
      duplicates: duplicateCount,
      results,
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to check duplicates',
      500
    );
  }
}
