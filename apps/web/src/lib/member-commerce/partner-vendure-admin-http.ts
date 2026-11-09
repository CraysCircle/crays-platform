import "server-only";

import type { RoleKey } from "@/lib/roles";
import type { KdsDatabase } from "@/store-operations/kds";
import { isCommerceRoleVerticalAuthorized } from
  "./commerce-role-vertical-authority";
import {
  authorizePartnerVendureAdmin,
} from "./partner-vendure-admin-authorization";
import {
  isCommerceGrantLoadingError,
  loadPartnerVendureAdminGrants,
} from "./partner-vendure-admin-grant-repository";
import {
  isVendureAdminReadProviderError,
  type VendureAdminReadAction,
  type VendureAdminReadProvider,
} from "./vendure-admin-read-provider";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VERTICALS = ["coffee", "retail", "gym", "clubs"] as const;
const ACTIONS: readonly VendureAdminReadAction[] = [
  "catalog.read",
  "order.read",
];
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

function isAction(value: unknown): value is VendureAdminReadAction {
  return typeof value === "string" &&
    ACTIONS.includes(value as VendureAdminReadAction);
}

export async function handlePartnerVendureAdminRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    provider: VendureAdminReadProvider;
    resolveAuthority: (request: Request) => Promise<Authority>;
    loadGrants?: typeof loadPartnerVendureAdminGrants;
    authorize?: typeof authorizePartnerVendureAdmin;
  }>,
): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 4_096) {
    return response({
      state: "invalid", code: "VENDURE_ADMIN_REQUEST_TOO_LARGE",
    }, 413);
  }
  const authority = await dependencies.resolveAuthority(request);
  if (
    authority.authoritySource !== "auth0-crays-session" ||
    !authority.accountId || !authority.strongAuthAllowed
  ) {
    return response({
      state: "denied",
      code: "VENDURE_ADMIN_AUTHORIZATION_REQUIRED",
      recovery: "authenticate_and_select_active_role",
    }, 403);
  }
  if (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
    "application/json"
  ) {
    return response({
      state: "invalid", code: "VENDURE_ADMIN_REQUEST_INVALID",
    }, 400);
  }
  const body = await request.json().catch(() => null) as
    Record<string, unknown> | null;
  const admittedKeys = [
    "action", "expectedAssignmentVersion", "storeId", "verticalRoot",
  ];
  if (
    !body || Object.keys(body).some((key) => !admittedKeys.includes(key)) ||
    !isAction(body.action) ||
    typeof body.verticalRoot !== "string" ||
    !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
    typeof body.storeId !== "string" || !ID.test(body.storeId) ||
    (body.expectedAssignmentVersion !== undefined &&
      (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
        Number(body.expectedAssignmentVersion) < 1))
  ) {
    return response({
      state: "invalid", code: "VENDURE_ADMIN_REQUEST_INVALID",
    }, 400);
  }
  const verticalRoot = body.verticalRoot as (typeof VERTICALS)[number];
  if (!isCommerceRoleVerticalAuthorized(
    authority.effectiveRole, verticalRoot)) {
    return response({
      state: "not_found",
      code: "VENDURE_ADMIN_SCOPE_NOT_AVAILABLE",
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
      action: body.action,
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
        code: "VENDURE_ADMIN_SCOPE_NOT_AVAILABLE",
        recovery: "select_an_authorized_store",
      }, 404);
    }
    const result = await dependencies.provider.execute({
      action: body.action,
      deploymentCellId: snapshot.context.vendure.deploymentCellId,
      channelTokenSecretRef:
        snapshot.context.vendure.channelTokenSecretRef,
    });
    return response({
      state: "ready",
      action: result.action,
      scope: {
        verticalRoot: snapshot.context.verticalRoot,
        storeId: snapshot.context.storeId,
        storeOperatorAssignmentVersion:
          snapshot.context.storeOperatorAssignmentVersion,
      },
      provider: {
        state: result.providerOutcome,
        itemCount: result.itemCount,
      },
      boundaries: {
        auth0Authenticated: true,
        coreAuthorized: true,
        exactSellerAndChannelResolvedServerSide: true,
        readOnlyOperation: true,
        businessCompletionClaimed: false,
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
        code: "VENDURE_ADMIN_SCOPE_NOT_AVAILABLE",
        recovery: "select_an_authorized_store",
      }, 404);
    }
    if (
      isVendureAdminReadProviderError(error) &&
      error.outcome === "rejected"
    ) {
      return response({
        state: "rejected",
        code: "VENDURE_ADMIN_PROVIDER_REJECTED",
        recovery: "review_store_provider_binding",
      }, 502);
    }
    return response({
      state: "unknown",
      code: "VENDURE_ADMIN_PROVIDER_OUTCOME_UNKNOWN",
      recovery: "retry_same_read_after_provider_recovery",
    }, 503);
  }
}
