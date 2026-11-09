import "server-only";

import type { RoleKey } from "@/lib/roles";
import type { KdsDatabase } from "@/store-operations/kds";
import {
  listAuthorizedPartnerVendureReconciliationContexts,
  ReconciliationContextLoadingError,
} from "./partner-vendure-reconciliation-context-repository";

type Authority = Readonly<{
  authoritySource: string;
  accountId: string | null;
  organizationId: string;
  effectiveRole: RoleKey;
  strongAuthAllowed: boolean;
}>;

const headers = { "cache-control": "private, no-store" };

function response(body: object, status: number) {
  return Response.json(body, { status, headers });
}

export async function handlePartnerVendureReconciliationContextsRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    resolveAuthority: (request: Request) => Promise<Authority>;
    listContexts?: typeof listAuthorizedPartnerVendureReconciliationContexts;
  }>,
): Promise<Response> {
  const authority = await dependencies.resolveAuthority(request);
  if (
    authority.authoritySource !== "auth0-crays-session" ||
    !authority.accountId || !authority.strongAuthAllowed
  ) {
    return response({
      state: "denied",
      code: "VENDURE_RECONCILIATION_CONTEXT_AUTHORIZATION_REQUIRED",
      recovery: "authenticate_and_select_active_role",
    }, 403);
  }
  try {
    const contexts = await (dependencies.listContexts ??
      listAuthorizedPartnerVendureReconciliationContexts)(
      dependencies.database,
      {
        accountId: authority.accountId,
        organizationId: authority.organizationId,
        effectiveRole: authority.effectiveRole,
      },
    );
    return response({
      state: "ready",
      contexts,
      boundaries: {
        auth0Authenticated: true,
        coreAuthorized: true,
        exactStoreSelectionRequired: true,
        providerIdentifiersOrSecretsExposed: false,
        selectionGrantsBusinessAuthority: false,
      },
    }, 200);
  } catch (error) {
    const known = error instanceof ReconciliationContextLoadingError;
    return response({
      state: "unknown",
      code: known
        ? "VENDURE_RECONCILIATION_CONTEXT_AUTHORITY_UNAVAILABLE"
        : "VENDURE_RECONCILIATION_CONTEXT_OUTCOME_UNKNOWN",
      recovery: "retry_context_read_after_authority_recovery",
    }, 503);
  }
}
