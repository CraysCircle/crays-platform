import "server-only";

import type { RoleKey } from "@/lib/roles";
import type { KdsDatabase } from "@/store-operations/kds";
import {
  authorizePartnerVendureAdmin,
} from "./partner-vendure-admin-authorization";
import {
  isCommerceGrantLoadingError,
  loadPartnerVendureAdminGrants,
} from "./partner-vendure-admin-grant-repository";
import {
  PartnerOrderSnapshotProjectionError,
  projectPartnerOrderSnapshot,
  type PartnerOrderSnapshotProvider,
} from "./partner-vendure-admin-order-snapshot";
import {
  PartnerOrderSnapshotProviderError,
} from "./server-bound-partner-order-snapshot-provider";
import { CommerceContextResolutionError } from
  "./server-commerce-context-resolver";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VERTICALS = ["coffee", "retail", "gym", "clubs"] as const;
const responseHeaders = { "cache-control": "private, no-store" };

type Authority = Readonly<{
  authoritySource: string;
  accountId: string | null;
  organizationId: string;
  effectiveRole: RoleKey;
  roleAssignmentId: string | null;
  strongAuthAllowed: boolean;
}>;

function response(body: object, status: number) {
  return Response.json(body, { status, headers: responseHeaders });
}

function exactVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

export async function handlePartnerOrderSnapshotReadRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    provider: PartnerOrderSnapshotProvider;
    resolveAuthority: (request: Request) => Promise<Authority>;
    loadGrants?: typeof loadPartnerVendureAdminGrants;
    authorize?: typeof authorizePartnerVendureAdmin;
  }>,
): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > 4_096) {
    return response({
      state: "invalid", code: "PARTNER_ORDER_SNAPSHOT_REQUEST_TOO_LARGE",
    }, 413);
  }
  const authority = await dependencies.resolveAuthority(request);
  if (
    authority.authoritySource !== "auth0-crays-session" ||
    !authority.accountId || !authority.roleAssignmentId ||
    !authority.strongAuthAllowed
  ) {
    return response({
      state: "denied",
      code: "PARTNER_ORDER_SNAPSHOT_AUTHORIZATION_REQUIRED",
      recovery: "authenticate_and_select_one_active_role",
    }, 403);
  }
  if (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
      "application/json"
  ) {
    return response({
      state: "invalid", code: "PARTNER_ORDER_SNAPSHOT_REQUEST_INVALID",
    }, 400);
  }
  const body = await request.json().catch(() => null) as
    Record<string, unknown> | null;
  const admittedKeys = [
    "expectedAssignmentVersion",
    "expectedContextFingerprint",
    "expectedGrantId",
    "expectedGrantContextVersion",
    "expectedProviderBindingVersion",
    "orderCode",
    "storeId",
    "verticalRoot",
  ];
  if (
    !body || Object.keys(body).some((key) => !admittedKeys.includes(key)) ||
    typeof body.verticalRoot !== "string" ||
    !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
    typeof body.storeId !== "string" || !ID.test(body.storeId) ||
    typeof body.orderCode !== "string" || !ID.test(body.orderCode) ||
    typeof body.expectedGrantId !== "string" ||
    !ID.test(body.expectedGrantId) ||
    typeof body.expectedContextFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(body.expectedContextFingerprint) ||
    !exactVersion(body.expectedAssignmentVersion) ||
    !exactVersion(body.expectedGrantContextVersion) ||
    !exactVersion(body.expectedProviderBindingVersion)
  ) {
    return response({
      state: "invalid", code: "PARTNER_ORDER_SNAPSHOT_REQUEST_INVALID",
    }, 400);
  }
  try {
    const snapshot = await (dependencies.loadGrants ??
      loadPartnerVendureAdminGrants)(dependencies.database, {
        accountId: authority.accountId,
        organizationId: authority.organizationId,
        effectiveRole: authority.effectiveRole,
        verticalRoot: body.verticalRoot as (typeof VERTICALS)[number],
        storeId: body.storeId,
        expectedAssignmentVersion: body.expectedAssignmentVersion,
      });
    const grant = snapshot.grants[0];
    if (
      snapshot.grants.length !== 1 ||
      grant.grantId !== body.expectedGrantId ||
      grant.roleAssignmentId !== authority.roleAssignmentId ||
      grant.contextVersion !== body.expectedGrantContextVersion ||
      snapshot.context.providerBindingVersion !==
        body.expectedProviderBindingVersion ||
      snapshot.context.contextFingerprint !== body.expectedContextFingerprint
    ) {
      return response({
        state: "not_found",
        code: "PARTNER_ORDER_SNAPSHOT_SCOPE_NOT_AVAILABLE",
        recovery: "refresh_authorized_store_context",
      }, 404);
    }
    const decision = (dependencies.authorize ?? authorizePartnerVendureAdmin)({
      action: "order.read",
      grants: snapshot.grants,
      context: snapshot.context,
      now: new Date(snapshot.authorityNow),
    });
    if (
      decision.decision !== "ALLOW" ||
      decision.grantId !== grant.grantId ||
      decision.policyVersion !== grant.policyVersion ||
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
        code: "PARTNER_ORDER_SNAPSHOT_SCOPE_NOT_AVAILABLE",
        recovery: "select_an_authorized_store",
      }, 404);
    }
    const raw = await dependencies.provider.readExact({
      deploymentCellId: snapshot.context.vendure.deploymentCellId,
      vendureSellerId: snapshot.context.vendure.sellerId,
      vendureChannelId: snapshot.context.vendure.channelId,
      channelTokenSecretRef: snapshot.context.vendure.channelTokenSecretRef,
      orderCode: body.orderCode,
    });
    const projection = projectPartnerOrderSnapshot(
      snapshot.context,
      body.orderCode,
      raw,
    );
    return response({
      state: "ready",
      order: {
        orderCode: projection.orderCode,
        contextId: projection.contextId,
        snapshotId: projection.snapshotId,
        snapshotSha256: projection.snapshotSha256,
        dataClass: projection.dataClass,
      },
      scope: {
        verticalRoot: projection.scope.verticalRoot,
        storeId: projection.scope.storeId,
        storeOperatorAssignmentVersion:
          projection.scope.storeOperatorAssignmentVersion,
        providerBindingVersion: projection.scope.providerBindingVersion,
      },
      boundaries: {
        auth0Authenticated: true,
        coreRoleAssignmentAndRelationshipAuthorized: true,
        exactSellerChannelAndCellResolvedServerSide: true,
        customerPersonHashExposed: false,
        sellerSnapshotBodyExposed: false,
        providerIdentifiersOrSecretsExposed: false,
        commandAuthorityInvoked: false,
        mutationPerformed: false,
      },
    }, 200);
  } catch (error) {
    if (
      isCommerceGrantLoadingError(error) ||
      error instanceof CommerceContextResolutionError ||
      (error instanceof PartnerOrderSnapshotProjectionError &&
        error.outcome === "not_found") ||
      (error instanceof PartnerOrderSnapshotProviderError &&
        error.outcome === "not_found")
    ) {
      return response({
        state: "not_found",
        code: "PARTNER_ORDER_SNAPSHOT_SCOPE_NOT_AVAILABLE",
        recovery: "refresh_authorized_store_context",
      }, 404);
    }
    if (
      error instanceof PartnerOrderSnapshotProviderError &&
      error.outcome === "rejected"
    ) {
      return response({
        state: "rejected",
        code: "PARTNER_ORDER_SNAPSHOT_PROVIDER_REJECTED",
        recovery: "review_store_provider_binding",
      }, 502);
    }
    return response({
      state: "unknown",
      code: "PARTNER_ORDER_SNAPSHOT_OUTCOME_UNKNOWN",
      recovery: "retry_same_read_after_provider_recovery",
    }, 503);
  }
}
