// Builds the Worker for Cloudflare: the same bundle as ChatGPT Sites (scripts/build.mjs) plus the
// web/ files as Workers Static Assets, so images and styles are served without running the Worker.
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { extname } from 'node:path';

const PUBLIC = 'dist/cloudflare/public/assets';

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

await rm('dist/cloudflare', { recursive: true, force: true });
await mkdir(PUBLIC, { recursive: true });
let count = 0;
for (const directory of ['web', 'web/fonts', 'web/images']) {
  for (const file of await readdir(directory)) {
    if (!['.css', '.js', '.svg', '.woff2', '.webp'].includes(extname(file))) continue;
    await copyFile(`${directory}/${file}`, `${PUBLIC}/${file}`);
    count += 1;
  }
}
console.log(`Copied ${count} static assets for Cloudflare.`);
