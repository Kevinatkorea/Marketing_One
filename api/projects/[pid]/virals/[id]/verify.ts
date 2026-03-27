// POST /api/projects/:pid/virals/:id/verify  — Trigger verification (placeholder)

import { viralRepo } from '../../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam } from '../../../../../lib/api-utils.js';

export async function POST(request: Request): Promise<Response> {
  try {
    const id = getPathParam(request, 'id');
    if (!id) return errorResponse('Viral ID is required', 400);

    const viral = await viralRepo.findById(id);
    if (!viral) return errorResponse('Viral not found', 404);

    // Placeholder: generate a mock verification result
    const mockResults = ['ok', 'warning', 'fail'] as const;
    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    const score = result === 'ok' ? 95 : result === 'warning' ? 70 : 30;
    const grade = result === 'ok' ? 'green' : result === 'warning' ? 'yellow' : 'red';

    const now = new Date().toISOString();
    const attempt = (viral.verificationHistory?.length ?? 0) + 1;

    const updated = await viralRepo.update(id, {
      status: result === 'fail' ? 'failed' : 'verified',
      verification: {
        result,
        score,
        grade,
        checkedAt: now,
        details: [
          {
            ruleId: 'mock_rule_1',
            passed: result !== 'fail',
            score,
            note: `Mock verification - ${result}`,
          },
        ],
        issues: result === 'fail' ? ['Mock: content does not meet guidelines'] : [],
      },
      verificationHistory: [
        ...(viral.verificationHistory || []),
        { attempt, result, score, verifiedAt: now },
      ],
    });

    return jsonResponse({
      message: 'Verification complete (mock)',
      verification: updated.verification,
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to verify viral',
      500
    );
  }
}
