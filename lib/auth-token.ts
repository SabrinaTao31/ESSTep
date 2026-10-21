import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

const googleKeys = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
));

export class InvalidIdentityError extends Error {}

export type AuthUser = {
  userId: string;
  email: string;
  displayName: string;
};

/** Verify Firebase's signed ID token, never an email supplied by the browser. */
export async function verifyIdentityToken(
  token: string,
  projectId: string,
  keys: JWTVerifyGetKey = googleKeys,
): Promise<{ user: AuthUser; expiresAt: number }> {
  if (!projectId || !token || token.length > 3800) throw new InvalidIdentityError();
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ['RS256'],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    requiredClaims: ['sub', 'iat', 'exp', 'auth_time', 'email', 'email_verified'],
  });
  const now = Math.floor(Date.now() / 1000);
  const firebase = payload.firebase as { sign_in_provider?: string } | undefined;
  if (
    !payload.sub || payload.sub.length > 128 ||
    typeof payload.iat !== 'number' || payload.iat > now ||
    typeof payload.auth_time !== 'number' || payload.auth_time > now ||
    typeof payload.exp !== 'number' || payload.exp <= now ||
    payload.email_verified !== true ||
    typeof payload.email !== 'string' || payload.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) ||
    firebase?.sign_in_provider !== 'google.com'
  ) throw new InvalidIdentityError();
  const email = payload.email.toLowerCase();
  return {
    user: {
      userId: `firebase:${projectId}:${payload.sub}`,
      email,
      displayName: typeof payload.name === 'string' ? payload.name.slice(0, 80) : email,
    },
    expiresAt: payload.exp,
  };
}
