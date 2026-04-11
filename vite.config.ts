import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import dotenv from 'dotenv'

// dev 플러그인에서 Vercel Functions가 process.env를 읽어야 하므로 .env.local을 먼저 로드한다
dotenv.config({ path: path.resolve('.env.local') })

/**
 * Vite 플러그인: Vercel Functions를 로컬에서 실행
 * /api/* 요청을 해당 api/ 디렉토리의 핸들러로 라우팅
 */
function vercelFunctionsDevPlugin(): Plugin {
  return {
    name: 'vercel-functions-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const segments = url.pathname.split('/').filter(Boolean); // ['api', ...]

          // 요청 body 읽기
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const bodyText = Buffer.concat(chunks).toString();

          // Request 객체 생성
          const headers = new Headers();
          for (const [key, val] of Object.entries(req.headers)) {
            if (val) headers.set(key, Array.isArray(val) ? val[0] : val);
          }
          const fetchReq = new Request(url.toString(), {
            method: req.method || 'GET',
            headers,
            body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : bodyText,
          });

          // 라우팅: vercel.json rewrites 매핑
          let handler: any;

          if (segments.length === 2 && segments[1] === 'health') {
            // /api/health
            handler = await server.ssrLoadModule(
              path.resolve('api/health.ts')
            );
          } else if (segments.length === 2 && segments[1] === 'projects') {
            // /api/projects
            handler = await server.ssrLoadModule(
              path.resolve('api/projects/index.ts')
            );
          } else if (segments.length >= 3 && segments[1] === 'projects') {
            // /api/projects/:pid/...
            handler = await server.ssrLoadModule(
              path.resolve('api/projects/[pid]/[[...path]].ts')
            );
          }

          if (!handler) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'API route not found' }));
            return;
          }

          const method = (req.method || 'GET').toUpperCase();
          const fn = handler[method];
          if (!fn) {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: `Method ${method} not allowed` }));
            return;
          }

          const response: Response = await fn(fetchReq);

          // Response → Node.js res로 변환
          res.statusCode = response.status;
          response.headers.forEach((val, key) => res.setHeader(key, val));

          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/vnd.openxmlformats')) {
            // 바이너리 (엑셀 등)
            const buffer = Buffer.from(await response.arrayBuffer());
            res.end(buffer);
          } else {
            res.end(await response.text());
          }
        } catch (err: any) {
          console.error('[API Error]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal server error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [vercelFunctionsDevPlugin(), react(), tailwindcss()],
})
