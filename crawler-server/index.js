import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

const API_KEY = process.env.CRAWLER_API_KEY || 'dev-key';
const PORT = process.env.PORT || 3000;

// Auth middleware
function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// Shared browser instance (reuse across requests)
let browser = null;

async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--no-first-run',
        '--disable-features=site-per-process',
        '--js-flags=--max-old-space-size=256',
      ],
      protocolTimeout: 45000,
    });
  }
  return browser;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'marketing-one-crawler' });
});

// Debug endpoint — returns raw HTML for selector debugging
app.post('/debug', auth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  let page;
  try {
    const br = await getBrowser();
    page = await br.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font'].includes(type)) req.abort();
      else req.continue();
    });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      if (!e.message.includes('timeout')) throw e;
    }
    await new Promise(r => setTimeout(r, 3000));
    const html = await page.content();
    const finalUrl = page.url();
    res.json({ url: finalUrl, htmlLength: html.length, htmlSnippet: html.slice(0, 5000) });
  } catch (err) {
    res.json({ error: err.message });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

// Convert to mobile URL for faster loading (no iframe)
function toMobileUrl(url) {
  return url
    .replace('://blog.naver.com/', '://m.blog.naver.com/')
    .replace('://cafe.naver.com/', '://m.cafe.naver.com/');
}

// Main crawl endpoint
app.post('/crawl', auth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let page;
  try {
    const br = await getBrowser();
    page = await br.newPage();

    // Block heavy resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    // Use mobile URL for Naver (faster, no iframe)
    const targetUrl = toMobileUrl(url);

    // Navigate — catch timeout but still try to extract whatever loaded
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (navErr) {
      if (!navErr.message.includes('timeout')) throw navErr;
    }
    // Give JS time to render dynamic content (iframes, ajax)
    await new Promise(r => setTimeout(r, 4000));

    // Detect platform and extract content
    const currentUrl = page.url();
    let result;

    if (currentUrl.includes('m.cafe.naver.com') || currentUrl.includes('m.blog.naver.com')) {
      result = await extractNaverMobile(page);
    } else if (currentUrl.includes('cafe.naver.com')) {
      result = await extractNaverCafe(page);
    } else if (currentUrl.includes('blog.naver.com')) {
      result = await extractNaverBlog(page);
    } else if (currentUrl.includes('instagram.com')) {
      result = await extractInstagram(page);
    } else {
      result = await extractGeneric(page);
    }

    res.json({
      success: true,
      url: currentUrl,
      ...result,
    });
  } catch (err) {
    res.json({
      success: false,
      url,
      error: err.message,
      title: '',
      text: '',
      imageCount: 0,
      linkCount: 0,
      charCount: 0,
      comments: [],
    });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

// --- Platform-specific extractors ---

async function extractNaverMobile(page) {
  // Mobile Naver has no iframe — content is directly in the page
  await new Promise(r => setTimeout(r, 2000)); // wait for JS render

  const data = await page.evaluate(() => {
    const title = document.querySelector(
      '.se-title-text, .tit_viewer, .post_tit, h2.tit, .title_area .title, .ArticleTitle'
    )?.textContent?.trim() || document.title || '';

    const bodyEl = document.querySelector(
      '.se-main-container, .post_ct, .article_viewer, ._postView, .ContentRenderer, #viewTypeSelector, .se-viewer'
    );
    const text = bodyEl?.textContent?.replace(/\s+/g, ' ')?.trim() || document.body?.textContent?.replace(/\s+/g, ' ')?.trim() || '';

    const images = document.querySelectorAll('.se-main-container img, .post_ct img, .article_viewer img, img.se-image-resource');
    const imageCount = Array.from(images).filter(img => (img.src || '').length > 20).length;

    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.href).filter(h => h.startsWith('http'));

    const commentEls = document.querySelectorAll('.u_cbox_comment_box, .comment_item, .CommentItem');
    const comments = Array.from(commentEls).map(el => ({
      author: el.querySelector('.u_cbox_nick, .comment_nickname, .nick')?.textContent?.trim() || '익명',
      content: el.querySelector('.u_cbox_contents, .text_comment, .comment_text')?.textContent?.trim() || '',
    })).filter(c => c.content.length > 0);

    return {
      title,
      text: text.slice(0, 15000),
      imageCount,
      linkCount: links.length,
      charCount: text.length,
      links: links.slice(0, 30),
      comments,
    };
  });
  return data;
}

async function extractNaverCafe(page) {
  // Naver Cafe loads content in iframe
  try {
    // Wait for iframe to load
    await page.waitForSelector('iframe#cafe_main', { timeout: 8000 });
    const frame = await page.frames().find(f => f.url().includes('ArticleRead') || f.url().includes('cafe'));

    if (!frame) {
      // Fallback: try to extract from main page
      return await extractGeneric(page);
    }

    // Wait for content to render
    await frame.waitForSelector('.se-main-container, .article_viewer, .ContentRenderer', { timeout: 8000 }).catch(() => {});

    const data = await frame.evaluate(() => {
      const title = document.querySelector('.title_text, .tit_area .title')?.textContent?.trim() || '';

      // Extract body text
      const bodyEl = document.querySelector('.se-main-container, .article_viewer, .ContentRenderer, .article_container');
      const text = bodyEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';

      // Count images (content images, not icons)
      const images = document.querySelectorAll('.se-main-container img, .article_viewer img, .ContentRenderer img');
      const contentImages = Array.from(images).filter(img => {
        const src = img.src || '';
        return src.length > 20 && !src.includes('icon') && !src.includes('logo') && img.width > 50;
      });

      // Extract links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(h => h.startsWith('http'));

      // Extract comments
      const commentEls = document.querySelectorAll('.comment_item, .CommentItem');
      const comments = Array.from(commentEls).map(el => {
        const author = el.querySelector('.comment_nickname, .nick')?.textContent?.trim() || '익명';
        const content = el.querySelector('.text_comment, .comment_text, .txt')?.textContent?.trim() || '';
        return { author, content };
      }).filter(c => c.content.length > 0);

      return {
        title,
        text: text.slice(0, 15000),
        imageCount: contentImages.length,
        linkCount: links.length,
        charCount: text.length,
        links: links.slice(0, 30),
        comments,
      };
    });

    return data;
  } catch (err) {
    // Fallback to generic
    return await extractGeneric(page);
  }
}

async function extractNaverBlog(page) {
  try {
    // Blog also uses iframe
    await page.waitForSelector('iframe#mainFrame', { timeout: 8000 });
    const frame = page.frames().find(f => f.url().includes('PostView') || f.url().includes('blog'));

    if (!frame) return await extractGeneric(page);

    await frame.waitForSelector('.se-main-container, .post-view, #postViewArea', { timeout: 8000 }).catch(() => {});

    const data = await frame.evaluate(() => {
      const title = document.querySelector('.se-title-text, .pcol1, .tit_h3')?.textContent?.trim() || '';
      const bodyEl = document.querySelector('.se-main-container, #postViewArea, .post-view');
      const text = bodyEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
      const images = document.querySelectorAll('.se-main-container img, #postViewArea img');
      const contentImages = Array.from(images).filter(img => (img.src || '').length > 20 && img.width > 50);
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.startsWith('http'));

      // Blog comments
      const commentEls = document.querySelectorAll('.u_cbox_comment_box');
      const comments = Array.from(commentEls).map(el => ({
        author: el.querySelector('.u_cbox_nick')?.textContent?.trim() || '익명',
        content: el.querySelector('.u_cbox_contents')?.textContent?.trim() || '',
      })).filter(c => c.content.length > 0);

      return {
        title,
        text: text.slice(0, 15000),
        imageCount: contentImages.length,
        linkCount: links.length,
        charCount: text.length,
        links: links.slice(0, 30),
        comments,
      };
    });

    return data;
  } catch {
    return await extractGeneric(page);
  }
}

async function extractInstagram(page) {
  // Instagram requires login for most content
  return await extractGeneric(page);
}

async function extractGeneric(page) {
  const data = await page.evaluate(() => {
    // Remove noise
    document.querySelectorAll('script, style, nav, footer, header, aside').forEach(el => el.remove());

    const title = document.title || document.querySelector('h1')?.textContent?.trim() || '';
    const bodyEl = document.querySelector('article, main, .content, #content, body');
    const text = bodyEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const images = document.querySelectorAll('img');
    const contentImages = Array.from(images).filter(img => (img.src || '').length > 20 && img.width > 50);
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.startsWith('http'));

    return {
      title,
      text: text.slice(0, 15000),
      imageCount: contentImages.length,
      linkCount: links.length,
      charCount: text.length,
      links: links.slice(0, 30),
      comments: [],
    };
  });
  return data;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Crawler server running on port ${PORT}`);
});
