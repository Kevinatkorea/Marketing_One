/**
 * 가이드 PDF 내보내기 (클라이언트 사이드).
 *
 * 구현 방식: 숨겨진 HTML 노드를 렌더 → html2canvas로 캔버스화 → jsPDF 이미지 임베드.
 * 이 방식은 한글 폰트 임베드 필요 없이 브라우저의 시스템 폰트로 렌더링되므로 한국어 호환성이 완벽하다.
 * 단점: PDF 내 텍스트가 이미지라 검색/선택 불가능 — 가이드 배포 용도에는 충분.
 */
import type { Guide, Product } from '../types';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownishToHtml(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) {
      closeList();
      html.push('<div style="height:6px"></div>');
      continue;
    }
    if (line.startsWith('# ')) {
      closeList();
      html.push(`<h1 style="font-size:22px;font-weight:700;margin:12px 0 6px;color:#111">${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2 style="font-size:15px;font-weight:700;margin:14px 0 4px;color:#2563eb;border-bottom:1px solid #dbeafe;padding-bottom:2px">${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul style="margin:4px 0 4px 18px;padding:0">');
        inList = true;
      }
      html.push(`<li style="margin:2px 0;line-height:1.5">${escapeHtml(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    html.push(`<p style="margin:4px 0;line-height:1.55;color:#333">${escapeHtml(line)}</p>`);
  }
  closeList();
  return html.join('\n');
}

function buildDocumentHtml(guide: Guide, product: Product): string {
  const reqKw =
    (guide.verificationRules.find((r) => r.ruleId === 'required_keywords')?.config?.keywords as string[]) ?? [];
  const forbKw =
    (guide.verificationRules.find((r) => r.ruleId === 'forbidden_keywords')?.config?.keywords as string[]) ?? [];
  const minLen =
    (guide.verificationRules.find((r) => r.ruleId === 'content_structure')?.config?.minLength as number) ?? 0;

  const body = markdownishToHtml(guide.customGuidelines || '');

  return `
    <div style="font-family: 'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif; color:#222; padding:32px; width:720px; background:#fff; box-sizing:border-box;">
      <div style="border-bottom:2px solid #2563eb; padding-bottom:10px; margin-bottom:16px;">
        <div style="font-size:11px; color:#666;">${escapeHtml(product.name)} · v${escapeHtml(guide.version)} · ${new Date(guide.createdAt).toLocaleDateString('ko-KR')}</div>
        <div style="font-size:20px; font-weight:700; color:#111; margin-top:4px;">바이럴 마케팅 작성 가이드</div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:18px; font-size:12px;">
        <tbody>
          <tr>
            <td style="background:#f1f5f9; padding:6px 10px; color:#475569; width:90px; border:1px solid #e2e8f0;">제품명</td>
            <td style="padding:6px 10px; border:1px solid #e2e8f0;">${escapeHtml(product.name)}</td>
          </tr>
          <tr>
            <td style="background:#f1f5f9; padding:6px 10px; color:#475569; border:1px solid #e2e8f0;">카테고리</td>
            <td style="padding:6px 10px; border:1px solid #e2e8f0;">${escapeHtml(product.category || '-')}</td>
          </tr>
          <tr>
            <td style="background:#f1f5f9; padding:6px 10px; color:#475569; border:1px solid #e2e8f0;">최소 글자수</td>
            <td style="padding:6px 10px; border:1px solid #e2e8f0;">${minLen}자</td>
          </tr>
        </tbody>
      </table>

      ${body}

      <h2 style="font-size:15px;font-weight:700;margin:16px 0 4px;color:#2563eb;border-bottom:1px solid #dbeafe;padding-bottom:2px">검증 규칙 요약</h2>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr>
            <th style="background:#1e293b;color:#fff;padding:6px 10px;text-align:left;border:1px solid #0f172a;">항목</th>
            <th style="background:#1e293b;color:#fff;padding:6px 10px;text-align:left;border:1px solid #0f172a;">내용</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;width:120px;">필수 키워드</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;">${reqKw.map(escapeHtml).join(', ') || '-'}</td>
          </tr>
          <tr>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;">사용 금지 키워드</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;color:#dc2626;">${forbKw.map(escapeHtml).join(', ') || '(없음)'}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:20px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; text-align:right;">
        Marketing_One · AI 자동 생성 가이드
      </div>
    </div>
  `;
}

export async function downloadGuidePdf(guide: Guide, product: Product): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // 오프스크린 컨테이너에 HTML 렌더
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.innerHTML = buildDocumentHtml(guide, product);
  document.body.appendChild(container);

  try {
    const target = container.firstElementChild as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // 긴 문서는 여러 페이지로 분할
    let heightLeft = imgHeight;
    let position = margin;
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    const safeName = product.name.replace(/[\\/:*?"<>|]/g, '_');
    pdf.save(`${safeName}_가이드_v${guide.version}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
