export const SESSION_COOKIE = 'esstep_session';

export function sameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site';
}

export function sessionCookie(request: Request, token: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAge))}` +
    (new URL(request.url).protocol === 'https:' ? '; Secure' : '');
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const url = new URL(value, 'https://app.local');
    if (url.origin !== 'https://app.local' || /[\r\n\\]/.test(value) ||
      /^\/(?:signin|signout)(?:\/|$)/.test(url.pathname)) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}
