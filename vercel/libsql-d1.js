// Cloudflare D1 and R2 facades over a libSQL (Turso) client.
// They cover exactly what worker/ uses, so the Worker code runs unchanged on Vercel.

const value = (cell) => (cell instanceof ArrayBuffer ? new Uint8Array(cell) : cell);

function rows(result) {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((column, i) => [column, value(row[i])])));
}

function outcome(result) {
  return {
    success: true,
    results: rows(result),
    meta: {
      changes: result.rowsAffected,
      last_row_id: result.lastInsertRowid === undefined ? null : Number(result.lastInsertRowid),
    },
  };
}

function argument(arg) {
  if (arg === undefined) throw new TypeError('D1_TYPE_ERROR: undefined cannot be bound');
  if (typeof arg === 'boolean') return arg ? 1 : 0;
  if (arg instanceof ArrayBuffer) return new Uint8Array(arg);
  return arg;
}

class Statement {
  constructor(client, sql, args = []) {
    this.client = client;
    this.sql = sql;
    this.args = args;
  }

  bind(...args) {
    return new Statement(this.client, this.sql, args.map(argument));
  }

  get query() {
    return { sql: this.sql, args: this.args };
  }

  async first(column) {
    const [row] = rows(await this.client.execute(this.query));
    if (!row) return null;
    return column === undefined ? row : row[column];
  }

  async all() {
    return outcome(await this.client.execute(this.query));
  }

  async run() {
    return outcome(await this.client.execute(this.query));
  }
}

export class LibsqlD1 {
  constructor(client) {
    this.client = client;
  }

  prepare(sql) {
    return new Statement(this.client, sql);
  }

  async batch(statements) {
    const results = await this.client.batch(statements.map((statement) => statement.query), 'write');
    return results.map(outcome);
  }
}

// Uploaded tour photos live in the same database, so Vercel needs one storage integration.
export class LibsqlBucket {
  constructor(client) {
    this.client = client;
  }

  async put(key, data, options = {}) {
    const bytes = new Uint8Array(data instanceof ArrayBuffer ? data : await new Response(data).arrayBuffer());
    const type = options.httpMetadata?.contentType ?? 'application/octet-stream';
    await this.client.execute({
      sql: `INSERT INTO vercel_media (key, content_type, size, data, created_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET content_type = excluded.content_type, size = excluded.size, data = excluded.data`,
      args: [key, type, bytes.byteLength, bytes, new Date().toISOString()],
    });
    return { key, size: bytes.byteLength, httpMetadata: { contentType: type } };
  }

  async head(key) {
    const result = await this.client.execute({ sql: 'SELECT size, content_type FROM vercel_media WHERE key = ?', args: [key] });
    const [row] = rows(result);
    return row ? { key, size: row.size, httpMetadata: { contentType: row.content_type } } : null;
  }

  async get(key) {
    const result = await this.client.execute({ sql: 'SELECT size, content_type, data FROM vercel_media WHERE key = ?', args: [key] });
    const [row] = rows(result);
    return row ? { key, size: row.size, body: row.data, httpMetadata: { contentType: row.content_type } } : null;
  }
}
