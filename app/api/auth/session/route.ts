import { env } from 'cloudflare:workers';
import { errors } from 'jose';
import { InvalidIdentityError, verifyIdentityToken } from '../../../../lib/auth-token';
import { sameOrigin, sessionCookie } from '../../../../lib/auth-http';

const json = (data: unknown, status: number, cookie?: string) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) },
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Origine refusée.' }, 403);
  if (!env.FIREBASE_PROJECT_ID) return json({ error: 'La connexion est temporairement indisponible.' }, 503);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Requête invalide.' }, 400);
  if (Number(request.headers.get('content-length') ?? 0) > 5000) return json({ error: 'Requête trop volumineuse.' }, 413);
  let token: unknown;
  try {
    const body = await request.text();
    if (body.length > 5000) return json({ error: 'Requête trop volumineuse.' }, 413);
    token = JSON.parse(body).idToken;
  } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (typeof token !== 'string') return json({ error: 'Connexion invalide.' }, 400);
  try {
    const { expiresAt } = await verifyIdentityToken(token, env.FIREBASE_PROJECT_ID);
    return json({ ok: true }, 200, sessionCookie(request, token, expiresAt - Date.now() / 1000));
  } catch (error) {
    if (error instanceof errors.JOSEError || error instanceof InvalidIdentityError) {
      return json({ error: 'Connexion expirée ou invalide. Reconnecte-toi.' }, 401);
    }
    return json({ error: 'Le service de connexion est temporairement indisponible.' }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Origine refusée.' }, 403);
  return json({ ok: true }, 200, sessionCookie(request, '', 0));
}
