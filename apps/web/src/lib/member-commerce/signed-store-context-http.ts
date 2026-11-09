import "server-only";

import type { RoleKey } from "@/lib/roles";
import {
  isCommerceGrantLoadingError,
} from "./partner-vendure-admin-grant-repository";
import {
  executeSignedStoreContextProbe,
  SignedStoreContextProviderError,
  type SignedStoreContextExecutionDependencies,
} from "./signed-store-context-probe";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const headers = { "cache-control": "private, no-store" };

type Authority = Readonly<{
  authoritySource: string;
  accountId: string | null;
  organizationId: string;
  effectiveRole: RoleKey;
  strongAuthAllowed: boolean;
}>;

function response(body: object, status: number) {
  return Response.json(body, { status, headers });
}

export async function handleSignedStoreContextRequest(
  request: Request,
  dependencies: Readonly<{
    execution: SignedStoreContextExecutionDependencies;
    resolveAuthority: (request: Request) => Promise<Authority>;
    execute?: typeof executeSignedStoreContextProbe;
  }>,
): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 4_096) {
    return response({ state: "invalid", code: "SIGNED_STORE_CONTEXT_REQUEST_TOO_LARGE" }, 413);
  }
  const authority = await dependencies.resolveAuthority(request);
  if (
    authority.authoritySource !== "auth0-crays-session" ||
    !authority.accountId || !authority.strongAuthAllowed
  ) {
    return response({
      state: "denied",
      code: "SIGNED_STORE_CONTEXT_AUTHORIZATION_REQUIRED",
      recovery: "authenticate_and_select_active_role",
    }, 403);
  }
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim() !== "application/json") {
    return response({ state: "invalid", code: "SIGNED_STORE_CONTEXT_REQUEST_INVALID" }, 400);
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const admitted = ["expectedAssignmentVersion", "storeId", "verticalRoot"];
  if (
    !body || Object.keys(body).some((key) => !admitted.includes(key)) ||
    body.verticalRoot !== "coffee" || typeof body.storeId !== "string" ||
    !ID.test(body.storeId) ||
    (body.expectedAssignmentVersion !== undefined &&
      (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
        Number(body.expectedAssignmentVersion) < 1))
  ) {
    return response({ state: "invalid", code: "SIGNED_STORE_CONTEXT_REQUEST_INVALID" }, 400);
  }
  try {
    const result = await (dependencies.execute ?? executeSignedStoreContextProbe)(
      dependencies.execution,
      {
        accountId: authority.accountId,
        organizationId: authority.organizationId,
        effectiveRole: authority.effectiveRole,
        verticalRoot: "coffee",
        storeId: body.storeId,
        expectedAssignmentVersion: body.expectedAssignmentVersion as number | undefined,
      },
    );
    return response({
      state: result.state,
      store: {
        verticalRoot: result.verticalRoot,
        storeId: result.storeId,
        storeOperatorAssignmentVersion:
          result.storeOperatorAssignmentVersion,
        sellerLegalName: result.sellerLegalName,
        merchantOfRecord: result.merchantOfRecord,
        contextFingerprint: result.contextFingerprint,
      },
      providerBoundary: result.providerBoundary,
      expiresAt: result.expiresAt,
      boundaries: {
        auth0Authenticated: true,
        coreAuthorized: true,
        sellerAndProviderScopeResolvedServerSide: true,
        signedContextOrChannelCredentialExposed: false,
      },
    }, 200);
  } catch (error) {
    if (
      isCommerceGrantLoadingError(error) ||
      (error instanceof Error && [
        "SIGNED_STORE_CONTEXT_AUTHORIZATION_DENIED",
        "SIGNED_STORE_CONTEXT_STORE_NOT_AVAILABLE",
        "SIGNED_STORE_CONTEXT_SCOPE_MISMATCH",
        "COMMERCE_CONTEXT_UNRESOLVED",
        "COMMERCE_CONTEXT_STALE",
      ].includes(error.message)) ||
      (error instanceof SignedStoreContextProviderError && error.outcome === "rejected")
    ) {
      return response({
        state: "not_found",
        code: "SIGNED_STORE_CONTEXT_NOT_AVAILABLE",
        recovery: "select_an_authorized_store",
      }, 404);
    }
    return response({
      state: "unknown",
      code: "SIGNED_STORE_CONTEXT_OUTCOME_UNKNOWN",
      recovery: "retry_same_selection_after_reconciliation",
    }, 503);
  }
}
