// GET  /api/projects       — List all projects
// POST /api/projects       — Create a new project

import { projectRepo } from '../../lib/repositories/index.js';
import { createProjectSchema } from '../../lib/validations.js';
import {
  parseBody,
  errorResponse,
  jsonResponse,
  getQueryParams,
} from '../../lib/api-utils.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const params = getQueryParams(request);
    const filters = {
      status: (params.get('status') as 'active' | 'archived') || undefined,
      owner: params.get('owner') || undefined,
      search: params.get('search') || undefined,
    };
    const projects = await projectRepo.findAll(filters);
    return jsonResponse(projects);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to list projects',
      500
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await parseBody(request);
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const project = await projectRepo.create(parsed.data);
    return jsonResponse(project, 201);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to create project',
      500
    );
  }
}
