// Applies the Drizzle migrations from drizzle/ (embedded at build time) to the libSQL database.
import { migrations } from 'unistay:migrations';

const adapterSchema = [
  'CREATE TABLE IF NOT EXISTS vercel_migrations (name TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL)',
  `CREATE TABLE IF NOT EXISTS vercel_media (
    key TEXT PRIMARY KEY NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL
  )`,
];

const statementsOf = (sql) => sql.split('--> statement-breakpoint').map((part) => part.trim()).filter(Boolean);

export async function migrate(client) {
  await client.batch(adapterSchema, 'write');
  const applied = new Set((await client.execute('SELECT name FROM vercel_migrations')).rows.map((row) => row[0]));
  for (const { name, sql } of migrations) {
    if (applied.has(name)) continue;
    try {
      await client.batch([
        ...statementsOf(sql),
        { sql: 'INSERT INTO vercel_migrations (name, applied_at) VALUES (?, ?)', args: [name, new Date().toISOString()] },
      ], 'write');
    } catch (error) {
      // Another cold start may have applied the same migration a moment earlier.
      const done = await client.execute({ sql: 'SELECT 1 FROM vercel_migrations WHERE name = ?', args: [name] });
      if (!done.rows.length) throw error;
    }
  }
}
