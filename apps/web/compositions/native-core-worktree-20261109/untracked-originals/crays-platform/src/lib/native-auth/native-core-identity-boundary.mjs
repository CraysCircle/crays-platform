/** Server-owned Core ports and admitted operation scopes only, never client/model callbacks. */
export function createNativeCoreIdentityBoundary({
  verifier, getIdentityBundleByProviderSubject, createCraysSessionFromIdentityBundle, evaluateSessionPermission,
  requiredIdentityScope,
}) {
  // No scope is guessed: the actual Core API/operation must admit it before this boundary is wired.
  const validScope = value => typeof value === 'string' && /^[\x21\x23-\x5b\x5d-\x7e]+$/.test(value);
  if (!validScope(requiredIdentityScope)) throw new Error('CANONICAL_IDENTITY_SCOPE_REQUIRED');
  async function resolve(request, operationScope) {
    const required = operationScope ? [requiredIdentityScope, operationScope] : [requiredIdentityScope];
    const principal = await verifier.authenticate(request);
    verifier.requireScopes(request, principal, required);
    const verified = verifier.resolveVerifiedProviderBinding(request, principal);
    const bundle = await getIdentityBundleByProviderSubject(verified.providerKey, verified.providerSubject, verified);
    // Recheck expiry/request binding after asynchronous account access.
    verifier.requireScopes(request, principal, required);
    verifier.resolveVerifiedProviderBinding(request, principal);
    const assertAuthenticationCurrent = () => {
      verifier.requireScopes(request, principal, required);
      verifier.resolveVerifiedProviderBinding(request, principal);
    };
    if (!bundle) return Object.freeze({ status: 'provider-only', session: null, assertAuthenticationCurrent });
    const session = createCraysSessionFromIdentityBundle(bundle);
    return Object.freeze({ status: 'core-mapped', session, assertAuthenticationCurrent });
  }
  return Object.freeze({
    resolve: request => resolve(request),
    async authorize(request, serverPermissionCheck) {
      if (typeof evaluateSessionPermission !== 'function') throw new Error('CANONICAL_PERMISSION_EVALUATOR_REQUIRED');
      const { requiredOAuthScope, ...permissionCheck } = serverPermissionCheck ?? {};
      if (!validScope(requiredOAuthScope)) throw new Error('SERVER_OPERATION_SCOPE_REQUIRED');
      const { session } = await resolve(request, requiredOAuthScope);
      if (!session) return Object.freeze({ allowed: false, reason: 'No CRAYS account mapping is active.' });
      // Both JWT scopes and existing Core policy must allow the action. Record/tenant/field,
      // current delegation, mandate and money guards remain mandatory downstream.
      return Object.freeze(evaluateSessionPermission(session, permissionCheck));
    },
  });
}
