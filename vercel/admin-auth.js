// Google sign-in for the admin panel on Vercel. ChatGPT Sites verifies the owner itself and
// forwards `oai-authenticated-*` headers; here a Google OpenID Connect login plus a signed
// session cookie plays that role. Only the addresses in UNISTAY_ADMIN_EMAIL may sign in.
import { alert, escapeHtml, icon, layout } from '../worker/views.js';

export const SESSION_COOKIE = 'unistay_admin';
export const LOGIN_COOKIE = 'unistay_google';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_SECONDS = 10 * 60;
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
export const googleEndpoints = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
};
const encoder = new TextEncoder();
const base64url = (bytes) => Buffer.from(bytes).toString('base64url');
const randomToken = () => base64url(crypto.getRandomValues(new Uint8Array(32)));

export function readConfig(environment) {
  const admins = String(environment.UNISTAY_ADMIN_EMAIL ?? '')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  return {
    clientId: String(environment.GOOGLE_CLIENT_ID ?? '').trim(),
    clientSecret: String(environment.GOOGLE_CLIENT_SECRET ?? '').trim(),
    sessionSecret: String(environment.SESSION_SECRET ?? ''),
    admins,
  };
}

export function configProblem(config) {
  const missing = [
    !config.clientId && 'GOOGLE_CLIENT_ID',
    !config.clientSecret && 'GOOGLE_CLIENT_SECRET',
    !config.admins.length && 'UNISTAY_ADMIN_EMAIL',
  ].filter(Boolean);
  return missing.length
    ? `Google orqali kirish hali sozlanmagan. Vercel loyihasining Settings → Environment Variables bo‘limiga ${missing.join(', ')} qiymatlarini qo‘shing va saytni qayta deploy qiling.`
    : null;
}

async function hmacKey(config, purpose) {
  const material = await crypto.subtle.digest('SHA-256', encoder.encode(
    [`unistay-${purpose}-v1`, config.clientSecret, config.sessionSecret, config.admins.join(',')].join('\u0000'),
  ));
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function seal(config, purpose, payload) {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(config, purpose), encoder.encode(body));
  return `${body}.${base64url(signature)}`;
}

async function unseal(config, purpose, token) {
  const match = /^([A-Za-z0-9_-]{1,2048})\.([A-Za-z0-9_-]{43})$/.exec(token ?? '');
  if (!match || configProblem(config)) return null;
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(config, purpose),
    Buffer.from(match[2], 'base64url'), encoder.encode(match[1]));
  if (!valid) return null;
  const payload = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
  return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() ? payload : null;
}

const expiresIn = (seconds) => Math.floor(Date.now() / 1000) + seconds;

export const createSession = (config, email) => seal(config, 'session', { email, exp: expiresIn(SESSION_SECONDS) });

export async function sessionEmail(config, token) {
  const session = await unseal(config, 'session', token);
  return session && config.admins.includes(session.email) ? session.email : null;
}

export function readCookie(request, name) {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function cookie(name, value, { secure, maxAge, path = '/admin' }) {
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function safeReturnPath(value) {
  const path = String(value ?? '');
  return /^\/admin(?:[/?][^\\]*)?$/.test(path) && !path.startsWith('//') ? path : '/admin';
}

const callbackUrl = (origin) => `${origin}/admin/google/callback`;

// Step 1: send the browser to Google with state, nonce and PKCE bound to a short-lived cookie.
export async function startGoogleLogin(config, { origin, returnTo, endpoints = googleEndpoints }) {
  const login = { state: randomToken(), nonce: randomToken(), verifier: randomToken(), returnTo, exp: expiresIn(LOGIN_SECONDS) };
  const challenge = base64url(await crypto.subtle.digest('SHA-256', encoder.encode(login.verifier)));
  const url = new URL(endpoints.auth);
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
  return { location: url.href, cookieValue: await seal(config, 'login', login), maxAge: LOGIN_SECONDS };
}

function idTokenClaims(idToken) {
  const [, payload] = String(idToken ?? '').split('.');
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Step 2: Google redirects back with a code; exchange it and check who signed in.
export async function finishGoogleLogin(config, { origin, params, loginCookie, endpoints = googleEndpoints }) {
  const login = await unseal(config, 'login', loginCookie);
  if (params.get('error')) return { error: 'Google orqali kirish bekor qilindi.' };
  if (!login || !params.get('state') || params.get('state') !== login.state || !params.get('code')) {
    return { error: 'Kirish muddati tugagan yoki so‘rov buzilgan. Qayta urinib ko‘ring.' };
  }

  const response = await fetch(endpoints.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code: params.get('code'),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: callbackUrl(origin),
      grant_type: 'authorization_code',
      code_verifier: login.verifier,
    }),
  });
  if (!response.ok) {
    console.error('Google token exchange failed', response.status);
    return { error: 'Google javobini tekshirib bo‘lmadi. Qayta urinib ko‘ring.' };
  }

  // The ID token comes straight from Google's token endpoint over TLS, so its claims are
  // trusted without a signature check (OpenID Connect Core §3.1.3.7); the claims still are.
  const claims = idTokenClaims((await response.json()).id_token);
  const now = Date.now() / 1000;
  if (!claims || !GOOGLE_ISSUERS.includes(claims.iss) || claims.aud !== config.clientId
    || !(claims.exp > now) || claims.nonce !== login.nonce) {
    return { error: 'Google javobini tekshirib bo‘lmadi. Qayta urinib ko‘ring.' };
  }
  const email = String(claims.email ?? '').toLowerCase();
  if (claims.email_verified !== true || !config.admins.includes(email)) {
    return { error: `${email || 'Bu'} Google hisobiga admin panelga kirish ruxsat etilmagan.` };
  }
  return { email, returnTo: safeReturnPath(login.returnTo) };
}

const googleLogo = `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.3-4.8 3.3-8.1Z"/>
  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.6l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z"/>
  <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z"/>
  <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z"/>
</svg>`;

export function loginPage({ returnTo = '/admin', error, problem } = {}) {
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
