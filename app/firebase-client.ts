'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, type Auth, type User } from 'firebase/auth';
import type { AuthConfig } from './auth-config';

let authPromise: Promise<Auth> | undefined;

export function browserAuth(): Promise<Auth> {
  if (!authPromise) authPromise = (async () => {
    const response = await fetch('/api/auth/config', { cache: 'no-store' });
    if (!response.ok) throw new Error('La connexion est temporairement indisponible. Réessaie plus tard.');
    const config: AuthConfig = await response.json();
    const app = getApps().find(app => app.name === 'esstep') ?? initializeApp(config, 'esstep');
    const auth = getAuth(app);
    auth.languageCode = 'fr';
    return auth;
  })().catch(error => { authPromise = undefined; throw error; });
  return authPromise;
}

export async function syncSession(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  const response = await fetch('/api/auth/session', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error : 'Impossible de terminer la connexion. Réessaie.';
    throw new Error(message);
  }
}

export async function clearSession(): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'DELETE', credentials: 'same-origin', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Impossible de terminer la déconnexion. Réessaie.');
}

export function signInError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'La fenêtre de connexion a été fermée. Tu peux réessayer.';
  if (code === 'auth/popup-blocked') return 'Autorise la fenêtre de connexion dans ton navigateur, puis réessaie.';
  if (code === 'auth/unauthorized-domain') return 'La connexion n’est pas encore activée pour cette adresse du site. Contacte son responsable.';
  if (code === 'auth/network-request-failed') return 'Vérifie ta connexion Internet, puis réessaie.';
  if (code) return 'La connexion Google a échoué. Réessaie ou contacte le responsable du site.';
  return error instanceof Error ? error.message : 'Impossible de se connecter pour le moment.';
}
