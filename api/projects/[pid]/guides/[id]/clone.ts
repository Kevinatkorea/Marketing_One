// POST /api/projects/:pid/guides/:id/clone  — Clone guide (deep copy)

import { guideRepo } from '../../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam } from '../../../../../lib/api-utils.js';

export async function POST(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Guide ID is required', 400);

    const source = await guideRepo.findById(id);
    if (!source) return errorResponse('Guide not found', 404);

    const cloned = await guideRepo.clone(id);
    return jsonResponse(cloned, 201);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to clone guide',
      500
    );
  }
}
