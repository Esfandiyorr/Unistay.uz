// Shared build steps for the Vercel deployment (scripts/build-vercel.mjs) and its local preview
// (scripts/dev-vercel.mjs). The ChatGPT Sites build (scripts/build.mjs) does not use this file.
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { extname } from 'node:path';
import { build } from 'esbuild';

const assetTypes = new Set(['.css', '.js', '.svg', '.woff2', '.webp']);

// Same /assets/<file> layout that scripts/build.mjs embeds into the Worker.
export async function copyAssets(target) {
  await mkdir(target, { recursive: true });
  let count = 0;
  for (const directory of ['web', 'web/fonts', 'web/images']) {
    for (const file of await readdir(directory)) {
      if (!assetTypes.has(extname(file))) continue;
      await copyFile(`${directory}/${file}`, `${target}/${file}`);
      count += 1;
    }
  }
  return count;
}

async function migrations() {
  const files = (await readdir('drizzle')).filter((file) => file.endsWith('.sql')).sort();
  return Promise.all(files.map(async (name) => ({ name, sql: await readFile(`drizzle/${name}`, 'utf8') })));
}

export async function bundleFunction({ entryPoints, stdin, outfile, external = [] }) {
  const embedded = await migrations();
  await build({
    entryPoints,
    stdin,
    outfile,
    external,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    legalComments: 'none',
    // Some dependencies are CommonJS and call require() for Node built-ins.
    banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
    plugins: [{
      name: 'unistay-virtual-modules',
      setup(builder) {
        builder.onResolve({ filter: /^unistay:(assets|migrations)$/ }, (args) => ({ path: args.path.slice(8), namespace: 'unistay' }));
        builder.onLoad({ filter: /.*/, namespace: 'unistay' }, (args) => ({
          loader: 'js',
          // Static files are served by the Vercel CDN, so the Worker's own asset map stays empty.
          contents: args.path === 'assets'
            ? 'export const assets = {};'
            : `export const migrations = ${JSON.stringify(embedded)};`,
        }));
      },
    }],
  });
  return embedded.length;
}
