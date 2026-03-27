/**
 * URL 콘텐츠 크롤러 — fetch + cheerio (Vercel Serverless 호환)
 * Puppeteer는 Vercel 함수 크기 제한으로 사용 불가하므로 경량 크롤링 사용
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
  error?: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

export async function crawlUrl(url: string): Promise<CrawlResult> {
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
        success: false,
        title: '',
        text: '',
        imageCount: 0,
        linkCount: 0,
        charCount: 0,
        links: [],
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();

    const title = $('title').text().trim()
      || $('meta[property="og:title"]').attr('content')?.trim()
      || '';

    // Extract main content area (try common selectors)
    const contentSelectors = [
      '.article_viewer', '.se-main-container',   // Naver Blog
      '.ArticleContentBox', '.article_container', // Naver Cafe
      '.post-content', '.entry-content',          // General blogs
      'article', 'main', '.content', '#content',
    ];

    let text = '';
    for (const sel of contentSelectors) {
      const el = $(sel);
      if (el.length > 0) {
        text = el.text().replace(/\s+/g, ' ').trim();
        break;
      }
    }
    if (!text) {
      text = $('body').text().replace(/\s+/g, ' ').trim();
    }

    const images = $('img').toArray();
    const imageCount = images.filter((img) => {
      const src = $(img).attr('src') || '';
      return src.length > 10 && !src.includes('icon') && !src.includes('logo');
    }).length;

    const allLinks: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) allLinks.push(href);
    });

    return {
      success: true,
      title,
      text: text.slice(0, 10000), // limit to prevent token overflow
      imageCount,
      linkCount: allLinks.length,
      charCount: text.length,
      links: allLinks.slice(0, 50),
    };
  } catch (err) {
    return {
      success: false,
      title: '',
      text: '',
      imageCount: 0,
      linkCount: 0,
      charCount: 0,
      links: [],
      error: err instanceof Error ? err.message : 'Crawl failed',
    };
  }
}
