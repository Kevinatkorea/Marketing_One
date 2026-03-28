# PerformanceOne Crawler Server

Puppeteer Stealth 기반 크롤링 서버. 네이버 카페/블로그 등 JavaScript 렌더링이 필요한 페이지를 크롤링합니다.

## Railway 배포

1. [Railway](https://railway.app) 가입
2. New Project → Deploy from GitHub repo
3. `crawler-server/` 디렉토리를 Root Directory로 설정
4. 환경변수 설정:
   - `CRAWLER_API_KEY`: 임의의 API 키 (Vercel과 동일하게)
5. 배포 완료 후 URL 복사 (예: `https://xxx.railway.app`)

## Vercel 연동

Vercel 환경변수에 추가:
- `CRAWLER_SERVER_URL`: Railway 배포 URL (예: `https://xxx.railway.app`)
- `CRAWLER_API_KEY`: 위에서 설정한 API 키

## API

### POST /crawl
```json
Headers: { "X-API-Key": "your-api-key" }
Body: { "url": "https://cafe.naver.com/..." }
Response: {
  "success": true,
  "title": "글 제목",
  "text": "본문 텍스트",
  "imageCount": 3,
  "comments": [{ "author": "유저", "content": "댓글" }]
}
```

### GET /health
```json
{ "status": "ok" }
```

## 로컬 실행
```bash
cd crawler-server
npm install
CRAWLER_API_KEY=test node index.js
```
