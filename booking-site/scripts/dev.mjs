import { spawn, spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'string', default: '4173' },
    strictPort: { type: 'boolean' },
  },
});

process.env.WRANGLER_LOG_PATH ??= '.wrangler/dev.log';
process.env.WRANGLER_SEND_METRICS ??= 'false';
for (const script of ['build', 'db:local']) {
  const result = spawnSync('npm', ['run', script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const server = spawn(process.execPath, ['./node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json',
  '--local', '--persist-to', '.wrangler/state', '--inspector-port', '0',
  '--ip', values.host, '--port', values.port], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (status) => { process.exitCode = status ?? 0; });
