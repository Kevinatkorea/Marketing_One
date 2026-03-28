/**
 * URL 콘텐츠 크롤러
 *
 * 1순위: 외부 Puppeteer Stealth 크롤링 서버 (CRAWLER_SERVER_URL 설정 시)
 * 2순위: 내장 fetch + cheerio (경량 폴백)
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

// --- 1순위: 외부 Puppeteer Stealth 서버 ---

async function crawlViaStealth(url: string): Promise<CrawlResult | null> {
  const serverUrl = process.env.CRAWLER_SERVER_URL;
  const apiKey = process.env.CRAWLER_API_KEY;
  if (!serverUrl) return null; // 서버 미설정 → 폴백

  try {
    const res = await fetch(`${serverUrl}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey || '',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) return null;

    const data = await res.json() as CrawlResult;
    if (data.success && data.text && data.charCount > 50) {
      return data;
    }
    return null; // 서버 응답했지만 콘텐츠 부족 → 폴백
  } catch {
    return null; // 서버 에러 → 폴백
  }
}

// --- 2순위: 내장 fetch + cheerio (경량 폴백) ---

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

async function crawlViaFetch(url: string): Promise<CrawlResult> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
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

// --- 메인 함수: Stealth 우선 → fetch 폴백 ---

export async function crawlUrl(url: string): Promise<CrawlResult> {
  // 1순위: Puppeteer Stealth 서버
  const stealthResult = await crawlViaStealth(url);
  if (stealthResult) return stealthResult;

  // 2순위: 내장 fetch + cheerio
  return crawlViaFetch(url);
}
