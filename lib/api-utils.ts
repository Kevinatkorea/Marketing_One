// ============================================================
// PerformanceOne - API Helper Utilities
// ============================================================

/**
 * Parse the JSON body from a Request.
 * Returns the parsed value or null for empty bodies.
 */
export async function parseBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return null;
  return JSON.parse(text);
}

/**
 * Create a JSON error response.
 */
export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Create a JSON success response.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Extract a path parameter by its bracket name from the URL.
 *
 * Vercel Serverless Functions receive the matched segment values
 * in the URL path itself. We parse them by matching the known route
 * structure against the actual URL path.
 *
 * For example, for route /api/projects/[id]:
 *   getPathParam(request, 'id') returns the segment after /projects/
 *
 * For nested routes like /api/projects/[pid]/products/[id]:
 *   getPathParam(request, 'pid') returns segment after /projects/
 *   getPathParam(request, 'id') returns segment after /products/
 */
export function getPathParam(request: Request, paramName: string): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);

  // Map common param names to the preceding path segment
  const paramPrecedingSegment: Record<string, string> = {
    id: '', // will be resolved contextually
    pid: 'projects',
  };

  // For 'pid', look for the segment right after 'projects'
  if (paramName === 'pid') {
    const projectsIdx = segments.indexOf('projects');
    if (projectsIdx !== -1 && projectsIdx + 1 < segments.length) {
      return decodeURIComponent(segments[projectsIdx + 1]);
    }
    return null;
  }

  // For 'id', find the LAST meaningful segment (after the resource type).
  // For routes like /api/projects/[pid]/products/[id]/verify,
  // we need to figure out which resource's ID this is.
  if (paramName === 'id') {
    // Walk backwards looking for the segment after a known resource type
    // that isn't another known resource or action keyword
    const resourceTypes = ['projects', 'products', 'guides', 'virals', 'comments'];
    const actionKeywords = ['clone', 'verify', 'comments', 'bulk-text', 'check-duplicates', 'dashboard'];

    // Find the last resource type in the path, then take the next segment
    for (let i = segments.length - 1; i >= 0; i--) {
      if (resourceTypes.includes(segments[i]) && i + 1 < segments.length) {
        const candidate = segments[i + 1];
        if (!actionKeywords.includes(candidate) && !resourceTypes.includes(candidate)) {
          return decodeURIComponent(candidate);
        }
      }
    }
    return null;
  }

  // Generic fallback: look for the paramName as a preceding segment
  const preceding = paramPrecedingSegment[paramName] || paramName;
  const idx = segments.indexOf(preceding);
  if (idx !== -1 && idx + 1 < segments.length) {
    return decodeURIComponent(segments[idx + 1]);
  }

  return null;
}

/**
 * Extract query parameters from a Request URL.
 */
export function getQueryParams(request: Request): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

/**
 * API 키 인증 검증.
 * API_SECRET 환경변수가 설정되어 있으면 x-api-key 헤더와 비교.
 * 미설정 시 인증 없이 통과 (로컬 개발 호환).
 */
export function checkApiAuth(request: Request): Response | null {
  const secret = process.env.API_SECRET;
  if (!secret) return null; // 미설정 시 통과

  const apiKey = request.headers.get('x-api-key');
  if (apiKey === secret) return null; // 인증 성공

  return errorResponse('Unauthorized', 401);
}
