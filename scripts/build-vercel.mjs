// Builds the site for Vercel using the Build Output API (https://vercel.com/docs/build-output-api).
// Static files go to the CDN; everything else runs the Worker in one Node.js function.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { bundleFunction, copyAssets } from './vercel-bundle.mjs';

const output = '.vercel/output';
const functionDir = `${output}/functions/index.func`;

await rm(output, { recursive: true, force: true });
const assetCount = await copyAssets(`${output}/static/assets`);
await mkdir(functionDir, { recursive: true });
const migrationCount = await bundleFunction({ entryPoints: ['vercel/index.js'], outfile: `${functionDir}/index.mjs` });

await writeFile(`${functionDir}/.vc-config.json`, JSON.stringify({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
  supportsResponseStreaming: true,
  maxDuration: 30,
}, null, 2) + '\n');

await writeFile(`${output}/config.json`, JSON.stringify({
  version: 3,
  routes: [
    { src: '^/assets/(.*)$', headers: { 'Cache-Control': 'public, max-age=600' }, continue: true },
    { handle: 'filesystem' },
    { src: '^/(.*)$', dest: '/index' },
  ],
}, null, 2) + '\n');

console.log(`Vercel output built with ${assetCount} assets and ${migrationCount} migrations.`);
