import type { RoleKey } from "@/lib/roles";

export const holidayManagerCapabilities = [
  "clubs.holiday.dashboard.read",
  "clubs.holiday.queue.read",
  "clubs.holiday.reservation.operate",
  "clubs.holiday.stay.operate",
  "clubs.holiday.readiness.operate",
  "clubs.holiday.maintenance.coordinate",
  "clubs.holiday.property.operate",
  "clubs.files.open",
  "clubs.qlo.launch",
] as const;

export type HolidayManagerCapability = (typeof holidayManagerCapabilities)[number];
export type HolidayManagerAssurance = "aal1" | "aal2" | "aal3";

export type HolidayManagerAuthorityContext = {
  personId: string | null;
  accountStatus: "active" | "review" | "blocked" | "deleted";
  roleKey: RoleKey;
  membershipStatus: "active" | "review" | "suspended" | "offboarded";
  assignmentStatus: "active" | "review" | "revoked";
  relationshipType: "clubs-franchise-partner" | "gym-franchise-partner" | "other";
  relationshipStatus: "active" | "review" | "suspended" | "ended";
  venture: "clubs" | "gym" | "coffee" | "retail";
  organizationId: string | null;
  operatorId: string | null;
  legalEntityId: string | null;
  propertyIds: readonly string[];
  capabilities: readonly string[];
  assuranceLevel: HolidayManagerAssurance;
};

export type HolidayManagerRequestScope = {
  capability: HolidayManagerCapability;
  organizationId: string;
  operatorId: string;
  legalEntityId: string;
  propertyId: string;
};

export type HolidayManagerAccessDecision =
  | {
      allowed: true;
      reason: "authorized";
      effectiveScope: {
        organizationId: string;
        operatorId: string;
        legalEntityId: string;
        propertyId: string;
        capability: HolidayManagerCapability;
      };
    }
  | {
      allowed: false;
      reason:
        | "canonical-person-required"
        | "active-account-required"
        | "holiday-manager-role-required"
        | "active-membership-required"
        | "active-assignment-required"
        | "active-clubs-franchise-relationship-required"
        | "clubs-venture-required"
        | "complete-server-scope-required"
        | "organization-scope-mismatch"
        | "operator-scope-mismatch"
        | "legal-entity-scope-mismatch"
        | "property-scope-mismatch"
        | "capability-not-assigned"
        | "step-up-required";
    };

const stepUpCapabilities = new Set<HolidayManagerCapability>([
  "clubs.files.open",
  "clubs.qlo.launch",
]);

export function authorizeHolidayManager(
  authority: HolidayManagerAuthorityContext,
  request: HolidayManagerRequestScope,
): HolidayManagerAccessDecision {
  if (!authority.personId) return { allowed: false, reason: "canonical-person-required" };
  if (authority.accountStatus !== "active") return { allowed: false, reason: "active-account-required" };
  if (authority.roleKey !== "holiday-manager") return { allowed: false, reason: "holiday-manager-role-required" };
  if (authority.membershipStatus !== "active") return { allowed: false, reason: "active-membership-required" };
  if (authority.assignmentStatus !== "active") return { allowed: false, reason: "active-assignment-required" };
  if (
    authority.relationshipType !== "clubs-franchise-partner"
    || authority.relationshipStatus !== "active"
  ) {
    return { allowed: false, reason: "active-clubs-franchise-relationship-required" };
  }
  if (authority.venture !== "clubs") return { allowed: false, reason: "clubs-venture-required" };
  if (!authority.organizationId || !authority.operatorId || !authority.legalEntityId) {
    return { allowed: false, reason: "complete-server-scope-required" };
  }
  if (authority.organizationId !== request.organizationId) {
    return { allowed: false, reason: "organization-scope-mismatch" };
  }
  if (authority.operatorId !== request.operatorId) {
    return { allowed: false, reason: "operator-scope-mismatch" };
  }
  if (authority.legalEntityId !== request.legalEntityId) {
    return { allowed: false, reason: "legal-entity-scope-mismatch" };
  }
  if (!authority.propertyIds.includes(request.propertyId)) {
    return { allowed: false, reason: "property-scope-mismatch" };
  }
  if (!authority.capabilities.includes(request.capability)) {
    return { allowed: false, reason: "capability-not-assigned" };
  }
  if (stepUpCapabilities.has(request.capability) && authority.assuranceLevel === "aal1") {
    return { allowed: false, reason: "step-up-required" };
  }

  return {
    allowed: true,
    reason: "authorized",
    effectiveScope: {
      organizationId: request.organizationId,
      operatorId: request.operatorId,
      legalEntityId: request.legalEntityId,
      propertyId: request.propertyId,
      capability: request.capability,
    },
  };
}
