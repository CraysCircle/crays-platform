import { Auth0Client } from "@auth0/nextjs-auth0/server";

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getAuth0RuntimeConfigState() {
  return {
    appBaseUrlConfigured: Boolean(envValue("APP_BASE_URL", "AUTH0_BASE_URL")),
    domainConfigured: Boolean(envValue("AUTH0_DOMAIN", "AUTH0_ISSUER_BASE_URL")),
    clientIdConfigured: Boolean(envValue("AUTH0_CLIENT_ID")),
    clientSecretConfigured: Boolean(envValue("AUTH0_CLIENT_SECRET")),
    secretConfigured: Boolean(envValue("AUTH0_SECRET")),
    audienceConfigured: Boolean(envValue("AUTH0_AUDIENCE")),
  };
}

export const auth0 = new Auth0Client({
  domain: envValue("AUTH0_DOMAIN", "AUTH0_ISSUER_BASE_URL"),
  clientId: envValue("AUTH0_CLIENT_ID"),
  clientSecret: envValue("AUTH0_CLIENT_SECRET"),
  appBaseUrl: envValue("APP_BASE_URL", "AUTH0_BASE_URL"),
  secret: envValue("AUTH0_SECRET"),
  signInReturnToPath: "/dashboard",
  enableAccessTokenEndpoint: false,
  routes: { callback: envValue("AUTH0_CALLBACK_PATH") ?? "/auth/callback" },
  authorizationParameters: {
    scope: envValue("AUTH0_SCOPE") ?? "openid profile email",
    audience: envValue("AUTH0_AUDIENCE"),
  },
});
