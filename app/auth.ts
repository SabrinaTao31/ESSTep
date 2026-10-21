import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { errors } from 'jose';
import { InvalidIdentityError, verifyIdentityToken } from '../lib/auth-token';
import { safeReturnPath, SESSION_COOKIE } from '../lib/auth-http';

export async function getAuthUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !env.FIREBASE_PROJECT_ID) return null;
  try {
    return (await verifyIdentityToken(token, env.FIREBASE_PROJECT_ID)).user;
  } catch (error) {
    if (error instanceof errors.JOSEError || error instanceof InvalidIdentityError) return null;
    throw error;
  }
}

export async function requireAuthUser(returnTo = '/') {
  const user = await getAuthUser();
  if (user) return user;
  redirect('/signin?return_to=' + encodeURIComponent(safeReturnPath(returnTo)));
}
