// Local preview of the Vercel build: the same handler, with a SQLite file instead of Turso.
//   npm run dev:vercel            -> http://127.0.0.1:4174
// Environment variables are read from .env.local when it exists (see .env.example).
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { bundleFunction, copyAssets } from './vercel-bundle.mjs';

const { values } = parseArgs({
  options: { host: { type: 'string', default: '127.0.0.1' }, port: { type: 'string', default: '4174' } },
});

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
process.env.TURSO_DATABASE_URL ||= 'file:dist/vercel-dev/local.db';

const root = resolve('dist/vercel-dev');
const staticDir = join(root, 'static/assets');
await copyAssets(staticDir);
const outfile = join(root, 'server.mjs');
await bundleFunction({
  stdin: {
    contents: "import { createClient } from '@libsql/client'; import { createHandler } from './vercel/handler.js'; export default createHandler(createClient);",
    resolveDir: process.cwd(),
    loader: 'js',
  },
  outfile,
  external: ['@libsql/client'],
});
const { default: handler } = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);

const types = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/assets/')) {
    const file = join(staticDir, pathname.slice('/assets/'.length));
    if (file.startsWith(staticDir) && await stat(file).then((s) => s.isFile(), () => false)) {
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=600' });
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
      return;
    }
  }
  handler(req, res);
}).listen(Number(values.port), values.host, () => {
  console.log(`Unistay (Vercel preview) http://${values.host}:${values.port}`);
});
