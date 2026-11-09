import type { RoleKey } from "@/lib/roles";

export const CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT = {
  schema: "crays.clubs.team-property-admission-ui.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/team/property-admissions",
  cache: "no-store",
  entrypoint: "https://www.crays.pro",
  authentication: "crays_pro_b2b_auth0_exact_core_mapping",
  allowedRoles: ["crays-management", "reviewer", "admin"],
  assurance: {
    allowed: ["aal2", "aal3"],
    maximumAgeSeconds: 300,
  },
  property: {
    propertyId: "property-clubs-forest-city-marina",
    allowedStayUnits: ["month"],
    membershipRequired: true,
    exactCommercialScopeRequired: true,
  },
  commands: ["grant_access", "revoke_access"],
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    idempotencyKeyRequired: true,
    appendOnlyGrantAndEvent: true,
    appendOnlyCommandReceipt: true,
  },
  authoritySeparation: {
    authentication: "does_not_imply_membership_or_property_admission",
    membership: "required_but_insufficient",
    propertyAdmission: "does_not_imply_availability_or_booking",
    availability: "separate_source_authority_required",
    quote: "separate_commercial_authority_required",
    booking: "separate_commercial_authority_required",
    payment: "separate_payment_authority_required",
  },
} as const;

export type ClubsTeamPropertyAdmissionRole = Extract<
  RoleKey,
  "crays-management" | "reviewer" | "admin"
>;

export type ClubsTeamPropertyAdmissionActor = {
  accountId: string;
  organizationId: string;
  role: ClubsTeamPropertyAdmissionRole;
  assuranceLevel: "aal2" | "aal3";
  authenticatedAt: string;
  authoritySource: "auth0-crays-session";
};

export type ClubsTeamPropertyAdmissionCommand =
  | {
      type: "grant_access";
      propertyId: "property-clubs-forest-city-marina";
      memberAccountId: string;
      expectedGrantVersion: 0;
      validUntil: string | null;
      reasonCode: "membership_and_marina_access_approved";
    }
  | {
      type: "revoke_access";
      propertyId: "property-clubs-forest-city-marina";
      memberAccountId: string;
      grantId: string;
      expectedGrantVersion: number;
      reasonCode: "marina_access_revoked";
    };
