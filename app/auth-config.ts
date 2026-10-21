export type AuthConfig = { apiKey: string; authDomain: string; projectId: string; appId: string };

export function readAuthConfig(values: {
  FIREBASE_API_KEY?: string;
  FIREBASE_AUTH_DOMAIN?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_APP_ID?: string;
}): AuthConfig | null {
  const { FIREBASE_API_KEY: apiKey, FIREBASE_AUTH_DOMAIN: authDomain,
    FIREBASE_PROJECT_ID: projectId, FIREBASE_APP_ID: appId } = values;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}
