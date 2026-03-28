/**
 * PDF 텍스트 추출 서비스
 * pdf-parse를 동적 import로 로드 (Vercel 번들링 호환)
 */

const MAX_CHARS = 50_000;

export async function parsePdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  // Dynamic import to avoid bundling issues with pdf-parse's fs dependency
  // @ts-expect-error pdf-parse has no type declarations
  const pdfParse = (await import('pdf-parse')).default;
  const result = await pdfParse(buffer);
  const text = result.text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS);
  return { text, pages: result.numpages };
}
