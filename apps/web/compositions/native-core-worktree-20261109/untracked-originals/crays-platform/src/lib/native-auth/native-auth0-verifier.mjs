/** Server-only integration candidate. Provider authentication is not CRAYS authorization. */
import { createRemoteJWKSet, customFetch, jwtVerify } from 'jose';

const fail = () => new Error('NATIVE_AUTHENTICATION_REQUIRED');

export function createNativeAuth0Verifier(config, { fetch: transport = globalThis.fetch } = {}) {
  // These are deployment inputs, never values selected from JWT claims or request parameters.
  const issuer = new URL(config.issuer);
  if (issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.port ||
      issuer.pathname !== '/' || issuer.search || issuer.hash ||
      !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(issuer.hostname) ||
      !issuer.hostname.includes('.') || /^[\d.]+$/.test(issuer.hostname)) throw new Error('INVALID_NATIVE_AUTH_CONFIGURATION');
  const audience = config.audience;
  const clients = new Set(config.nativeClientIds);
  const maxAge = config.maxTokenAgeSeconds ?? 3600;
  if (typeof audience !== 'string' || !audience.trim() || audience.length > 2048 ||
      audience === issuer.href || !clients.size || [...clients].some(c => typeof c !== 'string' || !/^[\w-]{1,256}$/.test(c)) ||
      !Number.isSafeInteger(maxAge) || maxAge < 60 || maxAge > 86400) throw new Error('INVALID_NATIVE_AUTH_CONFIGURATION');
  const jwksURL = new URL('.well-known/jwks.json', issuer);
  const keySet = createRemoteJWKSet(jwksURL, {
    timeoutDuration: 5000, cooldownDuration: 30000, cacheMaxAge: 600000,
    [customFetch]: async (url, options) => {
      if (String(url) !== jwksURL.href) throw fail();
      const response = await transport(url, { ...options, redirect: 'error', credentials: 'omit' });
      if (response.status !== 200 || response.redirected ||
          (response.url && response.url !== jwksURL.href)) throw fail();
      const reader = response.body?.getReader();
      if (!reader) throw fail();
      const chunks = []; let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 65536) { await reader.cancel(); throw fail(); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      return new Response(Buffer.concat(chunks), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const issued = new WeakMap();
  function checked(request, principal) {
    const value = issued.get(principal);
    if (!value || value.request !== request || value.expiresAt <= Date.now() ||
        request.headers.has('cookie') || request.headers.get('authorization') !== value.authorization) throw fail();
    return value;
  }
  return Object.freeze({
    async authenticate(request) {
      // A native bearer request cannot fall back to a browser cookie or review persona.
      if (!(request instanceof Request) || request.headers.has('cookie')) throw fail();
      const authorization = request.headers.get('authorization');
      if (typeof authorization !== 'string' || authorization.length > 16391 ||
          !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization)) throw fail();
      const token = authorization.slice(7);
      try {
        const { payload, protectedHeader } = await jwtVerify(token, async (header, jws) => {
          if (header.jku || header.jwk || header.x5u || !header.kid || typeof header.kid !== 'string' ||
              header.kid.length > 256 || !['JWT', 'at+jwt'].includes(header.typ)) throw fail();
          return keySet(header, jws);
        }, {
          issuer: issuer.href, audience, algorithms: ['RS256'],
          requiredClaims: ['sub', 'exp', 'iat'], maxTokenAge: maxAge, clockTolerance: 0,
        });
        const client = payload.azp ?? payload.client_id;
        if (!clients.has(client) || (payload.azp && payload.client_id && payload.azp !== payload.client_id) ||
            typeof payload.sub !== 'string' || !payload.sub.trim() || payload.sub.length > 2048 ||
            /\s/.test(payload.sub) || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) ||
            payload.exp <= payload.iat || payload.exp - payload.iat > maxAge || protectedHeader.alg !== 'RS256') throw fail();
        if (payload.scope !== undefined && (typeof payload.scope !== 'string' || payload.scope.length > 8192 ||
            !/^[\x21\x23-\x5b\x5d-\x7e ]*$/.test(payload.scope))) throw fail();
        const grantedScopes = new Set((payload.scope ?? '').split(' ').filter(Boolean));
        // An opaque, request-bound handle; no token, email, role, tenant or Nostr claims escape.
        const principal = Object.freeze({ kind: 'verified-native-provider' });
        issued.set(principal, { request, subject: payload.sub, clientId: client, issuedAt: payload.iat * 1000, expiresAt: payload.exp * 1000, authorization, grantedScopes });
        return principal;
      } catch { throw fail(); }
    },
    resolveVerifiedProviderSubject(request, principal) {
      const value = checked(request, principal);
      return Object.freeze({ providerKey: 'auth0', providerSubject: value.subject });
    },
    // Existing Core V2 identity RPCs select the exact issuer/subject/client
    // binding. Only this verifier's current request-bound handle can supply it;
    // no caller JSON, forwarding header or provider-email lookup is accepted.
    resolveVerifiedProviderBinding(request, principal) {
      const value = checked(request, principal);
      return Object.freeze({ providerKey: 'auth0', providerSubject: value.subject,
        issuer: issuer.href, clientId: value.clientId });
    },
    requireRecentAuthentication(request, principal, maxAgeSeconds) {
      const value = checked(request, principal);
      if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 30 || maxAgeSeconds > 600 ||
          value.issuedAt > Date.now() || value.issuedAt < Date.now() - maxAgeSeconds * 1000) throw fail();
    },
    requireScopes(request, principal, requiredScopes) {
      const value = checked(request, principal);
      if (!Array.isArray(requiredScopes) || !requiredScopes.length ||
          requiredScopes.some(scope => typeof scope !== 'string' || !scope ||
            !/^[\x21\x23-\x5b\x5d-\x7e]+$/.test(scope) || !value.grantedScopes.has(scope))) throw fail();
    },
  });
}
