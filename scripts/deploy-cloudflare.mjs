// Deploys Unistay to Cloudflare Workers. Workers Builds runs this as the deploy command
// (`npm run deploy:cloudflare`); it also works locally after `npx wrangler login`.
//   1. Builds the Worker and its static assets (scripts/build-cloudflare.mjs).
//   2. Finds or creates the D1 database named in wrangler.json and fills in its ID.
//   3. Applies drizzle/ migrations, then deploys. The R2 bucket is created on first deploy.
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const CONFIG = 'wrangler.json';
const LOCATION = 'eeur';

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, { stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
  return result.stdout;
}
const wrangler = (args, options) => run(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], options);

run('npm', ['run', 'build:cloudflare']);

const config = JSON.parse(await readFile(CONFIG, 'utf8'));
const database = config.d1_databases[0];
if (!database.database_id) {
  const find = () => JSON.parse(wrangler(['d1', 'list', '--json'], { capture: true })).find((db) => db.name === database.database_name);
  let existing = find();
  if (!existing) {
    wrangler(['d1', 'create', database.database_name, '--location', LOCATION]);
    existing = find();
  }
  if (!existing?.uuid) throw new Error(`D1 database ${database.database_name} was not found after creating it.`);
  database.database_id = existing.uuid;
  await writeFile(CONFIG, JSON.stringify(config, null, 2) + '\n');
  console.log(`Using D1 database ${database.database_name} (${existing.uuid}).`);
}

wrangler(['d1', 'migrations', 'apply', database.database_name, '--remote']);
wrangler(['deploy']);
