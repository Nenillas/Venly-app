import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';
import { SEO_PAGES, injectSeoHead, seoPageByPath, type SeoPage } from './src/lib/seo';

const SEO_MARKER_PAGES = SEO_PAGES;

function pageFromUrl(url = '/'): SeoPage | null {
  const path = url.split('?')[0] || '/';
  return seoPageByPath(path);
}

function outFileFor(page: SeoPage): string {
  if (page.path === '/') return 'index.html';
  return `${page.path.replace(/^\//, '')}/index.html`;
}

async function serveSeoHtml(server: ViteDevServer, url: string, res: import('node:http').ServerResponse) {
  const page = pageFromUrl(url);
  if (!page?.index) return false;
  const indexPath = resolve(server.config.root, 'index.html');
  let html = readFileSync(indexPath, 'utf8');
  html = await server.transformIndexHtml(url, html);
  html = injectSeoHead(html, page);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
  return true;
}

function attachPreview(server: PreviewServer, distDir: string) {
  server.middlewares.use((req, res, next) => {
    const url = req.url?.split('?')[0] || '/';
    const page = pageFromUrl(url);
    if (!page?.index) return next();
    try {
      const file = resolve(distDir, outFileFor(page));
      const html = readFileSync(file, 'utf8');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    } catch {
      next();
    }
  });
}

export function marketingSeoPlugin(): Plugin {
  let distDir = 'dist';
  return {
    name: 'venly-marketing-seo',
    configResolved(config) {
      distDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = pageFromUrl(ctx.originalUrl || ctx.path || '/');
        if (!page) return html;
        return injectSeoHead(html, page);
      },
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '/';
        if (url.startsWith('/src/') || url.startsWith('/@') || url.startsWith('/node_modules')) {
          next();
          return;
        }
        try {
          if (await serveSeoHtml(server, url, res)) return;
        } catch {
          /* fall through */
        }
        next();
      });
    },
    configurePreviewServer(server) {
      attachPreview(server, distDir);
    },
    writeBundle() {
      const indexPath = resolve(distDir, 'index.html');
      const built = readFileSync(indexPath, 'utf8');
      for (const page of SEO_MARKER_PAGES) {
        const html = injectSeoHead(built, page);
        const dest = resolve(distDir, outFileFor(page));
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, html, 'utf8');
      }
    },
  };
}
