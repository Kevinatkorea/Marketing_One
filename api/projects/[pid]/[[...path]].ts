/**
 * Catch-all route for all project sub-routes.
 * Handles: /api/projects/:pid, /api/projects/:pid/products/..., /api/projects/:pid/guides/...,
 *          /api/projects/:pid/virals/..., /api/projects/:pid/dashboard/...
 *
 * This consolidation is required because Vercel Hobby plan limits to 12 Serverless Functions.
 */
import {
  projectRepo,
  productRepo,
  guideRepo,
  viralRepo,
  commentRepo,
} from '../../../lib/repositories/index.js';
import {
  updateProjectSchema,
  createProductSchema,
  updateProductSchema,
  createGuideSchema,
  updateGuideSchema,
  createViralSchema,
  updateViralSchema,
  bulkTextSchema,
} from '../../../lib/validations.js';
import {
  parseBody,
  errorResponse,
  jsonResponse,
  getPathParam,
  getQueryParams,
} from '../../../lib/api-utils.js';
import { parseViralText } from '../../../lib/services/textParser.js';
import { verifyViral as runVerification } from '../../../lib/services/verifier.js';
import { crawlUrl } from '../../../lib/services/crawler.js';
import { analyzeComments } from '../../../lib/services/sentiment.js';
import ExcelJS from 'exceljs';
import type { ViralFilters } from '../../../src/types/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSubPath(request: Request): string[] {
  const url = new URL(request.url);
  const segs = url.pathname.split('/').filter(Boolean); // ['api','projects',pid,...]
  return segs.slice(3); // everything after pid
}

function method(request: Request): string {
  return request.method.toUpperCase();
}

// ---------------------------------------------------------------------------
// Project CRUD  (/api/projects/:pid)
// ---------------------------------------------------------------------------

async function handleProject(request: Request, pid: string): Promise<Response> {
  if (method(request) === 'GET') {
    const project = await projectRepo.findById(pid);
    if (!project) return errorResponse('Project not found', 404);
    return jsonResponse(project);
  }
  if (method(request) === 'PUT') {
    const body = await parseBody(request);
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
    const existing = await projectRepo.findById(pid);
    if (!existing) return errorResponse('Project not found', 404);
    return jsonResponse(await projectRepo.update(pid, parsed.data));
  }
  if (method(request) === 'DELETE') {
    const existing = await projectRepo.findById(pid);
    if (!existing) return errorResponse('Project not found', 404);
    await projectRepo.delete(pid);
    return jsonResponse({ message: '삭제 완료' });
  }
  return errorResponse('Method not allowed', 405);
}

// ---------------------------------------------------------------------------
// Products  (/api/projects/:pid/products[/:id])
// ---------------------------------------------------------------------------

async function handleProducts(request: Request, pid: string, subPath: string[]): Promise<Response> {
  const productId = subPath[1]; // products/:id

  if (!productId) {
    // /products
    if (method(request) === 'GET') {
      return jsonResponse(await productRepo.listByProject(pid));
    }
    if (method(request) === 'POST') {
      const body = await parseBody(request);
      const parsed = createProductSchema.safeParse({ ...(body as Record<string, unknown>), projectId: pid });
      if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
      return jsonResponse(await productRepo.create(parsed.data), 201);
    }
    return errorResponse('Method not allowed', 405);
  }

  // /products/:id
  const product = await productRepo.findById(productId);
  if (!product) return errorResponse('Product not found', 404);

  if (method(request) === 'GET') return jsonResponse(product);
  if (method(request) === 'PUT') {
    const body = await parseBody(request);
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
    return jsonResponse(await productRepo.update(productId, parsed.data));
  }
  if (method(request) === 'DELETE') {
    await productRepo.delete(productId);
    return jsonResponse({ message: 'Deleted' });
  }
  return errorResponse('Method not allowed', 405);
}

// ---------------------------------------------------------------------------
// Guides  (/api/projects/:pid/guides[/:id[/clone]])
// ---------------------------------------------------------------------------

async function handleGuides(request: Request, pid: string, subPath: string[]): Promise<Response> {
  const guideId = subPath[1];
  const action = subPath[2]; // e.g., 'clone'

  if (!guideId) {
    if (method(request) === 'GET') {
      return jsonResponse(await guideRepo.listByProject(pid));
    }
    if (method(request) === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      let guideData: Record<string, unknown>;
      let pdfContent: string | undefined;
      let pdfFileName: string | undefined;

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const pdfFile = formData.get('pdf') as File | null;
        guideData = JSON.parse(formData.get('data') as string || '{}');

        if (pdfFile && pdfFile.size > 0) {
          const { parsePdf } = await import('../../../lib/services/pdfParser.js');
          const buffer = Buffer.from(await pdfFile.arrayBuffer());
          const parsed = await parsePdf(buffer);
          pdfContent = parsed.text;
          pdfFileName = pdfFile.name;
        }
      } else {
        guideData = (await parseBody(request)) as Record<string, unknown>;
      }

      const parsed = createGuideSchema.safeParse({ ...guideData, projectId: pid });
      if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
      const createData = { ...parsed.data, ...(pdfContent ? { pdfContent, pdfFileName } : {}) };
      return jsonResponse(await guideRepo.create(createData), 201);
    }
    return errorResponse('Method not allowed', 405);
  }

  if (action === 'clone' && method(request) === 'POST') {
    const cloned = await guideRepo.clone(guideId);
    return jsonResponse(cloned, 201);
  }

  const guide = await guideRepo.findById(guideId);
  if (!guide) return errorResponse('Guide not found', 404);

  if (method(request) === 'GET') return jsonResponse(guide);
  if (method(request) === 'PUT') {
    const body = await parseBody(request);
    const parsed = updateGuideSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
    return jsonResponse(await guideRepo.update(guideId, parsed.data));
  }
  return errorResponse('Method not allowed', 405);
}

// ---------------------------------------------------------------------------
// Virals  (/api/projects/:pid/virals[/:id[/verify|comments]] | /bulk-*|check-*|export-*)
// ---------------------------------------------------------------------------

async function handleVirals(request: Request, pid: string, subPath: string[]): Promise<Response> {
  const segment1 = subPath[1]; // viral id or action keyword
  const segment2 = subPath[2]; // verify, comments, etc.

  // --- Action endpoints (no viral ID) ---
  if (segment1 === 'bulk-text' && method(request) === 'POST') {
    return handleBulkText(request, pid);
  }
  if (segment1 === 'bulk-excel' && method(request) === 'POST') {
    return handleBulkExcel(request, pid);
  }
  if (segment1 === 'bulk-verify' && method(request) === 'POST') {
    return handleBulkVerify(request, pid);
  }
  if (segment1 === 'check-duplicates' && method(request) === 'GET') {
    return handleCheckDuplicates(request, pid);
  }
  if (segment1 === 'export-template' && method(request) === 'GET') {
    return handleExportTemplate();
  }

  // --- List / Create virals ---
  if (!segment1) {
    if (method(request) === 'GET') return handleViralList(request, pid);
    if (method(request) === 'POST') return handleViralCreate(request, pid);
    return errorResponse('Method not allowed', 405);
  }

  // --- Single viral with sub-action ---
  if (segment2 === 'verify' && method(request) === 'POST') {
    return handleViralVerify(segment1);
  }
  if (segment2 === 'comments') {
    if (method(request) === 'GET') return handleViralCommentsGet(segment1);
    if (method(request) === 'POST') return handleViralCommentsCollect(segment1);
    return errorResponse('Method not allowed', 405);
  }

  // --- Single viral CRUD ---
  const viral = await viralRepo.findById(segment1);
  if (!viral) return errorResponse('Viral not found', 404);

  if (method(request) === 'GET') return jsonResponse(viral);
  if (method(request) === 'PUT') {
    const body = await parseBody(request);
    const parsed = updateViralSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
    return jsonResponse(await viralRepo.update(segment1, parsed.data));
  }
  if (method(request) === 'DELETE') {
    await viralRepo.delete(segment1);
    return jsonResponse({ message: 'Deleted' });
  }
  return errorResponse('Method not allowed', 405);
}

// --- Viral sub-handlers ---

async function handleViralList(request: Request, pid: string): Promise<Response> {
  const params = getQueryParams(request);
  const filters: ViralFilters = { projectId: pid };
  if (params.get('productId')) filters.productId = params.get('productId')!;
  if (params.get('guideId')) filters.guideId = params.get('guideId')!;
  if (params.get('status')) filters.status = params.get('status') as ViralFilters['status'];
  if (params.get('verificationResult')) filters.verificationResult = params.get('verificationResult') as ViralFilters['verificationResult'];
  if (params.get('platform')) filters.platform = params.get('platform')!;
  if (params.get('search')) filters.search = params.get('search')!;

  const page = parseInt(params.get('page') || '1', 10);
  const pageSize = parseInt(params.get('pageSize') || params.get('limit') || '20', 10);

  const allVirals = await viralRepo.findAll(filters);
  const total = allVirals.length;
  const totalPages = Math.ceil(total / pageSize);
  const data = allVirals.slice((page - 1) * pageSize, page * pageSize);

  return jsonResponse({ data, total, page, pageSize, totalPages });
}

async function handleViralCreate(request: Request, pid: string): Promise<Response> {
  const body = await parseBody(request);
  const parsed = createViralSchema.safeParse({ ...(body as Record<string, unknown>), projectId: pid });
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

  const viral = await viralRepo.create({
    ...parsed.data,
    batchId: null,
    status: 'pending',
    verification: { result: null, score: null, grade: null, checkedAt: null, details: [], issues: [] },
    verificationHistory: [],
    comments: { totalCount: 0, negativeCount: 0, lastCheckedAt: null },
  });
  return jsonResponse(viral, 201);
}

async function handleBulkText(request: Request, pid: string): Promise<Response> {
  const project = await projectRepo.findById(pid);
  if (!project) return errorResponse('Project not found', 404);
  const body = await parseBody(request);
  const parsed = bulkTextSchema.safeParse({ ...(body as Record<string, unknown>), projectId: pid });
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

  const entries = parseViralText(parsed.data.text);
  if (entries.length === 0) return errorResponse('No entries could be parsed', 400);

  const batchId = `batch_${Date.now()}`;
  const items = entries.map((e) => ({
    projectId: pid, productId: parsed.data.productId, guideId: parsed.data.guideId,
    title: e.title, url: e.url, platform: e.platform, cafeName: e.cafeName, author: '',
    batchId, status: 'pending' as const,
    verification: { result: null, score: null, grade: null, checkedAt: null, details: [], issues: [] },
    verificationHistory: [], comments: { totalCount: 0, negativeCount: 0, lastCheckedAt: null },
  }));
  const created = await viralRepo.bulkInsert(items);
  return jsonResponse({ message: `${created.length}건 등록`, batchId, count: created.length, entries: created }, 201);
}

async function handleBulkExcel(request: Request, pid: string): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const productId = formData.get('productId') as string;
  const guideId = formData.get('guideId') as string;
  if (!file) return errorResponse('엑셀 파일이 필요합니다', 400);
  if (!productId || !guideId) return errorResponse('상품과 가이드를 선택해주세요', 400);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer() as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) return errorResponse('워크시트를 찾을 수 없습니다', 400);

  const existing = await viralRepo.findAll({ projectId: pid });
  const existingUrls = new Set(existing.map((v) => v.url));
  const batchId = `batch_${Date.now()}`;
  const results: Array<{ row: number; status: string; title?: string; error?: string }> = [];
  const toCreate: Parameters<typeof viralRepo.create>[0][] = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const url = String(row.getCell(3).value || '').trim();
    const title = String(row.getCell(2).value || '').trim();
    if (!url || !url.startsWith('http')) { results.push({ row: rowNum, status: 'error', title, error: !url ? 'URL 누락' : '유효하지 않은 URL' }); return; }
    if (existingUrls.has(url)) { results.push({ row: rowNum, status: 'duplicate', title }); return; }
    existingUrls.add(url);
    results.push({ row: rowNum, status: 'success', title });
    const cafeName = String(row.getCell(1).value || '').trim();
    const author = String(row.getCell(4).value || '').trim();
    const platform = String(row.getCell(5).value || '').trim() || (url.includes('cafe.naver.com') ? '네이버카페' : url.includes('blog.naver.com') ? '네이버블로그' : '기타');
    toCreate.push({
      projectId: pid, productId, guideId, title: title || url, url, platform, cafeName, author, batchId,
      status: 'pending', verification: { result: null, score: null, grade: null, checkedAt: null, details: [], issues: [] },
      verificationHistory: [], comments: { totalCount: 0, negativeCount: 0, lastCheckedAt: null },
    });
  });

  for (const d of toCreate) await viralRepo.create(d);
  const s = results.filter((r) => r.status === 'success').length;
  const dup = results.filter((r) => r.status === 'duplicate').length;
  const err = results.filter((r) => r.status === 'error').length;
  return jsonResponse({ message: `${s}건 등록, ${dup}건 중복, ${err}건 오류`, batchId, summary: { success: s, duplicate: dup, error: err }, results }, 201);
}

async function handleBulkVerify(request: Request, pid: string): Promise<Response> {
  const body = (await parseBody(request)) as { viralIds?: string[]; batchId?: string } | null;
  const all = await viralRepo.findAll({ projectId: pid });
  let virals;
  if (body?.viralIds?.length) virals = all.filter((v) => body.viralIds!.includes(v.id));
  else if (body?.batchId) virals = all.filter((v) => v.batchId === body.batchId);
  else virals = all.filter((v) => v.status === 'pending');

  if (virals.length === 0) return jsonResponse({ message: '검증할 바이럴이 없습니다', results: [] });

  const guideCache = new Map();
  const results = [];
  for (const viral of virals) {
    try {
      let guide = guideCache.get(viral.guideId);
      if (!guide && viral.guideId) { guide = await guideRepo.findById(viral.guideId); if (guide) guideCache.set(viral.guideId, guide); }
      if (!guide) { results.push({ id: viral.id, title: viral.title, status: 'skipped', reason: '가이드 없음' }); continue; }
      const res = await runVerification(viral.url, guide);
      const now = new Date().toISOString();
      const attempt = (viral.verificationHistory?.length ?? 0) + 1;
      await viralRepo.update(viral.id, { status: res.result === 'fail' ? 'failed' : 'verified', verification: { ...res, checkedAt: now }, verificationHistory: [...(viral.verificationHistory || []), { attempt, result: res.result, score: res.score, verifiedAt: now }] });
      results.push({ id: viral.id, title: viral.title, status: 'verified', result: res.result, score: res.score });
    } catch (e) { results.push({ id: viral.id, title: viral.title, status: 'error', reason: (e as Error).message }); }
  }
  const v = results.filter((r) => r.status === 'verified').length;
  return jsonResponse({ message: `${v}건 검증 완료`, summary: { verified: v, skipped: results.filter((r) => r.status === 'skipped').length, errors: results.filter((r) => r.status === 'error').length, total: virals.length }, results });
}

async function handleCheckDuplicates(request: Request, _pid: string): Promise<Response> {
  const params = getQueryParams(request);
  const urlsParam = params.get('urls');
  if (!urlsParam) return errorResponse('Query parameter "urls" is required', 400);
  const urls = urlsParam.split(',').map((u) => u.trim()).filter(Boolean);
  const results = await viralRepo.checkDuplicates(urls);
  return jsonResponse({ total: urls.length, duplicates: results.filter((r) => r.exists).length, results });
}

async function handleExportTemplate(): Promise<Response> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('바이럴 등록');
  ws.columns = [
    { header: '카페명', key: 'cafeName', width: 20 },
    { header: '제목', key: 'title', width: 40 },
    { header: 'URL', key: 'url', width: 50 },
    { header: '작성자', key: 'author', width: 15 },
    { header: '플랫폼', key: 'platform', width: 15 },
  ];
  ws.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; });
  ws.addRow({ cafeName: '뷰티인사이드', title: '[후기] 봄 한정판 수분크림', url: 'https://cafe.naver.com/example/12345', author: '리뷰어A', platform: '네이버카페' });
  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="viral-upload-template.xlsx"' } });
}

async function handleViralVerify(viralId: string): Promise<Response> {
  const viral = await viralRepo.findById(viralId);
  if (!viral) return errorResponse('Viral not found', 404);
  const guide = viral.guideId ? await guideRepo.findById(viral.guideId) : null;
  if (!guide) return errorResponse('가이드를 찾을 수 없습니다', 400);
  const result = await runVerification(viral.url, guide);
  const now = new Date().toISOString();
  const attempt = (viral.verificationHistory?.length ?? 0) + 1;
  const updated = await viralRepo.update(viralId, { status: result.result === 'fail' ? 'failed' : 'verified', verification: { ...result, checkedAt: now }, verificationHistory: [...(viral.verificationHistory || []), { attempt, result: result.result, score: result.score, verifiedAt: now }] });
  return jsonResponse(updated);
}

async function handleViralCommentsGet(viralId: string): Promise<Response> {
  const viral = await viralRepo.findById(viralId);
  if (!viral) return errorResponse('Viral not found', 404);
  return jsonResponse(await commentRepo.listByViral(viralId));
}

async function handleViralCommentsCollect(viralId: string): Promise<Response> {
  const viral = await viralRepo.findById(viralId);
  if (!viral) return errorResponse('Viral not found', 404);
  const crawl = await crawlUrl(viral.url);
  if (!crawl.success) return errorResponse(`크롤링 실패: ${crawl.error}`, 502);

  const lines = crawl.text.split(/\n/).filter((l) => l.trim().length > 5 && l.trim().length < 200);
  const rawComments = lines.slice(-20).map((l) => ({ author: '익명', content: l.trim() }));
  if (rawComments.length === 0) return jsonResponse({ message: '수집된 댓글 없음', collected: 0, comments: [] });

  const sentiments = await analyzeComments(rawComments);
  const now = new Date().toISOString();
  const created = [];
  for (let i = 0; i < rawComments.length; i++) {
    const c = await commentRepo.create({ viralId, author: rawComments[i].author, content: rawComments[i].content, ...sentiments[i], responses: [], originalDate: now });
    created.push(c);
  }
  const neg = await commentRepo.countNegative(viralId);
  const all = await commentRepo.listByViral(viralId);
  await viralRepo.update(viralId, { comments: { totalCount: all.length, negativeCount: neg, lastCheckedAt: now } });
  return jsonResponse({ message: `${created.length}건 수집`, collected: created.length, comments: created }, 201);
}

// ---------------------------------------------------------------------------
// Dashboard  (/api/projects/:pid/dashboard/viral)
// ---------------------------------------------------------------------------

async function handleDashboard(_request: Request, pid: string): Promise<Response> {
  const project = await projectRepo.findById(pid);
  if (!project) return errorResponse('Project not found', 404);

  const virals = await viralRepo.findAll({ projectId: pid });
  const total = virals.length;
  const verified = virals.filter((v) => v.status === 'verified').length;
  const pending = virals.filter((v) => v.status === 'pending').length;
  const failed = virals.filter((v) => v.status === 'failed').length;

  const ok = virals.filter((v) => v.verification?.result === 'ok').length;
  const warning = virals.filter((v) => v.verification?.result === 'warning').length;
  const fail = virals.filter((v) => v.verification?.result === 'fail').length;
  const pendingResult = total - ok - warning - fail;

  const negativeCommentCount = virals.reduce((sum, v) => sum + (v.comments?.negativeCount || 0), 0);

  const reasonMap: Record<string, number> = {};
  for (const v of virals) {
    for (const issue of v.verification?.issues || []) {
      reasonMap[issue] = (reasonMap[issue] || 0) + 1;
    }
  }
  const failReasons = Object.entries(reasonMap).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);

  const lastUpdated = virals.reduce((latest, v) => {
    const d = v.verification?.checkedAt || v.createdAt;
    return d > latest ? d : latest;
  }, '');

  return jsonResponse({
    totalVirals: total, verifiedCount: verified, pendingCount: pending, failedCount: failed,
    resultDistribution: { ok, warning, fail, pending: pendingResult },
    negativeCommentCount, failReasons, lastUpdated,
  });
}

// ---------------------------------------------------------------------------
// Main Router
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response>    { return route(request); }
export async function POST(request: Request): Promise<Response>   { return route(request); }
export async function PUT(request: Request): Promise<Response>    { return route(request); }
export async function DELETE(request: Request): Promise<Response> { return route(request); }

async function route(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);

    const subPath = getSubPath(request);
    const resource = subPath[0]; // products, guides, virals, dashboard, or undefined

    if (!resource) return handleProject(request, pid);
    if (resource === 'products') return handleProducts(request, pid, subPath);
    if (resource === 'guides') return handleGuides(request, pid, subPath);
    if (resource === 'virals') return handleVirals(request, pid, subPath);
    if (resource === 'dashboard') return handleDashboard(request, pid);

    return errorResponse('Not found', 404);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
}
