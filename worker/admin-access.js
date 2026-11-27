import { createRemoteJWKSet, errors, jwtVerify } from 'jose';

const missingSession = 'Cloudflare Access sessiyasi topilmadi yoki muddati tugagan. Admin sahifasini maxfiy oynada qayta oching.';
const wrongApplication = 'Cloudflare Access ilovasi Worker’dagi AUD qiymatiga mos kelmadi.';
const wrongEmail = 'Bu email manziliga Unistay admin paneliga kirish ruxsati berilmagan.';

export async function cloudflareAdminAccessError(request, env, allowedEmail, access) {
  const team = env.UNISTAY_ACCESS_TEAM?.trim() ?? '';
  const audience = env.UNISTAY_ACCESS_AUD?.trim();
  if (!allowedEmail || !audience || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(team)) {
    return 'Worker’dagi Cloudflare Access sozlamalari to‘liq kiritilmagan.';
  }

  if (access) {
    if (access.aud !== audience) return wrongApplication;
    let identity;
    try {
      identity = await access.getIdentity();
    } catch {
      // If Access cannot return the identity, verify the signed assertion below.
    }
    if (typeof identity?.email === 'string') {
      return identity.email.trim().toLowerCase() === allowedEmail ? null : wrongEmail;
    }
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion')
    || request.headers.get('Cookie')?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
  if (!token) return missingSession;

  const issuer = `https://${team}.cloudflareaccess.com`;
  const keys = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer));
  try {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'],
      issuer,
      audience,
      requiredClaims: ['exp', 'iat', 'sub'],
    });
    return typeof payload.email === 'string' && payload.email.trim().toLowerCase() === allowedEmail ? null : wrongEmail;
  } catch (error) {
    if (error instanceof errors.JWTClaimValidationFailed && error.claim === 'aud') return wrongApplication;
    if (error instanceof errors.JWTExpired) return missingSession;
    return 'Cloudflare Access sessiyasini tekshirib bo‘lmadi. Admin sahifasini maxfiy oynada qayta oching.';
  }
}
