import {
  FOREST_CITY_HOSPITALITY_PROPERTIES,
  type ForestCityHospitalityPropertyId,
} from "./forest-city-hospitality-booking-north-star";

export type ForestCityMembershipStatus =
  | "none"
  | "application_submitted"
  | "application_under_review"
  | "confirmed"
  | "suspended"
  | "revoked"
  | "expired";

export type ForestCityPropertyAdmissionGrant = {
  grantId: string;
  accountId: string;
  propertyId: ForestCityHospitalityPropertyId;
  storeId: string;
  tenantId: string;
  legalEntityId: string;
  assignmentVersion: number;
  policyVersion: number;
  status: "active" | "inactive" | "revoked";
  validFrom: string;
  validUntil: string | null;
  revokedAt: string | null;
};

export type ForestCityHospitalityBookingAccessInput = {
  propertyId: ForestCityHospitalityPropertyId;
  sourceReady: boolean;
  evaluatedAt: string;
  accountId: string | null;
  membershipStatus: ForestCityMembershipStatus;
  membershipDecisionAuthority: "CRAYS_TEAM" | null;
  requiredScope: {
    storeId: string;
    tenantId: string;
    legalEntityId: string;
    assignmentVersion: number;
    policyVersion: number;
  };
  propertyAdmissionGrant: ForestCityPropertyAdmissionGrant | null;
};

export type ForestCityHospitalityBookingAccessReason =
  | "open"
  | "confirmed_membership_and_property_admission"
  | "source_not_ready"
  | "authentication_required"
  | "membership_confirmation_required"
  | "crays_team_membership_decision_required"
  | "property_admission_required"
  | "property_admission_not_active"
  | "property_admission_not_current"
  | "property_admission_scope_mismatch";

export type ForestCityHospitalityBookingAccessDecision = {
  propertyId: ForestCityHospitalityPropertyId;
  accessMode: "open" | "property_admission_required";
  propertyDiscoveryAllowed: true;
  roomDiscoveryAllowed: boolean;
  availabilitySearchAllowed: boolean;
  priceQuoteDisplayAllowed: boolean;
  reservationHoldAllowed: boolean;
  checkoutAllowed: boolean;
  reservationAllowed: boolean;
  paymentPreparationAllowed: boolean;
  bookingAllowed: boolean;
  membershipRequired: boolean;
  propertyAdmissionRequired: boolean;
  finalDecisionAuthority: "CRAYS_TEAM";
  reason: ForestCityHospitalityBookingAccessReason;
};

function parseEvaluationTime(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error("evaluatedAt must be a valid ISO timestamp");
  }
  return timestamp;
}

function baseDecision(
  input: ForestCityHospitalityBookingAccessInput,
): Omit<
  ForestCityHospitalityBookingAccessDecision,
  | "reservationHoldAllowed"
  | "checkoutAllowed"
  | "reservationAllowed"
  | "paymentPreparationAllowed"
  | "bookingAllowed"
  | "membershipRequired"
  | "propertyAdmissionRequired"
  | "reason"
> {
  const marina =
    input.propertyId ===
    FOREST_CITY_HOSPITALITY_PROPERTIES.marina.propertyId;

  return {
    propertyId: input.propertyId,
    accessMode: marina
      ? "property_admission_required"
      : "open",
    propertyDiscoveryAllowed: true,
    roomDiscoveryAllowed: input.sourceReady,
    availabilitySearchAllowed: input.sourceReady,
    priceQuoteDisplayAllowed: input.sourceReady,
    finalDecisionAuthority: "CRAYS_TEAM",
  };
}

function deny(
  input: ForestCityHospitalityBookingAccessInput,
  reason: ForestCityHospitalityBookingAccessReason,
  membershipRequired: boolean,
  propertyAdmissionRequired: boolean,
): ForestCityHospitalityBookingAccessDecision {
  return {
    ...baseDecision(input),
    reservationHoldAllowed: false,
    checkoutAllowed: false,
    reservationAllowed: false,
    paymentPreparationAllowed: false,
    bookingAllowed: false,
    membershipRequired,
    propertyAdmissionRequired,
    reason,
  };
}

function allow(
  input: ForestCityHospitalityBookingAccessInput,
  reason: ForestCityHospitalityBookingAccessReason,
  membershipRequired: boolean,
  propertyAdmissionRequired: boolean,
): ForestCityHospitalityBookingAccessDecision {
  return {
    ...baseDecision(input),
    reservationHoldAllowed: true,
    checkoutAllowed: true,
    reservationAllowed: true,
    paymentPreparationAllowed: true,
    bookingAllowed: true,
    membershipRequired,
    propertyAdmissionRequired,
    reason,
  };
}

function grantMatchesScope(
  input: ForestCityHospitalityBookingAccessInput,
  grant: ForestCityPropertyAdmissionGrant,
): boolean {
  return (
    grant.accountId === input.accountId
    && grant.propertyId === input.propertyId
    && grant.storeId === input.requiredScope.storeId
    && grant.tenantId === input.requiredScope.tenantId
    && grant.legalEntityId === input.requiredScope.legalEntityId
    && grant.assignmentVersion ===
      input.requiredScope.assignmentVersion
    && grant.policyVersion ===
      input.requiredScope.policyVersion
  );
}

function grantIsCurrent(
  grant: ForestCityPropertyAdmissionGrant,
  evaluatedAt: number,
): boolean {
  const validFrom = Date.parse(grant.validFrom);
  const validUntil = grant.validUntil
    ? Date.parse(grant.validUntil)
    : null;

  if (!Number.isFinite(validFrom)) return false;
  if (validUntil !== null && !Number.isFinite(validUntil)) return false;

  return (
    validFrom <= evaluatedAt
    && (validUntil === null || evaluatedAt < validUntil)
  );
}

export function evaluateForestCityHospitalityBookingAccess(
  input: ForestCityHospitalityBookingAccessInput,
): ForestCityHospitalityBookingAccessDecision {
  const evaluatedAt = parseEvaluationTime(input.evaluatedAt);
  const isGolf =
    input.propertyId ===
    FOREST_CITY_HOSPITALITY_PROPERTIES.golf.propertyId;
  const isMarina =
    input.propertyId ===
    FOREST_CITY_HOSPITALITY_PROPERTIES.marina.propertyId;

  if (!isGolf && !isMarina) {
    throw new Error("unsupported Forest City hospitality property");
  }

  if (!input.sourceReady) {
    return deny(input, "source_not_ready", isMarina, isMarina);
  }

  if (isGolf) {
    return allow(input, "open", false, false);
  }

  if (!input.accountId) {
    return deny(
      input,
      "authentication_required",
      true,
      true,
    );
  }

  if (input.membershipStatus !== "confirmed") {
    return deny(
      input,
      "membership_confirmation_required",
      true,
      true,
    );
  }

  if (input.membershipDecisionAuthority !== "CRAYS_TEAM") {
    return deny(
      input,
      "crays_team_membership_decision_required",
      true,
      true,
    );
  }

  const grant = input.propertyAdmissionGrant;
  if (!grant) {
    return deny(
      input,
      "property_admission_required",
      true,
      true,
    );
  }

  if (!grantMatchesScope(input, grant)) {
    return deny(
      input,
      "property_admission_scope_mismatch",
      true,
      true,
    );
  }

  if (
    grant.status !== "active"
    || grant.revokedAt !== null
  ) {
    return deny(
      input,
      "property_admission_not_active",
      true,
      true,
    );
  }

  if (!grantIsCurrent(grant, evaluatedAt)) {
    return deny(
      input,
      "property_admission_not_current",
      true,
      true,
    );
  }

  return allow(
    input,
    "confirmed_membership_and_property_admission",
    true,
    true,
  );
}
