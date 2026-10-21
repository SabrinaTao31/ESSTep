import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from 'jose';
import { testModules } from './helpers.mjs';

const { compile, cleanup } = testModules();
const now = Math.floor(Date.now() / 1000);
const project = 'esstep-test';
const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(publicKey);
globalThis.__testKeys = createLocalJWKSet({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256' }] });
globalThis.__authEnv = { FIREBASE_PROJECT_ID: project };
globalThis.__authCookie = undefined;

async function token(overrides = {}, key = privateKey, alg = 'RS256') {
  return new SignJWT({
    sub: 'alice', aud: project, iss: `https://securetoken.google.com/${project}`,
    iat: now - 10, exp: now + 3500, auth_time: now - 20,
    email: 'ALICE@example.org', email_verified: true, name: 'Alice',
    firebase: { sign_in_provider: 'google.com' }, ...overrides,
  }).setProtectedHeader({ alg, kid: 'test-key' }).sign(key);
}

try {
  const tokenModule = compile('auth-token.mjs', readFileSync('lib/auth-token.ts', 'utf8'));
  const httpModule = compile('auth-http.mjs', readFileSync('lib/auth-http.ts', 'utf8'));
  const { verifyIdentityToken } = await import(tokenModule);
  const { sameOrigin, sessionCookie, safeReturnPath } = await import(httpModule);
  const good = await token();
  const verified = await verifyIdentityToken(good, project, globalThis.__testKeys);
  assert.equal(verified.user.userId, 'firebase:esstep-test:alice');
  assert.equal(verified.user.email, 'alice@example.org');
  assert.equal(verified.user.displayName, 'Alice');
  for (const claims of [
    { aud: 'another-project' }, { iss: 'https://attacker.invalid' },
    { exp: now - 1 }, { iat: now + 120 }, { auth_time: now + 120 },
    { email_verified: false }, { email: 'invalid' }, { email: undefined },
    { sub: '' }, { sub: 'x'.repeat(129) }, { exp: undefined },
    { firebase: { sign_in_provider: 'anonymous' } },
  ]) {
    await assert.rejects(verifyIdentityToken(await token(claims), project, globalThis.__testKeys));
  }
  const other = await generateKeyPair('RS256');
  await assert.rejects(verifyIdentityToken(await token({}, other.privateKey), project, globalThis.__testKeys));
  await assert.rejects(verifyIdentityToken(await token({}, crypto.getRandomValues(new Uint8Array(32)), 'HS256'), project, globalThis.__testKeys));
  await assert.rejects(verifyIdentityToken('not-a-token', project, globalThis.__testKeys));
  await assert.rejects(verifyIdentityToken(good, '', globalThis.__testKeys));

  const request = (headers = {}) => new Request('https://example.org/api/auth/session', {
    headers: { origin: 'https://example.org', ...headers },
  });
  assert.equal(sameOrigin(request()), true);
  assert.equal(sameOrigin(request({ origin: 'https://evil.org' })), false);
  assert.equal(sameOrigin(request({ 'sec-fetch-site': 'cross-site' })), false);
  assert.equal(sameOrigin(new Request('https://example.org/api/auth/session')), false);
  const cookie = sessionCookie(request(), good, 3400.9);
  assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=3400; Secure$/);
  assert.doesNotMatch(cookie, /Domain=/);
  assert.match(sessionCookie(request(), '', 0), /Max-Age=0/);
  assert.doesNotMatch(sessionCookie(new Request('http://localhost:3000'), good, 10), /; Secure/);
  for (const path of ['//evil.org', '/\\evil.org', 'https://evil.org', '/signin', '/signout', '/%2e%2e/signout']) assert.equal(safeReturnPath(path), '/');
  assert.equal(safeReturnPath('/?project=123#tasks'), '/?project=123#tasks');

  const sessionSource = readFileSync('app/api/auth/session/route.ts', 'utf8')
    .replace("import { env } from 'cloudflare:workers';", 'const env = globalThis.__authEnv;')
    .replace("'../../../../lib/auth-token'", JSON.stringify(tokenModule))
    .replace("'../../../../lib/auth-http'", JSON.stringify(httpModule))
    .replace('verifyIdentityToken(token, env.FIREBASE_PROJECT_ID)', 'verifyIdentityToken(token, env.FIREBASE_PROJECT_ID, globalThis.__testKeys)');
  const { POST, DELETE } = await import(compile('session.mjs', sessionSource));
  const exchange = (idToken, origin = 'https://example.org') => POST(new Request('https://example.org/api/auth/session', {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  }));
  const login = await exchange(good);
  assert.equal(login.status, 200);
  assert.match(login.headers.get('Set-Cookie'), /HttpOnly/);
  assert.equal(login.headers.get('Cache-Control'), 'no-store');
  assert.equal((await exchange(good, 'https://evil.org')).status, 403);
  assert.equal((await exchange(await token({ email_verified: false }))).status, 401);
  assert.equal((await exchange('spoofed')).status, 401);
  assert.equal((await exchange(null)).status, 400);
  assert.equal((await POST(new Request('https://example.org/api/auth/session', {
    method: 'POST', headers: { origin: 'https://example.org', 'Content-Type': 'application/json' }, body: 'x'.repeat(5001),
  }))).status, 413);
  assert.equal((await DELETE(request({ origin: 'https://evil.org' }))).status, 403);
  assert.match((await DELETE(request())).headers.get('Set-Cookie'), /Max-Age=0/);

  // Production identity ignores the old, forgeable Sites headers entirely.
  const authSource = readFileSync('app/auth.ts', 'utf8')
    .replace("import { cookies } from 'next/headers';", 'const cookies = async () => ({ get: () => globalThis.__authCookie });')
    .replace("import { redirect } from 'next/navigation';", 'const redirect = path => { throw new Error(path); };')
    .replace("import { env } from 'cloudflare:workers';", 'const env = globalThis.__authEnv;')
    .replace("'../lib/auth-token'", JSON.stringify(tokenModule))
    .replace("'../lib/auth-http'", JSON.stringify(httpModule))
    .replace('verifyIdentityToken(token, env.FIREBASE_PROJECT_ID)', 'verifyIdentityToken(token, env.FIREBASE_PROJECT_ID, globalThis.__testKeys)');
  const { getAuthUser } = await import(compile('auth.mjs', authSource));
  assert.equal(await getAuthUser(), null);
  globalThis.__authCookie = { value: 'spoofed' };
  assert.equal(await getAuthUser(), null);
  globalThis.__authCookie = { value: good };
  assert.equal((await getAuthUser()).email, 'alice@example.org');
  globalThis.__authCookie = { value: await token({ email_verified: false }) };
  assert.equal(await getAuthUser(), null);
  console.log('Authentification validée : signatures réelles, projet/émetteur, expiration, email vérifié, cookies, origine et redirections.');
} finally {
  cleanup();
  delete globalThis.__testKeys; delete globalThis.__authEnv; delete globalThis.__authCookie;
}
