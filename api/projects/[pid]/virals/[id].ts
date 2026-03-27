// GET    /api/projects/:pid/virals/:id  — Get viral detail
// PUT    /api/projects/:pid/virals/:id  — Update viral
// DELETE /api/projects/:pid/virals/:id  — Delete viral

import { viralRepo } from '../../../../lib/repositories/index.js';
import { updateViralSchema } from '../../../../lib/validations.js';
import {
  parseBody,
  errorResponse,
  jsonResponse,
  getPathParam,
} from '../../../../lib/api-utils.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Viral ID is required', 400);

    const viral = await viralRepo.findById(id);
    if (!viral) return errorResponse('Viral not found', 404);

    return jsonResponse(viral);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to get viral',
      500
    );
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Viral ID is required', 400);

    const body = await parseBody(request);
    const parsed = updateViralSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const existing = await viralRepo.findById(id);
    if (!existing) return errorResponse('Viral not found', 404);

    const updated = await viralRepo.update(id, parsed.data);
    return jsonResponse(updated);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to update viral',
      500
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Viral ID is required', 400);

    const existing = await viralRepo.findById(id);
    if (!existing) return errorResponse('Viral not found', 404);

    await viralRepo.delete(id);
    return jsonResponse({ message: 'Viral deleted', id });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to delete viral',
      500
    );
  }
}
