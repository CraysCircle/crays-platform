import type { RoleKey } from "@/lib/roles";

export const CLUBS_FOUNDER_CORE_BOOTSTRAP_PROFILES = Object.freeze([
  { publicAmbassadorSlug: "thorben-biesenbach", displayName: "Thorben Biesenbach" },
  { publicAmbassadorSlug: "isabel-maria-jeworski", displayName: "Isabel Maria Jeworski" },
  { publicAmbassadorSlug: "robin-karlsen", displayName: "Robin H. Karlsen" },
  { publicAmbassadorSlug: "kumar-hindocha", displayName: "Kumar Hindocha" },
  { publicAmbassadorSlug: "stephanie-weyer", displayName: "Stephanie Weyer" },
] as const);

export const CLUBS_AMBASSADOR_OPERATIONS_CONTRACT = {
  schema: "crays.clubs.ambassador-operations.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/ambassador/operations",
  page: "/en/clubs/operations",
  deployment: "isolated_source_preview_only",
  cache: "no-store",
  allowedActorRoles: ["crays-management", "admin"],
  operationalRoles: [
    "ambassador",
    "lead_ambassador",
    "application_coordinator",
    "application_reviewer",
  ],
  assurance: { allowed: ["aal2", "aal3"], maximumAgeSeconds: 300 },
  commands: [
    "create_ambassador",
    "edit_ambassador",
    "deactivate_ambassador",
    "assign_application",
    "unassign_application",
  ],
  founderCoreBootstrap: {
    schema: "crays.clubs.founder-core-bootstrap-status.v1",
    version: "1.0.0",
    authorizedProfileCount: 5,
    outputFields: [
      "publicAmbassadorSlug",
      "displayName",
      "preRegistration",
      "realLoginBound",
      "activationPass",
      "entitlement",
      "accountActive",
    ],
    aianaIncluded: false,
    publicRoleLabelAuthority: false,
    sensitiveIdentifiersExposed: false,
  },
  mutationSecurity: {
    previewOnlyHost: true,
    sameOrigin: true,
    jsonOnly: true,
    idempotencyKeyRequired: true,
    expectedVersionRequiredForExistingRecords: true,
    appendOnlyRegistry: true,
    appendOnlyAssignments: true,
    forcedRowLevelSecurity: true,
  },
  authoritySeparation: {
    registryProfile: "operations_profile_only",
    reviewerPrincipal: "separate_exact_active_binding_required",
    assignment: "work_ownership_only",
    review: "not_granted_by_registry_or_assignment",
    recommendation: "not_granted_by_registry_or_assignment",
    teamGo: "separate_crays_team_decision_required",
    membership: "not_created_or_inferred",
    propertyAdmission: "separate_exact_active_grant_required",
    booking: "not_created_or_inferred",
    payment: "not_created_or_inferred",
    beneficiaryOrPayout: "not_created_or_inferred",
    productionIdentity: "not_claimed",
  },
  deliveryIsolation: {
    craysProMutation: false,
    craysGymMutation: false,
    auth0Mutation: false,
    stripeMutation: false,
    providerMutation: false,
    productionMutation: false,
  },
} as const;

export type ClubsAmbassadorOperationsActorRole = Extract<
  RoleKey,
  "crays-management" | "admin"
>;
export type ClubsAmbassadorOperationalRole =
  (typeof CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.operationalRoles)[number];

export type ClubsAmbassadorOperationsActor = {
  accountId: string;
  organizationId: string;
  role: ClubsAmbassadorOperationsActorRole;
  assuranceLevel: "aal2" | "aal3";
  authenticatedAt: string;
  authoritySource: "auth0-crays-session";
};

export type ClubsFounderCoreBootstrapSlug =
  (typeof CLUBS_FOUNDER_CORE_BOOTSTRAP_PROFILES)[number]["publicAmbassadorSlug"];

export type ClubsFounderCoreBootstrapSignals = {
  publicAmbassadorSlug: ClubsFounderCoreBootstrapSlug;
  displayName: string;
  preRegistrationReady: boolean;
  realLoginBound: boolean;
  activationPass: boolean;
  fullActive: boolean;
  accountActive: boolean;
};

export type ClubsFounderCoreBootstrapStatus = {
  publicAmbassadorSlug: ClubsFounderCoreBootstrapSlug;
  displayName: string;
  preRegistration: "pending" | "ready";
  realLoginBound: boolean;
  activationPass: boolean;
  entitlement: "pending" | "FULL_ACTIVE";
  accountActive: boolean;
};

export function reconcileClubsFounderCoreBootstrapStatus(
  rows: readonly ClubsFounderCoreBootstrapSignals[],
): ClubsFounderCoreBootstrapStatus[] {
  if (rows.length !== CLUBS_FOUNDER_CORE_BOOTSTRAP_PROFILES.length) {
    throw new Error("invalid_founder_core_bootstrap_status");
  }
  return CLUBS_FOUNDER_CORE_BOOTSTRAP_PROFILES.map((profile, index) => {
    const row = rows[index];
    if (
      row?.publicAmbassadorSlug !== profile.publicAmbassadorSlug ||
      row.displayName !== profile.displayName ||
      typeof row.preRegistrationReady !== "boolean" ||
      typeof row.realLoginBound !== "boolean" ||
      typeof row.activationPass !== "boolean" ||
      typeof row.fullActive !== "boolean" ||
      typeof row.accountActive !== "boolean" ||
      (row.activationPass && !row.preRegistrationReady) ||
      (row.realLoginBound && !row.activationPass) ||
      (row.accountActive && !row.realLoginBound) ||
      (row.fullActive &&
        (!row.accountActive || !row.realLoginBound || !row.activationPass))
    ) {
      throw new Error("invalid_founder_core_bootstrap_status");
    }
    return {
      publicAmbassadorSlug: profile.publicAmbassadorSlug,
      displayName: profile.displayName,
      preRegistration: row.preRegistrationReady ? "ready" : "pending",
      realLoginBound: row.realLoginBound,
      activationPass: row.activationPass,
      entitlement: row.fullActive ? "FULL_ACTIVE" : "pending",
      accountActive: row.accountActive,
    };
  });
}

type RegistryDetails = {
  displayName: string;
  regionLabel: string;
  operationalRoles: ClubsAmbassadorOperationalRole[];
  reviewerBindingId: string | null;
};

export type ClubsAmbassadorOperationsCommand =
  | ({
      type: "create_ambassador";
      ambassadorProfileId?: string;
      reasonCode: "registry_created";
    } & RegistryDetails)
  | ({
      type: "edit_ambassador";
      ambassadorProfileId: string;
      expectedVersion: number;
      reasonCode: "registry_details_updated";
    } & RegistryDetails)
  | {
      type: "deactivate_ambassador";
      ambassadorProfileId: string;
      expectedVersion: number;
      reasonCode: "operations_access_deactivated";
    }
  | {
      type: "assign_application";
      applicationId: string;
      ambassadorProfileId: string;
      expectedAssignmentVersion: number;
      reasonCode: "operations_assignment" | "operations_reassignment";
    }
  | {
      type: "unassign_application";
      applicationId: string;
      expectedAssignmentVersion: number;
      reasonCode: "operations_unassignment";
    };

export type ClubsAmbassadorRegistryEntry = {
  ambassadorProfileId: string;
  organizationId: string;
  version: number;
  status: "active" | "inactive";
  displayName: string;
  regionLabel: string;
  operationalRoles: ClubsAmbassadorOperationalRole[];
  reviewerBindingId: string | null;
  reviewerBindingState: "not_bound" | "ready" | "revoked" | "not_ready" | "expired";
  reviewAuthorityDerived: false;
  updatedAt: string;
};

export type ClubsApplicationAssignmentItem = {
  applicationId: string;
  applicationStatus: string;
  applicationVersion: number;
  submittedAt: string;
  assignmentVersion: number;
  assignmentStatus: "assigned" | "unassigned";
  ambassadorProfileId: string | null;
  reviewerBindingId: string | null;
  reviewAuthorityDerived: false;
  teamGoAuthorityDerived: false;
  membershipAuthorityDerived: false;
  admissionAuthorityDerived: false;
  assignedAt: string | null;
};

export type ClubsAmbassadorOperationsAuditItem = {
  ledger: "registry" | "assignment";
  eventId: string;
  subjectId: string;
  eventType: string;
  actorAccountId: string;
  actorRole: ClubsAmbassadorOperationsActorRole;
  reasonCode: string;
  occurredAt: string;
};

export type ClubsAmbassadorOperationsReadModel = {
  schema: typeof CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.schema;
  version: typeof CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.version;
  status: "ready";
  registry: ClubsAmbassadorRegistryEntry[];
  founderCoreBootstrap: ClubsFounderCoreBootstrapStatus[];
  applications: ClubsApplicationAssignmentItem[];
  audit: ClubsAmbassadorOperationsAuditItem[];
  authorities: {
    registryAdministration: true;
    assignmentAdministration: true;
    reviewDerived: false;
    teamGoDerived: false;
    membershipDerived: false;
    propertyAdmissionDerived: false;
    bookingDerived: false;
    paymentDerived: false;
  };
};
