/** Read-only projections of original server endpoints; no new auth mechanism. */
export type OriginalPlatformIdentity =
  | { kind: 'signed_out' }
  | { kind: 'binding_required' }
  | { kind: 'blocked' }
  | { kind: 'unavailable'; reason: 'transport_unqualified' | 'network' | 'provenance' | 'core' | 'schema' }
  | { kind: 'ready'; accountId: string; displayName: string; contact: string | null };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

/** No local-storage identity, development mode, e-mail lookup or role fallback. */
export function projectOriginalPlatformIdentity(status: number, payload: unknown): OriginalPlatformIdentity {
  const data = record(payload);
  if (!data) return { kind: 'unavailable', reason: 'schema' };
  if (data.status === 'invalid_session_provenance') return { kind: 'unavailable', reason: 'provenance' };
  if (data.status === 'core_unavailable') return { kind: 'unavailable', reason: 'core' };
  const session = record(data.session);
  if (status === 409 && data.status === 'existing_original_identity_binding_required'
      && data.providerAuthenticated === true && data.accountMapped === false
      && data.provisioningAvailable === false && !session?.account) return { kind: 'binding_required' };
  if (status === 200 && data.status === 'no_provider_session' && data.providerAuthenticated === false
      && data.accountMapped === false && session?.status === 'anonymous' && !session.account) {
    return { kind: 'signed_out' };
  }
  if ((status === 200 || status === 409) && data.status === 'provider_authenticated_unmapped'
      && data.providerAuthenticated === true && data.accountMapped === false
      && session?.status === 'provider_authenticated' && !session.account) {
    return { kind: 'binding_required' };
  }
  const provider = record(data.provider);
  const runtime = record(data.auth0Runtime);
  if (status !== 200 || data.status !== 'mapped' || data.providerAuthenticated !== true
      || data.accountMapped !== true || provider?.type !== 'auth0'
      || provider.subjectPresent !== true
      || provider.identityBinding !== 'issuer+subject+server-selected-client'
      || runtime?.application !== 'clubs' || runtime.baseUrlMatchesRequestOrigin !== true) {
    return { kind: 'unavailable', reason: 'provenance' };
  }
  const account = record(session?.account);
  if (session?.status === 'blocked' || account?.status === 'blocked') return { kind: 'blocked' };
  if (session?.status !== 'crays_mapped' || typeof account?.id !== 'string'
      || !account.id.trim() || account.id.length > 200
      || typeof account.displayName !== 'string' || !account.displayName.trim()
      || account.displayName.length > 300 || !['active', 'review'].includes(String(account.status))) {
    return { kind: 'unavailable', reason: 'schema' };
  }
  return {
    kind: 'ready', accountId: account.id, displayName: account.displayName,
    contact: typeof account.primaryContact === 'string' && account.primaryContact.length <= 500
      ? account.primaryContact : null,
  };
}

/**
 * The original Member session resolves the global Core customer account before
 * any Club membership. Its server uses the original exact issuer/subject/client
 * RPC and parseAuth0IdentityBundleRpcV2, which requires an active Core account
 * and current original identity binding. Never infer authority from an email.
 * No fallback from a failed Core/session resolution is permitted here.
 */
export function projectOriginalMemberSessionIdentity(status: number, payload: unknown): OriginalPlatformIdentity {
  const data = record(payload);
  if (!data) return {kind:'unavailable',reason:'schema'};
  if (status === 401 && data.status === 'signed_out' && data.authenticated === false
      && data.accountMapped === false && !data.account) return {kind:'signed_out'};
  if (status === 409 && data.status === 'identity_binding_required'
      && data.authenticated === true && data.accountMapped === false && !data.account) {
    return {kind:'binding_required'};
  }
  if (status === 503 && data.status === 'core_unavailable') return {kind:'unavailable',reason:'core'};
  if (status !== 200 || data.status !== 'ready' || data.authenticated !== true
      || data.accountMapped !== true || data.sessionMode !== 'auth0'
      || data.bookingAuthority !== false) return {kind:'unavailable',reason:'provenance'};
  const account = record(data.account);
  if (account?.provider !== 'auth0' || account.backendSynced !== true
      || typeof account.id !== 'string' || !account.id.trim() || account.id.length > 200
      || typeof account.displayName !== 'string' || !account.displayName.trim()
      || account.displayName.length > 300) return {kind:'unavailable',reason:'schema'};
  // Contradictory injected optional fields must never weaken the upstream gate.
  if (account.status !== undefined && account.status !== 'active') return {kind:'blocked'};
  if (data.ownState !== undefined) {
    const ownState = record(data.ownState);
    if (ownState?.schema !== 'crays.clubs.member-own-state-rpc.v1'
        || ownState.accountId !== account.id
        || record(ownState.authorities)?.authenticationReady !== true) return {kind:'unavailable',reason:'schema'};
  }
  return {kind:'ready',accountId:account.id,displayName:account.displayName,
    contact:typeof account.email === 'string' && account.email.length <= 500 ? account.email : null};
}

/** Exact original production origins and the already registered loopback test origin only.
 * This only permits a request; original server session and Core mapping still govern admission.
 */
export function isOriginalPlatformOrigin(origin: string): boolean {
  return ['https://www.craysclub.com', 'https://craysclub.com', 'http://127.0.0.1:43172', 'http://localhost:8990'].includes(origin);
}
export function originalSdkStartOrigin(origin?: string): string {
  return origin && ['http://127.0.0.1:43172', 'http://localhost:8990'].includes(origin) ? origin : 'https://www.craysclub.com';
}
/** Local test transport remains unavailable until the reviewed original BFF is actually served. */
export async function readOriginalPlatformIdentity(signal?: AbortSignal): Promise<OriginalPlatformIdentity> {
  if (typeof window === 'undefined' || !isOriginalPlatformOrigin(window.location.origin)) {
    return { kind: 'unavailable', reason: 'transport_unqualified' };
  }
  try {
    const response = await fetch('/api/crays/auth/provider/account', {
      method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json' }, signal,
    });
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return { kind: 'unavailable', reason: 'schema' };
    }
    return projectOriginalPlatformIdentity(response.status, await response.json());
  } catch (error) {
    if (signal?.aborted) throw error;
    return { kind: 'unavailable', reason: 'network' };
  }
}
