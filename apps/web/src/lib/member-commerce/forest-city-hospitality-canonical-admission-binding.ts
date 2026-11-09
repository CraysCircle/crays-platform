import { createHash } from "node:crypto";

export type MembershipTeamAccessReceipt = {
  accessDecisionReceiptId: string;
  tenantId: string;
  propertyId: string;
  memberId: string;
  membershipId: string;
  requiredRole: "CRAYS_TEAM";
  admissionGrantId: string;
  membershipStatus: "confirmed";
  grantStatus: "active";
  decision: "allow";
  evaluatedAt: string;
  expiresAt: string;
  persistedRecord: true;
  syntheticSource: false;
};

export type CanonicalPropertyAdmissionReceipt = {
  decisionReceiptId: string;
  tenantId: string;
  propertyId: string;
  storeId: string;
  operatorLegalEntityId: string;
  assignmentId: string;
  accessMode: "property_admission_required";
  admitted: true;
  accountId: string;
  grantId: string;
  grantVersion: number;
  authorityAt: string;
  decisionReason: "ACTIVE_GRANT";
  decisionSha256: string;
};

export type CanonicalHotelAdmissionBinding = {
  accessDecisionReceiptId: string;
  propertyAdmissionDecisionReceiptId: string;
  tenantId: string;
  propertyId: string;
  accountId: string;
  grantId: string;
  grantVersion: number;
  bindingSha256: string;
};

function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`invalid ${label} timestamp`);
  return parsed;
}

export function bindCanonicalHotelAdmissionEvidence(input: {
  membership: MembershipTeamAccessReceipt;
  propertyAdmission: CanonicalPropertyAdmissionReceipt;
  holdCreatedAt: string;
  expectedStoreId: string;
  expectedLegalEntityId: string;
  expectedAssignmentId: string;
}): CanonicalHotelAdmissionBinding {
  const { membership, propertyAdmission } = input;
  const holdAt = timestamp(input.holdCreatedAt, "hold");
  const membershipAt = timestamp(membership.evaluatedAt, "membership evaluation");
  const membershipExpires = timestamp(membership.expiresAt, "membership expiry");
  const admissionAt = timestamp(propertyAdmission.authorityAt, "property admission authority");
  if (membership.requiredRole !== "CRAYS_TEAM" || membership.membershipStatus !== "confirmed" || membership.grantStatus !== "active" || membership.decision !== "allow") {
    throw new Error("membership/CRAYS_TEAM receipt is not an allow decision");
  }
  if (!membership.persistedRecord || membership.syntheticSource) throw new Error("membership/CRAYS_TEAM receipt must be persisted and non-synthetic");
  if (membershipAt > holdAt || membershipExpires <= holdAt || membershipExpires - membershipAt > 300_000) throw new Error("membership/CRAYS_TEAM receipt is not fresh");
  if (propertyAdmission.accessMode !== "property_admission_required" || !propertyAdmission.admitted || propertyAdmission.decisionReason !== "ACTIVE_GRANT") {
    throw new Error("canonical property admission receipt is not an active-grant allow decision");
  }
  if (admissionAt > holdAt || admissionAt <= holdAt - 300_000) throw new Error("canonical property admission receipt is not fresh");
  if (membership.tenantId !== propertyAdmission.tenantId || membership.propertyId !== propertyAdmission.propertyId || membership.memberId !== propertyAdmission.accountId || membership.admissionGrantId !== propertyAdmission.grantId) {
    throw new Error("membership and property admission receipts do not bind the same subject and grant");
  }
  if (propertyAdmission.storeId !== input.expectedStoreId || propertyAdmission.operatorLegalEntityId !== input.expectedLegalEntityId || propertyAdmission.assignmentId !== input.expectedAssignmentId) {
    throw new Error("property admission receipt does not match commercial assignment lineage");
  }
  if (!Number.isInteger(propertyAdmission.grantVersion) || propertyAdmission.grantVersion < 1) throw new Error("canonical grant version is invalid");
  if (!/^cpa-decision-[0-9a-f]{64}$/.test(propertyAdmission.decisionReceiptId) || !/^[0-9a-f]{64}$/.test(propertyAdmission.decisionSha256)) {
    throw new Error("canonical property admission receipt identity is invalid");
  }
  const material = [
    "cclub.phase9.hotel.canonical-admission-binding.v1",
    membership.accessDecisionReceiptId,
    propertyAdmission.decisionReceiptId,
    membership.tenantId,
    membership.propertyId,
    membership.memberId,
    membership.admissionGrantId,
    String(propertyAdmission.grantVersion),
    input.holdCreatedAt,
  ].join("\n");
  return {
    accessDecisionReceiptId: membership.accessDecisionReceiptId,
    propertyAdmissionDecisionReceiptId: propertyAdmission.decisionReceiptId,
    tenantId: membership.tenantId,
    propertyId: membership.propertyId,
    accountId: membership.memberId,
    grantId: membership.admissionGrantId,
    grantVersion: propertyAdmission.grantVersion,
    bindingSha256: createHash("sha256").update(material).digest("hex"),
  };
}
