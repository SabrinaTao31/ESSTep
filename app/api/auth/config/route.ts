import { env } from 'cloudflare:workers';
import { readAuthConfig } from '../../../auth-config';

export function GET() {
  const config = readAuthConfig(env);
  return Response.json(config ?? { error: 'La connexion est temporairement indisponible.' }, {
    status: config ? 200 : 503, headers: { 'Cache-Control': 'no-store' },
  });
}
