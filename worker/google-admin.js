// Google sign-in for the admin panel outside ChatGPT Sites (enabled by ADMIN_AUTH = "google").
// On Sites the dispatch layer verifies the owner and adds `oai-authenticated-*` headers. Elsewhere
// those headers could come from anyone, so this gate strips them and adds them back only for a
// valid session created by a Google OpenID Connect login of an address in UNISTAY_ADMIN_EMAIL.
import { alert, escapeHtml, icon, infoPage, layout } from './views.js';

const SESSION_COOKIE = 'unistay_admin';
const LOGIN_COOKIE = 'unistay_google';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_SECONDS = 10 * 60;
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const ADMIN_ID = 'google-admin';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const security = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };

function toBase64url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64 + '==='.slice((base64.length + 3) % 4)), (c) => c.charCodeAt(0));
}

const randomToken = () => toBase64url(crypto.getRandomValues(new Uint8Array(32)));
const expiresIn = (seconds) => Math.floor(Date.now() / 1000) + seconds;

function readConfig(env) {
  return {
    clientId: String(env.GOOGLE_CLIENT_ID ?? '').trim(),
    clientSecret: String(env.GOOGLE_CLIENT_SECRET ?? '').trim(),
    sessionSecret: String(env.SESSION_SECRET ?? ''),
    admins: String(env.UNISTAY_ADMIN_EMAIL ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
  };
}

function configProblem(config) {
  const missing = [
    !config.clientId && 'GOOGLE_CLIENT_ID',
    !config.clientSecret && 'GOOGLE_CLIENT_SECRET',
    !config.admins.length && 'UNISTAY_ADMIN_EMAIL',
  ].filter(Boolean);
  return missing.length
    ? `Google orqali kirish hali sozlanmagan. Hosting sozlamalariga ${missing.join(', ')} qiymatlarini qo‘shing.`
    : null;
}

async function hmacKey(config, purpose) {
  const material = await crypto.subtle.digest('SHA-256', encoder.encode(
    [`unistay-${purpose}-v1`, config.clientSecret, config.sessionSecret, config.admins.join(',')].join('\u0000'),
  ));
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function seal(config, purpose, payload) {
  const body = toBase64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(config, purpose), encoder.encode(body));
  return `${body}.${toBase64url(signature)}`;
}

async function unseal(config, purpose, token) {
  const match = /^([A-Za-z0-9_-]{1,2048})\.([A-Za-z0-9_-]{43})$/.exec(token ?? '');
  if (!match || configProblem(config)) return null;
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(config, purpose), fromBase64url(match[2]), encoder.encode(match[1]));
  if (!valid) return null;
  const payload = JSON.parse(decoder.decode(fromBase64url(match[1])));
  return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() ? payload : null;
}

function readCookie(request, name) {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

const cookie = (name, value, { secure, maxAge, path = '/admin' }) =>
  `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;

function safeReturnPath(value) {
  const path = String(value ?? '');
  return /^\/admin(?:[/?][^\\]*)?$/.test(path) && !path.startsWith('//') ? path : '/admin';
}

async function sessionEmail(config, request) {
  const session = await unseal(config, 'session', readCookie(request, SESSION_COOKIE));
  return session && config.admins.includes(session.email) ? session.email : null;
}

function page(body, status = 200, cookies = []) {
  const headers = new Headers({
    ...security,
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'",
  });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(body, { status, headers });
}

function redirect(location, cookies = []) {
  const headers = new Headers({ ...security, Location: location });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 303, headers });
}

const googleLogo = `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.3-4.8 3.3-8.1Z"/>
  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.6l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z"/>
  <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z"/>
  <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z"/>
</svg>`;

function loginPage({ returnTo = '/admin', error, problem } = {}) {
  const start = `/admin/google?return_to=${encodeURIComponent(returnTo)}`;
  return layout('Admin panelga kirish — Unistay', `
    <section class="wrap narrow inside">
      <article class="result-card">
        <span class="result-icon">${icon('lock')}</span>
        <h1>Admin panel</h1>
        ${problem
          ? `<p>${escapeHtml(problem)}</p>`
          : `<p>Turpaketlar, to‘lov sozlamalari va bronlarni boshqarish uchun Google hisobingiz bilan kiring.</p>
        ${alert(error)}
        <a class="button button--outline" href="${escapeHtml(start)}">${googleLogo} Google orqali kirish</a>`}
      </article>
    </section>`, { admin: true });
}

const callbackUrl = (origin) => `${origin}/admin/google/callback`;

async function startLogin(config, origin, returnTo, secure) {
  const login = { state: randomToken(), nonce: randomToken(), verifier: randomToken(), returnTo, exp: expiresIn(LOGIN_SECONDS) };
  const challenge = toBase64url(await crypto.subtle.digest('SHA-256', encoder.encode(login.verifier)));
  const url = new URL(GOOGLE_AUTH);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callbackUrl(origin),
    response_type: 'code',
    scope: 'openid email',
    state: login.state,
    nonce: login.nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
    ...(config.admins.length === 1 ? { login_hint: config.admins[0] } : {}),
  }).toString();
  return redirect(url.href, [cookie(LOGIN_COOKIE, await seal(config, 'login', login), { secure, maxAge: LOGIN_SECONDS, path: '/admin/google' })]);
}

function idTokenClaims(idToken) {
  try {
    return JSON.parse(decoder.decode(fromBase64url(String(idToken).split('.')[1])));
  } catch {
    return null;
  }
}

async function finishLogin(config, request, url, secure) {
  const clearLogin = cookie(LOGIN_COOKIE, '', { secure, maxAge: 0, path: '/admin/google' });
  const fail = (error) => page(loginPage({ error }), 403, [clearLogin]);
  const params = url.searchParams;
  const login = await unseal(config, 'login', readCookie(request, LOGIN_COOKIE));
  if (params.get('error')) return fail('Google orqali kirish bekor qilindi.');
  if (!login || !params.get('state') || params.get('state') !== login.state || !params.get('code')) {
    return fail('Kirish muddati tugagan yoki so‘rov buzilgan. Qayta urinib ko‘ring.');
  }

  const response = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code: params.get('code'),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: callbackUrl(url.origin),
      grant_type: 'authorization_code',
      code_verifier: login.verifier,
    }),
  });
  if (!response.ok) {
    console.error('Google token exchange failed', response.status);
    return fail('Google javobini tekshirib bo‘lmadi. Qayta urinib ko‘ring.');
  }

  // The ID token comes straight from Google's token endpoint over TLS, so it is trusted without a
  // signature check (OpenID Connect Core 3.1.3.7); its claims are still checked.
  const claims = idTokenClaims((await response.json()).id_token);
  if (!claims || !GOOGLE_ISSUERS.includes(claims.iss) || claims.aud !== config.clientId
    || !(claims.exp > Date.now() / 1000) || claims.nonce !== login.nonce) {
    return fail('Google javobini tekshirib bo‘lmadi. Qayta urinib ko‘ring.');
  }
  const email = String(claims.email ?? '').toLowerCase();
  if (claims.email_verified !== true || !config.admins.includes(email)) {
    return fail(`${email || 'Bu'} Google hisobiga admin panelga kirish ruxsat etilmagan.`);
  }
  return redirect(safeReturnPath(login.returnTo), [
    clearLogin,
    cookie(SESSION_COOKIE, await seal(config, 'session', { email, exp: expiresIn(SESSION_SECONDS) }), { secure, maxAge: SESSION_SECONDS }),
  ]);
}

// Returns either { response } to send as is, or { request, env, admin } to pass to the Worker.
export async function googleAdminGate(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) if (name.startsWith('oai-')) headers.delete(name);
  const cleaned = new Request(request, { headers });
  if (path !== '/admin' && !path.startsWith('/admin/') && path !== '/signin-with-chatgpt') return { request: cleaned, env, admin: false };

  const config = readConfig(env);
  const problem = configProblem(config);
  const secure = url.protocol === 'https:';
  const returnTo = safeReturnPath(url.searchParams.get('return_to'));
  const isRead = request.method === 'GET' || request.method === 'HEAD';

  if (path === '/signin-with-chatgpt') return { response: redirect(`/admin/kirish?return_to=${encodeURIComponent(returnTo)}`) };
  if (path === '/admin/chiqish') return { response: redirect('/', [cookie(SESSION_COOKIE, '', { secure, maxAge: 0 })]) };
  if (['/admin/kirish', '/admin/google', '/admin/google/callback'].includes(path)) {
    if (!isRead) return { response: new Response('Method not allowed', { status: 405, headers: { ...security, Allow: 'GET, HEAD' } }) };
    if (problem) return { response: page(loginPage({ problem }), 503) };
    if (path === '/admin/google') return { response: await startLogin(config, url.origin, returnTo, secure) };
    if (path === '/admin/google/callback') return { response: await finishLogin(config, request, url, secure) };
    if (await sessionEmail(config, request)) return { response: redirect(returnTo) };
    return { response: page(loginPage({ returnTo })) };
  }

  const email = await sessionEmail(config, request);
  if (email) {
    headers.set('oai-authenticated-user-id', ADMIN_ID);
    headers.set('oai-authenticated-user-email', email);
    return { request: new Request(cleaned, { headers }), env: { ...env, UNISTAY_ADMIN_EMAIL: email }, admin: true };
  }
  if (path === '/admin/bronlar/bildirishnoma') {
    return { response: new Response('{"error":"unauthorized"}', { status: 401, headers: { ...security, 'Content-Type': 'application/json' } }) };
  }
  if (!isRead) {
    const sameOrigin = request.headers.get('Origin') === url.origin;
    return { response: sameOrigin
      ? page(loginPage({ error: 'Sessiya muddati tugagan. Qayta kiring.' }), 401)
      : page(infoPage('So‘rov rad etildi', 'Formani Unistay sahifasidan qayta yuboring.'), 403) };
  }
  return { response: redirect(`/admin/kirish?return_to=${encodeURIComponent(safeReturnPath(path + url.search))}`) };
}

// The Worker's admin pages have no sign-out control; add one to their section menu.
export async function withSignOut(response) {
  if (!response.headers.get('Content-Type')?.startsWith('text/html')) return response;
  const text = await response.text();
  return new Response(
    text.replace(/(<nav class="admin-nav"[^>]*>[\s\S]*?)(<\/nav>)/, '$1<a href="/admin/chiqish">Chiqish</a>$2'),
    { status: response.status, headers: response.headers },
  );
}
