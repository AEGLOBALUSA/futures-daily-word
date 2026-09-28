#!/usr/bin/env node
// Minimal static file server with SPA fallback, for serving a built `dist/`
// during the walk-through / smoke checks. No third-party deps — every request
// the app makes to /api/* or /.netlify/functions/* is intercepted by
// Playwright before it ever reaches this server; this server only needs to
// serve the built static files (and fall back to index.html for app routes
// like /staff, which main.tsx branches on via window.location.pathname).
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Serve `distDir` on `port`, resolving `${port} -> {url, close()}`.
 * SPA fallback: any GET for a path with no file extension that doesn't exist
 * on disk gets index.html (so /staff, deep links, etc. work).
 */
export function serveDist(distDir, port = 0) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') pathname = '/index.html';
      let filePath = path.join(distDir, pathname);

      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        const hasExt = path.extname(pathname) !== '';
        if (!hasExt) {
          filePath = path.join(distDir, 'index.html');
        }
      }

      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(String(err));
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      const actualPort = server.address().port;
      resolve({
        url: `http://localhost:${actualPort}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

// Allow running directly: `node scripts/visual/server.mjs <distDir> <port>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const distDir = process.argv[2] || 'dist';
  const port = Number(process.argv[3] || 0);
  const { url } = await serveDist(distDir, port);
  console.log(url);
}
