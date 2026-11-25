// Runs the ChatGPT Sites Worker (worker/index.js) as a Vercel Node.js function.
// Bindings: DB (D1) and BUCKET (R2) are backed by Turso/libSQL; admin access uses Google sign-in.
import { Readable } from 'node:stream';
import worker from '../worker/index.js';
import { infoPage } from '../worker/views.js';
import {
  LOGIN_COOKIE, SESSION_COOKIE, SESSION_SECONDS, configProblem, cookie, createSession, finishGoogleLogin,
  googleEndpoints, loginPage, readConfig, readCookie, safeReturnPath, sessionEmail, startGoogleLogin,
} from './admin-auth.js';
import { LibsqlBucket, LibsqlD1 } from './libsql-d1.js';
import { migrate } from './migrations.js';

// worker/index.js lets a request into /admin only when these headers name the admin.
const ADMIN_ID = 'vercel-google-admin';
const ADMIN_IDENTITY = 'admin@unistay.vercel';
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection']);

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

function page(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      ...securityHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'",
      ...headers,
    },
  });
}

function redirect(location, cookies = []) {
  const headers = new Headers({ ...securityHeaders, Location: location });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 303, headers });
}

function databaseSettings(environment) {
  const url = environment.TURSO_DATABASE_URL || environment.LIBSQL_URL || environment.DATABASE_URL;
  const authToken = environment.TURSO_AUTH_TOKEN || environment.LIBSQL_AUTH_TOKEN || environment.DATABASE_AUTH_TOKEN;
  return url ? { url, authToken: authToken || undefined } : null;
}

function toRequest(req) {
  const protocol = String(req.headers['x-forwarded-proto'] ?? (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim();
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    // Never trust identity headers from the outside: only this adapter may set them.
    if (value === undefined || HOP_BY_HOP.has(name) || name.startsWith('oai-')) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  return new Request(`${protocol}://${req.headers.host ?? 'localhost'}${req.url}`, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? 'half' : undefined,
  });
}

async function send(res, response, method) {
  res.statusCode = response.status;
  for (const [name, value] of response.headers) {
    if (name !== 'set-cookie') res.setHeader(name, value);
  }
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  if (method === 'HEAD' || !response.body) {
    res.end();
    return;
  }
  res.end(Buffer.from(await response.arrayBuffer()));
}

function isSameOriginPost(request, url) {
  const origin = request.headers.get('Origin');
  return origin === url.origin || (origin === 'null' && request.headers.get('Sec-Fetch-Site') === 'same-origin');
}

// The admin pages have no sign-out control of their own; add one to their section menu.
async function withSignOut(response) {
  if (!response.headers.get('Content-Type')?.startsWith('text/html')) return response;
  const text = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  return new Response(
    text.replace(/(<nav class="admin-nav"[^>]*>[\s\S]*?)(<\/nav>)/, '$1<a href="/admin/chiqish">Chiqish</a>$2'),
    { status: response.status, headers },
  );
}

export function createHandler(createClient, { environment = process.env, endpoints = googleEndpoints } = {}) {
  let ready;

  async function connect() {
    const settings = databaseSettings(environment);
    if (!settings) return null;
    const client = createClient(settings);
    await migrate(client);
    return {
      DB: new LibsqlD1(client),
      BUCKET: new LibsqlBucket(client),
      UNISTAY_ADMIN_EMAIL: ADMIN_IDENTITY,
    };
  }

  function bindings() {
    ready ??= connect().catch((error) => {
      ready = undefined;
      throw error;
    });
    return ready;
  }

  async function adminGate(request, url, path) {
    const config = readConfig(environment);
    const secure = url.protocol === 'https:';
    const returnTo = safeReturnPath(url.searchParams.get('return_to'));

    if (path === '/signin-with-chatgpt') return redirect(`/admin/kirish?return_to=${encodeURIComponent(returnTo)}`);
    if (path === '/admin/chiqish') {
      return redirect('/', [cookie(SESSION_COOKIE, '', { secure, maxAge: 0 })]);
    }
    if (path === '/admin/kirish') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return page('Method not allowed', 405, { Allow: 'GET, HEAD' });
      if (await sessionEmail(config, readCookie(request, SESSION_COOKIE))) return redirect(returnTo);
      return page(loginPage({ returnTo, problem: configProblem(config) }), configProblem(config) ? 503 : 200);
    }
    if (path === '/admin/google') {
      const problem = configProblem(config);
      if (problem) return page(loginPage({ problem }), 503);
      const login = await startGoogleLogin(config, { origin: url.origin, returnTo, endpoints });
      return redirect(login.location, [cookie(LOGIN_COOKIE, login.cookieValue, { secure, maxAge: login.maxAge, path: '/admin/google' })]);
    }
    if (path === '/admin/google/callback') {
      const problem = configProblem(config);
      if (problem) return page(loginPage({ problem }), 503);
      const result = await finishGoogleLogin(config, {
        origin: url.origin, params: url.searchParams, loginCookie: readCookie(request, LOGIN_COOKIE), endpoints,
      });
      const clearLogin = cookie(LOGIN_COOKIE, '', { secure, maxAge: 0, path: '/admin/google' });
      if (result.error) {
        return page(loginPage({ error: result.error }), 403, { 'Set-Cookie': clearLogin });
      }
      return redirect(result.returnTo, [
        clearLogin,
        cookie(SESSION_COOKIE, await createSession(config, result.email), { secure, maxAge: SESSION_SECONDS }),
      ]);
    }

    if (await sessionEmail(config, readCookie(request, SESSION_COOKIE))) return 'admin';
    if (path === '/admin/bronlar/bildirishnoma') {
      return new Response('{"error":"unauthorized"}', { status: 401, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
    }
    const target = safeReturnPath(request.method === 'GET' ? path + url.search : '/admin');
    if (request.method === 'GET' || request.method === 'HEAD') {
      return redirect(`/admin/kirish?return_to=${encodeURIComponent(target)}`);
    }
    return page(loginPage({ returnTo: target, error: 'Sessiya muddati tugagan. Qayta kiring.' }), 401);
  }

  async function route(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const adminPath = path === '/admin' || path.startsWith('/admin/') || path === '/signin-with-chatgpt';

    let admin = false;
    if (adminPath) {
      if (request.method === 'POST' && !isSameOriginPost(request, url)) {
        return page(infoPage('So‘rov rad etildi', 'Formani Unistay sahifasidan qayta yuboring.'), 403);
      }
      const gate = await adminGate(request, url, path);
      if (gate !== 'admin') return gate;
      admin = true;
    }

    const env = await bindings();
    if (!env) {
      return page(infoPage('Sayt sozlanmoqda',
        'Ma’lumotlar bazasi hali ulanmagan. Vercel loyihasiga Turso bazasini ulang va saytni qayta deploy qiling.'), 503);
    }

    const headers = new Headers(request.headers);
    if (admin) {
      headers.set('oai-authenticated-user-id', ADMIN_ID);
      headers.set('oai-authenticated-user-email', ADMIN_IDENTITY);
    }
    const response = await worker.fetch(new Request(request, { headers }), env);
    if (admin) return withSignOut(response);
    if (path.startsWith('/media/') && response.status === 200) {
      // Photo keys are random and never reused, so the CDN may keep them for good.
      const cached = new Headers(response.headers);
      cached.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(response.body, { status: response.status, headers: cached });
    }
    return response;
  }

  return async function handler(req, res) {
    try {
      await send(res, await route(toRequest(req)), req.method);
    } catch (error) {
      console.error('Unistay request failed', error instanceof Error ? error.message : error);
      if (res.headersSent) {
        res.end();
        return;
      }
      await send(res, page(infoPage('Vaqtinchalik xatolik', 'Bir ozdan so‘ng qayta urinib ko‘ring.'), 500), req.method);
    }
  };
}
