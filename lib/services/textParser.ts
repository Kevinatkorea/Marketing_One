// ============================================================
// PerformanceOne - Text Parser for Bulk Viral Entry
// ============================================================

export interface ParsedViralEntry {
  cafeName: string;
  title: string;
  url: string;
  platform: string;
}

/**
 * Detect platform from URL.
 */
function detectPlatform(url: string): string {
  if (url.includes('cafe.naver.com')) return '네이버카페';
  if (url.includes('blog.naver.com')) return '네이버블로그';
  if (url.includes('kin.naver.com')) return '네이버지식인';
  if (url.includes('post.naver.com')) return '네이버포스트';
  if (url.includes('instagram.com')) return '인스타그램';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '유튜브';
  if (url.includes('tiktok.com')) return '틱톡';
  if (url.includes('twitter.com') || url.includes('x.com')) return '트위터/X';
  if (url.includes('facebook.com') || url.includes('fb.com')) return '페이스북';
  if (url.includes('tistory.com')) return '티스토리';
  if (url.includes('brunch.co.kr')) return '브런치';
  return '기타';
}

/**
 * Check if a string contains a URL pattern.
 */
function isUrl(text: string): boolean {
  return /https?:\/\//.test(text.trim());
}

/**
 * Parse pasted text into viral entries.
 *
 * Supports 3 formats:
 *
 * Format 1 - 3-line repeating:
 *   카페명
 *   제목
 *   https://cafe.naver.com/...
 *
 * Format 2 - Pipe separated:
 *   카페명 | 제목 | https://cafe.naver.com/...
 *
 * Format 3 - Tab separated:
 *   카페명\t제목\thttps://cafe.naver.com/...
 */
export function parseViralText(text: string): ParsedViralEntry[] {
  const entries: ParsedViralEntry[] = [];

  // Normalize line endings and split
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length === 0) return entries;

  // Detect format by checking the first few lines

  // Check for pipe-separated format (any line contains ' | ' with a URL)
  const hasPipeSeparator = lines.some(
    (line) => line.includes(' | ') && isUrl(line)
  );

  // Check for tab-separated format (any line contains tab with a URL)
  const hasTabSeparator = lines.some(
    (line) => line.includes('\t') && isUrl(line)
  );

  if (hasPipeSeparator) {
    // Format 2: Pipe separated
    for (const line of lines) {
      if (!isUrl(line)) continue;
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 3) {
        const url = parts.find((p) => isUrl(p)) || parts[parts.length - 1];
        const nonUrlParts = parts.filter((p) => p !== url);
        entries.push({
          cafeName: nonUrlParts[0] || '',
          title: nonUrlParts[1] || nonUrlParts[0] || '',
          url,
          platform: detectPlatform(url),
        });
      } else if (parts.length === 2) {
        const url = parts.find((p) => isUrl(p)) || parts[1];
        const other = parts.find((p) => !isUrl(p)) || '';
        entries.push({
          cafeName: '',
          title: other,
          url,
          platform: detectPlatform(url),
        });
      }
    }
  } else if (hasTabSeparator) {
    // Format 3: Tab separated
    for (const line of lines) {
      if (!isUrl(line)) continue;
      const parts = line.split('\t').map((p) => p.trim());
      if (parts.length >= 3) {
        const url = parts.find((p) => isUrl(p)) || parts[parts.length - 1];
        const nonUrlParts = parts.filter((p) => p !== url);
        entries.push({
          cafeName: nonUrlParts[0] || '',
          title: nonUrlParts[1] || nonUrlParts[0] || '',
          url,
          platform: detectPlatform(url),
        });
      } else if (parts.length === 2) {
        const url = parts.find((p) => isUrl(p)) || parts[1];
        const other = parts.find((p) => !isUrl(p)) || '';
        entries.push({
          cafeName: '',
          title: other,
          url,
          platform: detectPlatform(url),
        });
      }
    }
  } else {
    // Format 1: 3-line repeating (or URL-only lines)
    // Group lines by finding URLs, and the preceding lines are metadata
    const buffer: string[] = [];

    for (const line of lines) {
      if (isUrl(line)) {
        // URL이 줄 중간에 있을 수 있음: "제목   https://..." → 분리
        const urlMatch = line.match(/(https?:\/\/\S+)/);
        const url = urlMatch ? urlMatch[1] : line.trim();
        const beforeUrl = urlMatch ? line.slice(0, urlMatch.index).trim() : '';

        // The preceding buffered lines are cafeName and title
        if (buffer.length >= 2) {
          entries.push({
            cafeName: buffer[buffer.length - 2],
            title: beforeUrl || buffer[buffer.length - 1],
            url,
            platform: detectPlatform(url),
          });
        } else if (buffer.length === 1) {
          entries.push({
            cafeName: beforeUrl ? buffer[0] : '',
            title: beforeUrl || buffer[0],
            url,
            platform: detectPlatform(url),
          });
        } else if (beforeUrl) {
          // 한 줄에 "제목 URL" 형식
          entries.push({
            cafeName: '',
            title: beforeUrl,
            url,
            platform: detectPlatform(url),
          });
        } else {
          entries.push({
            cafeName: '',
            title: '',
            url,
            platform: detectPlatform(url),
          });
        }
        buffer.length = 0; // clear buffer
      } else {
        buffer.push(line);
      }
    }
  }

  return entries;
}
