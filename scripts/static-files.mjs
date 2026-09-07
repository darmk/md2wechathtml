import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { siteBasePath } from '../lib/site-path.ts';

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.rsc': 'text/x-component', '.json': 'application/json', '.woff2': 'font/woff2',
};

// Mirror the Nginx subdirectory mapping, without an SPA fallback hiding missing files.
export async function startStaticServer(directory, port = 0) {
  const root = path.resolve(directory);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === siteBasePath) {
        res.writeHead(301, { Location: `${siteBasePath}/${url.search}` });
        return res.end();
      }
      const pathname = decodeURIComponent(url.pathname);
      if (!pathname.startsWith(`${siteBasePath}/`)) {
        res.writeHead(404);
        return res.end('Not found');
      }
      const relative = pathname.slice(siteBasePath.length + 1);
      const filename = path.resolve(root, relative || 'index.html');
      if (!filename.startsWith(`${root}${path.sep}`) || relative.includes('\\')) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
      if (!(await stat(filename)).isFile()) throw new Error('Not a file');
      const body = await readFile(filename);
      res.writeHead(200, { 'Content-Type': types[path.extname(filename)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}${siteBasePath}/`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    },
  };
}
