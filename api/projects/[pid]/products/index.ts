// GET  /api/projects/:pid/products  — List products for project
// POST /api/projects/:pid/products  — Create product

import { productRepo, projectRepo } from '../../../../lib/repositories/index.js';
import { createProductSchema } from '../../../../lib/validations.js';
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

    const products = await productRepo.listByProject(pid);
    return jsonResponse(products);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to list products',
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
    const parsed = createProductSchema.safeParse({ ...(body as Record<string, unknown>), projectId: pid });
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const product = await productRepo.create(parsed.data);
    return jsonResponse(product, 201);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to create product',
      500
    );
  }
}
