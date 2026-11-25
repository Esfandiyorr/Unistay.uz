import { readFile, writeFile } from 'node:fs/promises';

const databaseId = process.env.UNISTAY_D1_DATABASE_ID ?? '';
if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(databaseId)) {
  throw new Error('Set UNISTAY_D1_DATABASE_ID to the ID of the separate unistayuz database.');
}

await import('./build.mjs');

const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'));
config.name = 'unistay-uz';
config.workers_dev = false;
config.preview_urls = false;
config.keep_vars = true;
config.vars = { UNISTAY_ADMIN_AUTH: 'cloudflare-access' };
config.d1_databases = [{
  ...config.d1_databases[0],
  database_name: 'unistayuz',
  database_id: databaseId,
}];
config.r2_buckets = [{ binding: 'BUCKET', bucket_name: 'unistay-media' }];

await writeFile('dist/server/wrangler.cloudflare.json', JSON.stringify(config, null, 2) + '\n');
