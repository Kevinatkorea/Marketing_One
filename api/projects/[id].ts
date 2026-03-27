// GET    /api/projects/:id  — Get project by ID
// PUT    /api/projects/:id  — Update project
// DELETE /api/projects/:id  — Soft delete (archive) project

import { projectRepo } from '../../lib/repositories/index.js';
import { updateProjectSchema } from '../../lib/validations.js';
import {
  parseBody,
  errorResponse,
  jsonResponse,
  getPathParam,
} from '../../lib/api-utils.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Project ID is required', 400);

    const project = await projectRepo.findById(id);
    if (!project) return errorResponse('Project not found', 404);

    return jsonResponse(project);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to get project',
      500
    );
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Project ID is required', 400);

    const body = await parseBody(request);
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const existing = await projectRepo.findById(id);
    if (!existing) return errorResponse('Project not found', 404);

    const updated = await projectRepo.update(id, parsed.data);
    return jsonResponse(updated);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to update project',
      500
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Project ID is required', 400);

    const existing = await projectRepo.findById(id);
    if (!existing) return errorResponse('Project not found', 404);

    // Soft delete: set status to 'archived'
    const archived = await projectRepo.update(id, { status: 'archived' });
    return jsonResponse(archived);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to delete project',
      500
    );
  }
}
