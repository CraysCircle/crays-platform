export const CLUBS_MEMBER_PROPERTY_ELIGIBILITY_CONTRACT = {
  schema: "crays.clubs.member-property-eligibility-ui.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/member/properties/{propertyId}/eligibility",
  cache: "no-store",
  readOnly: true,
  properties: {
    golf: {
      propertyId: "property-clubs-forest-city-golf",
      accessMode: "open",
      membershipRequired: false,
      propertyAdmissionRequired: false,
      allowedStayUnits: ["night", "week", "month"],
    },
    marina: {
      propertyId: "property-clubs-forest-city-marina",
      accessMode: "property_admission_required",
      membershipRequired: true,
      propertyAdmissionRequired: true,
      allowedStayUnits: ["month"],
    },
  },
  eligibilityStates: [
    "public_access",
    "authentication_required",
    "membership_required",
    "property_scope_not_ready",
    "property_admission_required",
    "property_access_admitted",
  ],
  authoritySeparation: {
    authentication: "does_not_imply_membership",
    membership: "does_not_imply_property_admission",
    propertyAdmission: "does_not_imply_availability_or_booking",
    availability: "separate_source_authority_required",
    booking: "separate_commercial_authority_required",
  },
} as const;

export type ClubsMemberEligibilityPropertyId =
  "property-clubs-forest-city-golf" | "property-clubs-forest-city-marina";

export type ClubsMemberEligibilityMembershipStatus =
  "not_confirmed" | "confirmed" | "suspended" | "revoked" | "expired";
