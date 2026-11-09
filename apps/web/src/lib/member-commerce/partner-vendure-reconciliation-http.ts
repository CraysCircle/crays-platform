import "server-only";

import type { RoleKey } from "@/lib/roles";
import type { KdsDatabase } from "@/store-operations/kds";
import { isCommerceRoleVerticalAuthorized } from
  "./commerce-role-vertical-authority";
import { authorizePartnerVendureAdmin } from
  "./partner-vendure-admin-authorization";
import {
  isCommerceGrantLoadingError,
  loadPartnerVendureAdminGrants,
} from "./partner-vendure-admin-grant-repository";
import {
  VendureBusinessReconciliationProviderError,
  type ServerBoundVendureBusinessReconciliationProvider,
} from "./vendure-business-reconciliation-provider";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VERTICALS = ["coffee", "retail", "gym", "clubs"] as const;
const responseHeaders = { "cache-control": "private, no-store" };

type Authority = Readonly<{
  authoritySource: string;
  accountId: string | null;
  organizationId: string;
  effectiveRole: RoleKey;
  strongAuthAllowed: boolean;
}>;

function response(body: object, status: number) {
  return Response.json(body, { status, headers: responseHeaders });
}

export async function handlePartnerVendureReconciliationRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    provider: Pick<ServerBoundVendureBusinessReconciliationProvider, "read">;
    resolveAuthority: (request: Request) => Promise<Authority>;
    loadGrants?: typeof loadPartnerVendureAdminGrants;
    authorize?: typeof authorizePartnerVendureAdmin;
  }>,
): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 4_096) {
    return response({
      state: "invalid", code: "VENDURE_RECONCILIATION_REQUEST_TOO_LARGE",
    }, 413);
  }
  const authority = await dependencies.resolveAuthority(request);
  if (
    authority.authoritySource !== "auth0-crays-session" ||
    !authority.accountId || !authority.strongAuthAllowed
  ) {
    return response({
      state: "denied",
      code: "VENDURE_RECONCILIATION_AUTHORIZATION_REQUIRED",
      recovery: "authenticate_and_select_active_role",
    }, 403);
  }
  if (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
    "application/json"
  ) {
    return response({
      state: "invalid", code: "VENDURE_RECONCILIATION_REQUEST_INVALID",
    }, 400);
  }
  const body = await request.json().catch(() => null) as
    Record<string, unknown> | null;
  const admitted = [
    "expectedAssignmentVersion", "storeId", "take", "verticalRoot",
  ];
  const take = body?.take === undefined ? 25 : body.take;
  if (
    !body || Object.keys(body).some((key) => !admitted.includes(key)) ||
    typeof body.verticalRoot !== "string" ||
    !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
    typeof body.storeId !== "string" || !ID.test(body.storeId) ||
    !Number.isSafeInteger(take) || Number(take) < 1 || Number(take) > 50 ||
    (body.expectedAssignmentVersion !== undefined &&
      (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
        Number(body.expectedAssignmentVersion) < 1))
  ) {
    return response({
      state: "invalid", code: "VENDURE_RECONCILIATION_REQUEST_INVALID",
    }, 400);
  }
  const verticalRoot = body.verticalRoot as (typeof VERTICALS)[number];
  if (!isCommerceRoleVerticalAuthorized(
    authority.effectiveRole, verticalRoot)) {
    return response({
      state: "not_found",
      code: "VENDURE_RECONCILIATION_SCOPE_NOT_AVAILABLE",
      recovery: "select_an_authorized_store",
    }, 404);
  }
  try {
    const snapshot = await (dependencies.loadGrants ??
      loadPartnerVendureAdminGrants)(dependencies.database, {
        accountId: authority.accountId,
        organizationId: authority.organizationId,
        effectiveRole: authority.effectiveRole,
        verticalRoot,
        storeId: body.storeId,
        expectedAssignmentVersion:
          body.expectedAssignmentVersion as number | undefined,
      });
    const decision = (dependencies.authorize ?? authorizePartnerVendureAdmin)({
      action: "order.read",
      grants: snapshot.grants,
      context: snapshot.context,
      now: new Date(snapshot.authorityNow),
    });
    if (
      decision.decision !== "ALLOW" ||
      decision.scope.kind !== "partner_store" ||
      decision.scope.partnerTenantId !== snapshot.context.partnerTenantId ||
      decision.scope.operatorLegalEntityId !==
        snapshot.context.operatorLegalEntityId ||
      decision.scope.storeId !== snapshot.context.storeId ||
      decision.scope.vendureDeploymentCellId !==
        snapshot.context.vendure.deploymentCellId ||
      decision.scope.vendureSellerId !== snapshot.context.vendure.sellerId ||
      decision.scope.vendureChannelId !== snapshot.context.vendure.channelId
    ) {
      return response({
        state: "not_found",
        code: "VENDURE_RECONCILIATION_SCOPE_NOT_AVAILABLE",
        recovery: "select_an_authorized_store",
      }, 404);
    }
    const items = await dependencies.provider.read({
      deploymentCellId: snapshot.context.vendure.deploymentCellId,
      channelTokenSecretRef: snapshot.context.vendure.channelTokenSecretRef,
      expectedChannelId: snapshot.context.vendure.channelId,
      take: Number(take),
    });
    return response({
      state: "ready",
      scope: {
        verticalRoot: snapshot.context.verticalRoot,
        storeId: snapshot.context.storeId,
        storeOperatorAssignmentVersion:
          snapshot.context.storeOperatorAssignmentVersion,
      },
      items,
      boundaries: {
        auth0Authenticated: true,
        coreAuthorized: true,
        exactSellerAndChannelResolvedServerSide: true,
        providerAcknowledgementIsBusinessCompletion: false,
        businessCompleteOnlyWhenReconciled: true,
        reloadSourceIsDurableProviderRecords: true,
        providerIdentifiersOrSecretsExposed: false,
      },
    }, 200);
  } catch (error) {
    if (
      isCommerceGrantLoadingError(error) ||
      (error instanceof Error && [
        "COMMERCE_CONTEXT_UNRESOLVED",
        "COMMERCE_CONTEXT_STALE",
      ].includes(error.message))
    ) {
      return response({
        state: "not_found",
        code: "VENDURE_RECONCILIATION_SCOPE_NOT_AVAILABLE",
        recovery: "select_an_authorized_store",
      }, 404);
    }
    if (
      error instanceof VendureBusinessReconciliationProviderError &&
      error.outcome === "rejected"
    ) {
      return response({
        state: "rejected",
        code: "VENDURE_RECONCILIATION_PROVIDER_REJECTED",
        recovery: "review_store_provider_binding",
      }, 502);
    }
    return response({
      state: "unknown",
      code: "VENDURE_RECONCILIATION_PROVIDER_OUTCOME_UNKNOWN",
      recovery: "retry_same_read_after_provider_recovery",
    }, 503);
  }
}
