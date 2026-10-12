import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { publicFiles, deploymentHTML } from './public-files.mjs';

const built = process.argv[2] === 'dist';
if (process.argv[2] && !built) throw new Error('Preview accepts only the source or dist directory');
const directory = resolve(import.meta.dirname, '..', built ? 'dist' : '.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let route = pathname.slice(1);
    if (!route || route === 'cm' || route.endsWith('/')) route += route === 'cm' ? '/index.html' : 'index.html';
    if (!publicFiles.has(route)) { response.writeHead(404); response.end('Not found'); return; }
    let body = await readFile(resolve(directory, built ? route : publicFiles.get(route)));
    if (!built && route.endsWith('.html')) body = deploymentHTML(route, body.toString('utf8'));
    response.writeHead(200, { 'Content-Type': types[extname(route)] || 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}`));
