// POST /api/projects/:pid/virals/bulk-text  — Parse text input and bulk create virals

import { viralRepo, projectRepo } from '../../../../lib/repositories/index.js';
import { bulkTextSchema } from '../../../../lib/validations.js';
import { parseBody, errorResponse, jsonResponse, getPathParam } from '../../../../lib/api-utils.js';
import { parseViralText } from '../../../../lib/services/textParser.js';

export async function POST(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);

    const project = await projectRepo.findById(pid);
    if (!project) return errorResponse('Project not found', 404);

    const body = await parseBody(request);
    const parsed = bulkTextSchema.safeParse({ ...(body as Record<string, unknown>), projectId: pid });
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { productId, guideId, text } = parsed.data;

    // Parse the text into entries
    const entries = parseViralText(text);
    if (entries.length === 0) {
      return errorResponse('No viral entries could be parsed from the text', 400);
    }

    // Generate a batch ID for this import
    const batchId = `batch_${Date.now()}`;

    // Prepare viral data for bulk insert
    const viralItems = entries.map((entry) => ({
      projectId: pid,
      productId,
      guideId,
      title: entry.title,
      url: entry.url,
      platform: entry.platform,
      cafeName: entry.cafeName,
      author: '',
      batchId,
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
    }));

    const created = await viralRepo.bulkInsert(viralItems);

    return jsonResponse(
      {
        message: `Successfully created ${created.length} viral entries`,
        batchId,
        count: created.length,
        entries: created,
      },
      201
    );
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to bulk create virals',
      500
    );
  }
}
