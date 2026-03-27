// GET    /api/projects/:pid/products/:id  — Get product
// PUT    /api/projects/:pid/products/:id  — Update product
// DELETE /api/projects/:pid/products/:id  — Delete product

import { productRepo } from '../../../../lib/repositories/index.js';
import { updateProductSchema } from '../../../../lib/validations.js';
import {
  parseBody,
  errorResponse,
  jsonResponse,
  getPathParam,
} from '../../../../lib/api-utils.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Product ID is required', 400);

    const product = await productRepo.findById(id);
    if (!product) return errorResponse('Product not found', 404);

    return jsonResponse(product);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to get product',
      500
    );
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Product ID is required', 400);

    const body = await parseBody(request);
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const existing = await productRepo.findById(id);
    if (!existing) return errorResponse('Product not found', 404);

    const updated = await productRepo.update(id, parsed.data);
    return jsonResponse(updated);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to update product',
      500
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Product ID is required', 400);

    const existing = await productRepo.findById(id);
    if (!existing) return errorResponse('Product not found', 404);

    await productRepo.delete(id);
    return jsonResponse({ message: 'Product deleted', id });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to delete product',
      500
    );
  }
}
