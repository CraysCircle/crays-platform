import { createHash } from 'node:crypto';
import { createNativeAuth0Verifier } from './native-auth0-verifier.mjs';

const fail = () => new Error('NATIVE_EMAIL_PROOF_REQUIRED');
const validScope = value => typeof value === 'string' && /^[\x21\x23-\x5b\x5d-\x7e]+$/.test(value);

/** Server-owned reader for the actual provider-confirmed email. It grants no
 * CRAYS account, association, role, Nostr key or write authority. An additional
 * email for an existing account still needs its primary-account authorization
 * and atomic Core contact/link command; this handle cannot stand in for either.
 */
export function createNativeEmailProofReader(config, { fetch: transport = globalThis.fetch } = {}) {
  const verifier = createNativeAuth0Verifier(config, { fetch: transport });
  const issuer = new URL(config.issuer);
  const endpoint = new URL('userinfo', issuer);
  const scope = config.requiredIdentityScope;
  const maxAge = config.maximumProofAgeSeconds ?? 300;
  if (!validScope(scope) || !Number.isSafeInteger(maxAge) || maxAge < 30 || maxAge > 600) {
    throw new Error('INVALID_NATIVE_EMAIL_PROOF_CONFIGURATION');
  }
  const issued = new WeakMap();
  function current(request, proof) {
    const value = issued.get(proof);
    if (!value || value.request !== request || request.signal.aborted) throw fail();
    verifier.requireScopes(request, value.principal, [scope]);
    verifier.requireRecentAuthentication(request, value.principal, maxAge);
    const provider = verifier.resolveVerifiedProviderSubject(request, value.principal);
    if (provider.providerSubject !== value.subject) throw fail();
    return value;
  }
  return Object.freeze({
    async read(request) {
      try {
        if (request.signal.aborted) throw fail();
        const principal = await verifier.authenticate(request);
        verifier.requireScopes(request, principal, [scope]);
        verifier.requireRecentAuthentication(request, principal, maxAge);
        const subject = verifier.resolveVerifiedProviderSubject(request, principal).providerSubject;
        const response = await transport(endpoint.href, {
          method: 'GET', headers: { authorization: request.headers.get('authorization'), accept: 'application/json' },
          redirect: 'error', credentials: 'omit', cache: 'no-store',
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
        });
        if (response.status !== 200 || response.redirected ||
            (response.url && response.url !== endpoint.href) ||
            response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' ||
            Number(response.headers.get('content-length')) > 16384) throw fail();
        const stream = response.body?.getReader();
        if (!stream) throw fail();
        const chunks = []; let bytes = 0;
        try {
          while (true) {
            const { done, value } = await stream.read(); if (done) break;
            bytes += value.byteLength;
            if (bytes > 16384) { await stream.cancel(); throw fail(); }
            chunks.push(value);
          }
        } finally { stream.releaseLock(); }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (body?.sub !== subject || body.email_verified !== true ||
            typeof body.email !== 'string' || body.email.length > 320 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(body.email) || /[\u0000-\u001f\u007f]/u.test(body.email)) throw fail();
        // Never expose the bearer/claims/userinfo response as a proof DTO. The
        // server handle is tied to this exact Request and rechecked after awaits.
        const proof = Object.freeze({ kind: 'verified-native-provider-email' });
        issued.set(proof, { request, principal, subject, email: body.email,
          tokenDigest: createHash('sha256').update(request.headers.get('authorization').slice(7)).digest('hex'),
          verifiedAt: new Date().toISOString() });
        current(request, proof);
        return proof;
      } catch { throw fail(); }
    },
    resolve(request, proof) {
      try {
        const value = current(request, proof);
        return Object.freeze({ providerKey: 'auth0', providerSubject: value.subject, issuer: issuer.href,
          email: value.email, verifiedAt: value.verifiedAt, tokenDigest: value.tokenDigest });
      } catch { throw fail(); }
    },
  });
}
