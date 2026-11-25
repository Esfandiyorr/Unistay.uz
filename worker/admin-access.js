import { createRemoteJWKSet, jwtVerify } from 'jose';

export async function cloudflareAdminAllowed(request, env, allowedEmail) {
  const team = env.UNISTAY_ACCESS_TEAM;
  const audience = env.UNISTAY_ACCESS_AUD;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || !audience || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(team ?? '')) return false;

  const issuer = `https://${team}.cloudflareaccess.com`;
  const keys = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer));
  try {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'],
      issuer,
      audience,
      requiredClaims: ['exp', 'iat', 'sub'],
    });
    return typeof payload.email === 'string' && payload.email.trim().toLowerCase() === allowedEmail;
  } catch {
    return false;
  }
}
