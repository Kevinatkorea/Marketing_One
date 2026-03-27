// GET  /api/projects/:pid/guides  — List guides for project
// POST /api/projects/:pid/guides  — Create guide

import { guideRepo, projectRepo } from '../../../../lib/repositories/index.js';
import { createGuideSchema } from '../../../../lib/validations.js';
import {
  parseBody,
  errorResponse,
  jsonResponse,
  getPathParam,
} from '../../../../lib/api-utils.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);

    const project = await projectRepo.findById(pid);
    if (!project) return errorResponse('Project not found', 404);

    const guides = await guideRepo.listByProject(pid);
    return jsonResponse(guides);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to list guides',
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
    const parsed = createGuideSchema.safeParse({ ...(body as Record<string, unknown>), projectId: pid });
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const guide = await guideRepo.create(parsed.data);
    return jsonResponse(guide, 201);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to create guide',
      500
    );
  }
}
