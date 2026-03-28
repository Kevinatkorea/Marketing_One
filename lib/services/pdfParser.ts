/**
 * PDF 텍스트 추출 서비스
 * 경량 바이너리 파싱 (Vercel Serverless 호환, 외부 의존성 없음)
 */

const MAX_CHARS = 50_000;

export async function parsePdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const content = buffer.toString('latin1');

  // Count pages
  const pageMatches = content.match(/\/Type\s*\/Page[^s]/g);
  const pages = pageMatches ? pageMatches.length : 1;

  // Extract text from PDF text objects (BT...ET blocks)
  const textParts: string[] = [];
  const btEtPattern = /BT\s([\s\S]*?)ET/g;
  let match;

  while ((match = btEtPattern.exec(content)) !== null) {
    const block = match[1];
    // Extract parenthesized strings: (text) Tj or (text) TJ
    const tjPattern = /\(([^)]*)\)\s*T[jJ]/g;
    let tjMatch;
    while ((tjMatch = tjPattern.exec(block)) !== null) {
      const decoded = tjMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (decoded.trim()) textParts.push(decoded);
    }
  }

  const text = textParts
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS);

  return {
    text: text || '(PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF일 수 있습니다.)',
    pages,
  };
}
