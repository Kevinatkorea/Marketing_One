/**
 * PDF 텍스트 추출 서비스
 */
// @ts-expect-error pdf-parse has no type declarations
import pdfParse from 'pdf-parse';

const MAX_CHARS = 50_000;

export async function parsePdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const result = await pdfParse(buffer);
  const text = result.text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS);
  return { text, pages: result.numpages };
}
