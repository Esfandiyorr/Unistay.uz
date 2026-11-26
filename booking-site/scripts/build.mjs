import { mkdir, readFile, readdir, writeFile, cp } from 'node:fs/promises';
import { extname } from 'node:path';
import { build } from 'esbuild';

const manifest = JSON.parse(await readFile('.openai/hosting.json', 'utf8'));
const types = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

const assets = {};
for (const directory of ['web', 'web/fonts', 'web/images']) {
  for (const file of await readdir(directory)) {
    const type = types[extname(file)];
    if (!type) continue;
    const data = await readFile(`${directory}/${file}`);
    const payload = type.startsWith('text/') || type === 'image/svg+xml'
      ? { text: data.toString('utf8') }
      : { base64: data.toString('base64') };
    assets[`/assets/${file}`] = { type, size: data.byteLength, ...payload };
  }
}

await build({
  entryPoints: ['worker/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/server/index.js',
  target: 'es2023',
  plugins: [{
    name: 'unistay-assets',
    setup(builder) {
      builder.onResolve({ filter: /^unistay:assets$/ }, () => ({ path: 'assets', namespace: 'unistay' }));
      builder.onLoad({ filter: /.*/, namespace: 'unistay' }, () => ({
        contents: `export const assets = ${JSON.stringify(assets)};`,
        loader: 'js',
      }));
    },
  }],
});

await mkdir('dist/.openai', { recursive: true });
await writeFile('dist/.openai/hosting.json', JSON.stringify(manifest, null, 2) + '\n');
await cp('drizzle', 'dist/drizzle', { recursive: true });
await writeFile('dist/server/wrangler.json', JSON.stringify({
  name: 'unistay',
  main: 'index.js',
  compatibility_date: '2025-09-01',
  d1_databases: [{ binding: 'DB', database_name: 'unistay-local', database_id: 'unistay-local', migrations_dir: '../drizzle' }],
  r2_buckets: [{ binding: 'BUCKET', bucket_name: 'unistay-local-media' }],
}, null, 2) + '\n');

const module = await import('../dist/server/index.js');
if (typeof module.default?.fetch !== 'function') throw new Error('The build must export a Worker fetch handler.');
console.log(`Worker built with ${Object.keys(assets).length} assets and D1 migrations.`);
