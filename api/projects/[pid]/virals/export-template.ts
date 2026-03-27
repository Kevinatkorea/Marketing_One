// GET /api/projects/:pid/virals/export-template — 엑셀 템플릿 다운로드

import ExcelJS from 'exceljs';

export async function GET(): Promise<Response> {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('바이럴 등록');

    // 헤더
    ws.columns = [
      { header: '카페명', key: 'cafeName', width: 20 },
      { header: '제목', key: 'title', width: 40 },
      { header: 'URL', key: 'url', width: 50 },
      { header: '작성자', key: 'author', width: 15 },
      { header: '플랫폼', key: 'platform', width: 15 },
    ];

    // 헤더 스타일
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      cell.alignment = { horizontal: 'center' };
    });

    // 샘플 행
    ws.addRow({
      cafeName: '뷰티인사이드',
      title: '[후기] 봄 한정판 수분크림 2주 사용기',
      url: 'https://cafe.naver.com/example/12345',
      author: '리뷰어A',
      platform: '네이버카페',
    });
    ws.addRow({
      cafeName: '맘스톡',
      title: '아이 보습크림 추천 리뷰',
      url: 'https://cafe.naver.com/example/67890',
      author: '리뷰어B',
      platform: '네이버카페',
    });

    // 샘플 행 스타일 (연한 회색)
    [2, 3].forEach((rowNum) => {
      ws.getRow(rowNum).eachCell((cell) => {
        cell.font = { color: { argb: 'FF999999' }, italic: true };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="viral-upload-template.xlsx"',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Template generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
