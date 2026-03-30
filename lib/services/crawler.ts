/**
 * URL 콘텐츠 크롤러
 *
 * - 네이버 카페: 네이버 내부 API (본문 + 댓글 한번에)
 * - 네이버 블로그: 모바일 fetch + cheerio
 * - 기타: fetch + cheerio
 */
import * as cheerio from 'cheerio';

export interface CrawlResult {
  success: boolean;
  title: string;
  text: string;
  imageCount: number;
  linkCount: number;
  charCount: number;
  links: string[];
  comments?: Array<{ author: string; content: string }>;
  error?: string;
}

// ---------------------------------------------------------------------------
// 공통
// ---------------------------------------------------------------------------

const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// 네이버 카페
// ---------------------------------------------------------------------------

interface CafeUrlParts {
  cafeName: string;
  articleId: string;
}

function parseNaverCafeUrl(url: string): CafeUrlParts | null {
  // m.cafe.naver.com/ca-fe/web/cafes/{name}/articles/{id}
  let m = url.match(/cafe\.naver\.com\/ca-fe\/web\/cafes\/([^/?#]+)\/articles\/(\d+)/);
  if (m) return { cafeName: m[1], articleId: m[2] };

  // cafe.naver.com/{name}/{id}
  m = url.match(/cafe\.naver\.com\/([^/?#]+)\/(\d+)/);
  if (m) return { cafeName: m[1], articleId: m[2] };

  return null;
}

/** cafeName → 숫자 clubId (데스크탑 카페 페이지 HTML에서 추출) */
const clubIdCache = new Map<string, number>();

async function resolveClubId(cafeName: string): Promise<number> {
  // 이미 숫자면 바로 반환
  if (/^\d+$/.test(cafeName)) return Number(cafeName);

  const cached = clubIdCache.get(cafeName);
  if (cached) return cached;

  const res = await fetch(`https://cafe.naver.com/${cafeName}`, {
    headers: { 'User-Agent': UA_DESKTOP },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  const match = html.match(/clubid=(\d+)/);
  if (!match) throw new Error(`cafeId를 찾을 수 없음: ${cafeName}`);

  const id = Number(match[1]);
  clubIdCache.set(cafeName, id);
  return id;
}

/** v2.1 본문+댓글 API 호출 */
async function fetchArticleWithComments(
  clubId: number,
  articleId: string,
  cafeName: string,
): Promise<CrawlResult> {
  const apiUrl = `https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/${clubId}/articles/${articleId}`;
  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': UA,
      'Referer': `https://m.cafe.naver.com/ca-fe/web/cafes/${cafeName}/articles/${articleId}`,
      'Accept': 'application/json',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Naver API ${res.status}`);

  const data = await res.json() as any;
  const article = data?.result?.article;
  if (!article) throw new Error('article 데이터 없음');

  // contentHtml → cheerio로 파싱
  const contentHtml = article.contentHtml || '';
  const $ = cheerio.load(contentHtml);
  $('script, style').remove();

  const text = $.text().replace(/\s+/g, ' ').trim();
  const imageCount = $('img').toArray().filter((img) => {
    const src = $(img).attr('src') || '';
    return src.length > 20 && !src.includes('icon') && !src.includes('logo');
  }).length;

  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('http')) links.push(href);
  });

  // 댓글 추출 (v2.1 응답에 포함)
  const commentItems: Array<any> = data?.result?.comments?.items || [];
  let comments = commentItems.map((c: any) => ({
    author: c?.writer?.nick || '익명',
    content: (c?.content || '').replace(/<[^>]*>/g, '').trim(),
  })).filter((c) => c.content.length > 0);

  // 댓글이 20개 이상이면 v3 API로 페이지네이션
  const totalCommentCount = article.commentCount || 0;
  if (totalCommentCount > comments.length && comments.length >= 20) {
    comments = await fetchAllComments(clubId, articleId, cafeName);
  }

  return {
    success: true,
    title: article.subject || '',
    text: text.slice(0, 10000),
    imageCount,
    linkCount: links.length,
    charCount: text.length,
    links: links.slice(0, 50),
    comments,
  };
}

/** 댓글 20개 초과 시 v3 API 페이지네이션 */
async function fetchAllComments(
  clubId: number,
  articleId: string,
  cafeName: string,
): Promise<Array<{ author: string; content: string }>> {
  const all: Array<{ author: string; content: string }> = [];
  const maxPages = 10;

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://apis.naver.com/cafe-web/cafe-articleapi/v3/cafes/${clubId}/articles/${articleId}/comments?page=${page}&orderBy=asc&perPage=20`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Referer': `https://m.cafe.naver.com/ca-fe/web/cafes/${cafeName}/articles/${articleId}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) break;

      const data = await res.json() as any;
      const items: Array<any> = data?.result?.comments?.items || [];
      if (items.length === 0) break;

      for (const c of items) {
        const content = (c?.content || '').replace(/<[^>]*>/g, '').trim();
        if (content.length > 0) {
          all.push({ author: c?.writer?.nick || '익명', content });
        }
      }

      if (items.length < 20) break;
    } catch {
      break;
    }
  }

  return all;
}

async function crawlNaverCafe(url: string): Promise<CrawlResult> {
  const parts = parseNaverCafeUrl(url);
  if (!parts) return crawlGeneric(url);

  try {
    const clubId = await resolveClubId(parts.cafeName);
    return await fetchArticleWithComments(clubId, parts.articleId, parts.cafeName);
  } catch (err) {
    // API 실패 시 generic 폴백
    return crawlGeneric(url);
  }
}

// ---------------------------------------------------------------------------
// 네이버 블로그
// ---------------------------------------------------------------------------

function toMobileBlogUrl(url: string): string {
  return url.replace('://blog.naver.com/', '://m.blog.naver.com/');
}

async function crawlNaverBlog(url: string): Promise<CrawlResult> {
  const mobileUrl = toMobileBlogUrl(url);

  try {
    const res = await fetch(mobileUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://m.blog.naver.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return crawlGeneric(url);

    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside').remove();

    const title = $('meta[property="og:title"]').attr('content')?.trim()
      || $('title').text().trim()
      || '';

    const contentSelectors = [
      '.se-main-container', '.post_ct', '.article_viewer',
      '._postView', '.ContentRenderer', '.se-viewer',
    ];

    let text = '';
    for (const sel of contentSelectors) {
      const el = $(sel);
      if (el.length > 0) { text = el.text().replace(/\s+/g, ' ').trim(); break; }
    }
    if (!text) text = $('body').text().replace(/\s+/g, ' ').trim();

    const imageCount = $('img').toArray().filter((img) => {
      const src = $(img).attr('src') || '';
      return src.length > 20 && !src.includes('icon') && !src.includes('logo');
    }).length;

    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) links.push(href);
    });

    return {
      success: true,
      title,
      text: text.slice(0, 10000),
      imageCount,
      linkCount: links.length,
      charCount: text.length,
      links: links.slice(0, 50),
    };
  } catch {
    return crawlGeneric(url);
  }
}

// ---------------------------------------------------------------------------
// 일반 사이트 (fetch + cheerio)
// ---------------------------------------------------------------------------

async function crawlGeneric(url: string): Promise<CrawlResult> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA_DESKTOP,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return {
        success: false, title: '', text: '', imageCount: 0, linkCount: 0, charCount: 0, links: [],
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();

    const title = $('title').text().trim()
      || $('meta[property="og:title"]').attr('content')?.trim()
      || '';

    const contentSelectors = [
      '.article_viewer', '.se-main-container',
      '.ArticleContentBox', '.article_container',
      '.post-content', '.entry-content',
      'article', 'main', '.content', '#content',
    ];

    let text = '';
    for (const sel of contentSelectors) {
      const el = $(sel);
      if (el.length > 0) { text = el.text().replace(/\s+/g, ' ').trim(); break; }
    }
    if (!text) text = $('body').text().replace(/\s+/g, ' ').trim();

    const imageCount = $('img').toArray().filter((img) => {
      const src = $(img).attr('src') || '';
      return src.length > 10 && !src.includes('icon') && !src.includes('logo');
    }).length;

    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) links.push(href);
    });

    return {
      success: true, title,
      text: text.slice(0, 10000),
      imageCount, linkCount: links.length, charCount: text.length,
      links: links.slice(0, 50),
    };
  } catch (err) {
    return {
      success: false, title: '', text: '', imageCount: 0, linkCount: 0, charCount: 0, links: [],
      error: err instanceof Error ? err.message : 'Crawl failed',
    };
  }
}

// ---------------------------------------------------------------------------
// 메인 함수
// ---------------------------------------------------------------------------

/** URL 문자열에서 실제 http(s) URL만 추출 (제목+URL 혼합 대응) */
function extractUrl(raw: string): string {
  const m = raw.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : raw.trim();
}

function isNaverCafe(url: string): boolean {
  return /cafe\.naver\.com/.test(url);
}

function isNaverBlog(url: string): boolean {
  return /blog\.naver\.com/.test(url);
}

/** 프록시 서버를 통한 크롤링 (네이버 IP 차단 대응) */
async function crawlViaProxy(url: string): Promise<CrawlResult | null> {
  const proxyUrl = process.env.CRAWLER_PROXY_URL;
  if (!proxyUrl) return null;

  try {
    const res = await fetch(`${proxyUrl}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRAWLER_API_KEY ? { 'x-api-key': process.env.CRAWLER_API_KEY } : {}),
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return await res.json() as CrawlResult;
  } catch {
    return null; // 프록시 실패 시 로컬 크롤링으로 폴백
  }
}

export async function crawlUrl(rawUrl: string): Promise<CrawlResult> {
  const url = extractUrl(rawUrl);
  if (!url || !url.startsWith('http')) {
    return {
      success: false, title: '', text: '', imageCount: 0, linkCount: 0, charCount: 0, links: [],
      error: 'URL이 비어있거나 올바르지 않습니다',
    };
  }

  // 프록시 서버가 설정되어 있으면 우선 사용
  const proxyResult = await crawlViaProxy(url);
  if (proxyResult) return proxyResult;

  if (isNaverCafe(url)) return crawlNaverCafe(url);
  if (isNaverBlog(url)) return crawlNaverBlog(url);
  return crawlGeneric(url);
}
