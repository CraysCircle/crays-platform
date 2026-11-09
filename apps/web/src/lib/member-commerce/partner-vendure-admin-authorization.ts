import "server-only";

import type { ServerCommerceContext } from "./server-commerce-context-resolver";

export type PartnerCommerceRole =
  | "partner_owner"
  | "store_manager"
  | "catalog_manager"
  | "inventory_operator"
  | "fulfillment_operator"
  | "partner_finance"
  | "refund_approver"
  | "crays_franchise_admin"
  | "crays_platform_superadmin";

export type PartnerVendureAdminAction =
  | "catalog.read"
  | "catalog.write_projection"
  | "availability.read_projection"
  | "order.read"
  | "fulfillment.transition"
  | "payment.status.read"
  | "refund.request"
  | "franchise.aggregate.read"
  | "provider.diagnose";

export type CommerceRoleGrant = Readonly<{
  grantId: string;
  contextVersion: number;
  roleAssignmentId: string;
  relationshipId: string;
  role: PartnerCommerceRole;
  partnerTenantId?: string;
  operatorLegalEntityId?: string;
  storeIds?: readonly string[];
  validFrom: string;
  validUntil?: string;
  status: "active" | "suspended" | "revoked";
  policyVersion: string;
}>;

export type EmergencyElevation = Readonly<{
  incidentId: string;
  approvalReceiptId: string;
  reason: string;
  stepUpVerifiedAt: string;
  expiresAt: string;
}>;

export type PartnerVendureAdminDecision =
  | Readonly<{
      decision: "ALLOW";
      action: PartnerVendureAdminAction;
      grantId: string;
      policyVersion: string;
      scope:
        | {
            kind: "partner_store";
            partnerTenantId: string;
            operatorLegalEntityId: string;
            storeId: string;
            vendureDeploymentCellId: string;
            vendureSellerId: string;
            vendureChannelId: string;
          }
        | {
            kind: "franchise_aggregate";
            providerIdentifiersExposed: false;
            partnerBooksOrTaxEditable: false;
          }
        | {
            kind: "emergency_diagnostic";
            incidentId: string;
            approvalReceiptId: string;
            expiresAt: string;
            writesAllowed: false;
          };
    }>
  | Readonly<{
      decision: "DENY";
      reason:
        | "NO_ACTIVE_GRANT"
        | "ROLE_ACTION_DENIED"
        | "PARTNER_SCOPE_MISMATCH"
        | "LEGAL_ENTITY_SCOPE_MISMATCH"
        | "STORE_SCOPE_MISMATCH"
        | "AGGREGATE_ONLY"
        | "EMERGENCY_ELEVATION_REQUIRED"
        | "EMERGENCY_ELEVATION_INVALID";
    }>;

const partnerActions: Readonly<
  Record<Exclude<PartnerCommerceRole,
    "crays_franchise_admin" | "crays_platform_superadmin">,
    readonly PartnerVendureAdminAction[]>
> = {
  partner_owner: [
    "catalog.read", "availability.read_projection", "order.read",
    "payment.status.read", "refund.request",
  ],
  store_manager: [
    "catalog.read", "catalog.write_projection",
    "availability.read_projection", "order.read",
    "fulfillment.transition", "payment.status.read", "refund.request",
  ],
  catalog_manager: ["catalog.read", "catalog.write_projection"],
  inventory_operator: ["catalog.read", "availability.read_projection"],
  fulfillment_operator: [
    "availability.read_projection", "order.read", "fulfillment.transition",
  ],
  partner_finance: ["order.read", "payment.status.read"],
  refund_approver: ["order.read", "payment.status.read", "refund.request"],
};

function validGrant(grant: CommerceRoleGrant, now: Date): boolean {
  const from = new Date(grant.validFrom);
  const until = grant.validUntil ? new Date(grant.validUntil) : null;
  return grant.status === "active" &&
    !Number.isNaN(from.getTime()) &&
    from <= now &&
    (!until || (!Number.isNaN(until.getTime()) && until > now));
}

function emergencyValid(
  elevation: EmergencyElevation | undefined,
  now: Date,
): elevation is EmergencyElevation {
  if (!elevation) return false;
  const stepUp = new Date(elevation.stepUpVerifiedAt);
  const expires = new Date(elevation.expiresAt);
  return (
    elevation.incidentId.trim().length >= 8 &&
    elevation.approvalReceiptId.trim().length >= 8 &&
    elevation.reason.trim().length >= 12 &&
    !Number.isNaN(stepUp.getTime()) &&
    !Number.isNaN(expires.getTime()) &&
    stepUp <= now &&
    now.getTime() - stepUp.getTime() <= 5 * 60_000 &&
    expires > now &&
    expires.getTime() - now.getTime() <= 15 * 60_000
  );
}

export function authorizePartnerVendureAdmin(input: Readonly<{
  action: PartnerVendureAdminAction;
  grants: readonly CommerceRoleGrant[];
  context?: ServerCommerceContext;
  emergencyElevation?: EmergencyElevation;
  now?: Date;
}>): PartnerVendureAdminDecision {
  const now = input.now ?? new Date();
  const grants = input.grants.filter((grant) => validGrant(grant, now));
  if (grants.length === 0) return { decision: "DENY", reason: "NO_ACTIVE_GRANT" };

  if (input.action === "franchise.aggregate.read") {
    const grant = grants.find((item) => item.role === "crays_franchise_admin");
    if (!grant) return { decision: "DENY", reason: "AGGREGATE_ONLY" };
    return {
      decision: "ALLOW",
      action: input.action,
      grantId: grant.grantId,
      policyVersion: grant.policyVersion,
      scope: {
        kind: "franchise_aggregate",
        providerIdentifiersExposed: false,
        partnerBooksOrTaxEditable: false,
      },
    };
  }

  const franchiseAdmin = grants.some(
    (grant) => grant.role === "crays_franchise_admin",
  );
  if (franchiseAdmin) return { decision: "DENY", reason: "AGGREGATE_ONLY" };

  const superadmin = grants.find(
    (grant) => grant.role === "crays_platform_superadmin",
  );
  if (superadmin) {
    if (input.action !== "provider.diagnose") {
      return { decision: "DENY", reason: "ROLE_ACTION_DENIED" };
    }
    if (!input.emergencyElevation) {
      return {
        decision: "DENY",
        reason: "EMERGENCY_ELEVATION_REQUIRED",
      };
    }
    if (!emergencyValid(input.emergencyElevation, now)) {
      return {
        decision: "DENY",
        reason: "EMERGENCY_ELEVATION_INVALID",
      };
    }
    return {
      decision: "ALLOW",
      action: input.action,
      grantId: superadmin.grantId,
      policyVersion: superadmin.policyVersion,
      scope: {
        kind: "emergency_diagnostic",
        incidentId: input.emergencyElevation.incidentId,
        approvalReceiptId: input.emergencyElevation.approvalReceiptId,
        expiresAt: input.emergencyElevation.expiresAt,
        writesAllowed: false,
      },
    };
  }

  if (!input.context) {
    return { decision: "DENY", reason: "PARTNER_SCOPE_MISMATCH" };
  }
  const actionGrant = grants.find((grant) => {
    if (
      grant.role === "crays_franchise_admin" ||
      grant.role === "crays_platform_superadmin"
    ) return false;
    return partnerActions[grant.role].includes(input.action);
  });
  if (!actionGrant) {
    return { decision: "DENY", reason: "ROLE_ACTION_DENIED" };
  }
  if (actionGrant.partnerTenantId !== input.context.partnerTenantId) {
    return { decision: "DENY", reason: "PARTNER_SCOPE_MISMATCH" };
  }
  if (
    actionGrant.operatorLegalEntityId !==
    input.context.operatorLegalEntityId
  ) {
    return { decision: "DENY", reason: "LEGAL_ENTITY_SCOPE_MISMATCH" };
  }
  if (!actionGrant.storeIds?.includes(input.context.storeId)) {
    return { decision: "DENY", reason: "STORE_SCOPE_MISMATCH" };
  }
  return {
    decision: "ALLOW",
    action: input.action,
    grantId: actionGrant.grantId,
    policyVersion: actionGrant.policyVersion,
    scope: {
      kind: "partner_store",
      partnerTenantId: input.context.partnerTenantId,
      operatorLegalEntityId: input.context.operatorLegalEntityId,
      storeId: input.context.storeId,
      vendureDeploymentCellId: input.context.vendure.deploymentCellId,
      vendureSellerId: input.context.vendure.sellerId,
      vendureChannelId: input.context.vendure.channelId,
    },
  };
}
