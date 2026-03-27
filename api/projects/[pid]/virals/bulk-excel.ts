// POST /api/projects/:pid/virals/bulk-excel — 엑셀 파일 일괄등록

import ExcelJS from 'exceljs';
import { viralRepo } from '../../../../lib/repositories/index.js';
import { errorResponse, jsonResponse, getPathParam } from '../../../../lib/api-utils.js';

interface RowResult {
  row: number;
  status: 'success' | 'duplicate' | 'error';
  title?: string;
  error?: string;
}

function detectPlatform(url: string): string {
  if (url.includes('cafe.naver.com')) return '네이버카페';
  if (url.includes('blog.naver.com')) return '네이버블로그';
  if (url.includes('instagram.com')) return '인스타그램';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '유튜브';
  if (url.includes('tiktok.com')) return '틱톡';
  return '기타';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const pid = getPathParam(request, 'pid');
    if (!pid) return errorResponse('Project ID is required', 400);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;
    const guideId = formData.get('guideId') as string | null;

    if (!file) return errorResponse('엑셀 파일이 필요합니다', 400);
    if (!productId || !guideId) return errorResponse('상품과 가이드를 선택해주세요', 400);

    const arrayBuf = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuf as ExcelJS.Buffer);

    const ws = wb.worksheets[0];
    if (!ws) return errorResponse('워크시트를 찾을 수 없습니다', 400);

    // 기존 URL 목록 (중복 체크)
    const existingVirals = await viralRepo.findAll({ projectId: pid });
    const existingUrls = new Set(existingVirals.map((v) => v.url));

    const batchId = `batch_${Date.now()}`;
    const results: RowResult[] = [];
    const created: Array<Parameters<typeof viralRepo.create>[0]> = [];

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 헤더 스킵

      const cafeName = String(row.getCell(1).value || '').trim();
      const title = String(row.getCell(2).value || '').trim();
      const url = String(row.getCell(3).value || '').trim();
      const author = String(row.getCell(4).value || '').trim();
      const platform = String(row.getCell(5).value || '').trim();

      if (!url) {
        results.push({ row: rowNumber, status: 'error', title, error: 'URL 누락' });
        return;
      }

      if (!url.startsWith('http')) {
        results.push({ row: rowNumber, status: 'error', title, error: '유효하지 않은 URL' });
        return;
      }

      if (existingUrls.has(url)) {
        results.push({ row: rowNumber, status: 'duplicate', title });
        return;
      }

      existingUrls.add(url);
      results.push({ row: rowNumber, status: 'success', title });
      created.push({
        projectId: pid,
        productId,
        guideId,
        title: title || url,
        url,
        platform: platform || detectPlatform(url),
        cafeName: cafeName || '',
        author: author || '',
        batchId,
        status: 'pending' as const,
        verification: { result: null, score: null, grade: null, checkedAt: null, details: [], issues: [] },
        verificationHistory: [],
        comments: { totalCount: 0, negativeCount: 0, lastCheckedAt: null },
      });
    });

    // 일괄 저장
    const savedVirals = [];
    for (const data of created) {
      const viral = await viralRepo.create(data);
      savedVirals.push(viral);
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const dupCount = results.filter((r) => r.status === 'duplicate').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    return jsonResponse({
      message: `${successCount}건 등록, ${dupCount}건 중복, ${errorCount}건 오류`,
      batchId,
      summary: { success: successCount, duplicate: dupCount, error: errorCount },
      results,
    }, 201);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Excel import failed',
      500,
    );
  }
}
