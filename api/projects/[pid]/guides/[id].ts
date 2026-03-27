// GET /api/projects/:pid/guides/:id  — Get guide detail
// PUT /api/projects/:pid/guides/:id  — Update guide

import { guideRepo } from '../../../../lib/repositories/index.js';
import { updateGuideSchema } from '../../../../lib/validations.js';
import {
  parseBody,
  errorResponse,
  jsonResponse,
  getPathParam,
} from '../../../../lib/api-utils.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Guide ID is required', 400);

    const guide = await guideRepo.findById(id);
    if (!guide) return errorResponse('Guide not found', 404);

    return jsonResponse(guide);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to get guide',
      500
    );
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Guide ID is required', 400);

    const body = await parseBody(request);
    const parsed = updateGuideSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const existing = await guideRepo.findById(id);
    if (!existing) return errorResponse('Guide not found', 404);

    const updated = await guideRepo.update(id, parsed.data);
    return jsonResponse(updated);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to update guide',
      500
    );
  }
}
