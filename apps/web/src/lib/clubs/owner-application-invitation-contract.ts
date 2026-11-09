import type { ApprovedAmbassadorSlug } from "@/lib/clubs/public-ambassador-registry";
import type { ClubsTeamMembershipPersonReviewAuthority } from "@/lib/clubs/team-membership-person-review-command-contract";

export const CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT = {
  schema: "crays.clubs.owner-application-invitation.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/team/applications/invitations",
  methods: ["GET", "POST"],
  cache: "no-store",
  maximumItems: 25,
  authentication: {
    authFirst: true,
    exactB2bSessionRequired: true,
    allowedRoles: ["crays-management", "admin"],
    assurance: ["aal2", "aal3"],
    maximumAuthenticationAgeSeconds: 300,
    tenantBindingRequired: true,
  },
  sourceChannels: {
    direct_web: "0232_direct_membership_application",
    ambassador_referral:
      "0232_direct_membership_application_plus_0252_immutable_attribution",
    browserMayNotSelectSourceChannel: true,
    browserMayNotSupplyRecipient: true,
  },
  commands: [
    "start_review",
    "request_more_information",
    "approve_for_invitation",
    "decline",
  ],
  delivery: {
    approvalCreatesOneUnsentIntent: true,
    exactServerHeldNormalizedEmailRequired: true,
    emailSentByThisContract: false,
    plaintextTokenStored: false,
  },
  deniedAuthorities: {
    reviewerMayApprove: false,
    ambassadorMayApprove: false,
    qloMayApprove: false,
    membershipAuthorityGranted: false,
    propertyAdmissionAuthorityGranted: false,
    bookingAuthorityGranted: false,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    commissionAuthorityGranted: false,
  },
} as const;

export type ClubsOwnerApplicationInvitationAuthority =
  ClubsTeamMembershipPersonReviewAuthority;

export type ClubsOwnerApplicationSourceChannel =
  | "direct_web"
  | "ambassador_referral";

export type ClubsOwnerApplicationInvitationState =
  | "submitted"
  | "under_review"
  | "more_information_required"
  | "approved_for_invitation"
  | "declined"
  | "reconciliation_required";

export type ClubsOwnerApplicationInvitationAction =
  | "start_review"
  | "request_more_information"
  | "approve_for_invitation"
  | "decline";

export type ClubsOwnerApplicationInvitationCommand = Readonly<{
  type: ClubsOwnerApplicationInvitationAction;
  applicationReference: string;
  expectedVersion: number;
  reasonCode:
    | "owner_review_started"
    | "owner_more_information_requested"
    | "owner_approved_invitation"
    | "owner_declined_application";
}>;

export type ClubsOwnerApplicationReviewData = Readonly<{
  applicantType: "individual" | "family" | "team";
  fullName: string;
  basedIn: string;
  interest: string;
  preferredArrivalWindow: string;
  preferredParticipationLength: string;
  linkedInUrl: string | null;
  socialUrl: string | null;
  profileUrl: string | null;
  motivation: string;
  contribution: string;
}>;

export type ClubsOwnerApplicationInvitationSignals = Readonly<{
  applicationReference: string;
  sourceChannel: ClubsOwnerApplicationSourceChannel;
  referral: null | Readonly<{
    ambassadorSlug: ApprovedAmbassadorSlug;
    ambassadorDisplayName: string;
  }>;
  referralBindingAligned: boolean;
  applicantSummary: Readonly<{
    fullName: string;
    applicantType: "individual" | "family" | "team";
    basedIn: string;
    interest: string;
  }>;
  reviewData: ClubsOwnerApplicationReviewData | null;
  contactEmailMasked: string;
  verifiedEmailBound: boolean;
  state: Exclude<
    ClubsOwnerApplicationInvitationState,
    "reconciliation_required"
  >;
  version: number;
  submittedAt: string;
  updatedAt: string;
  invitationIntentStatus: "none" | "unsent";
  evidenceAmbiguous: boolean;
}>;

export type ClubsOwnerApplicationInvitationItem = Readonly<{
  applicationReference: string;
  sourceChannel: ClubsOwnerApplicationSourceChannel;
  referral: ClubsOwnerApplicationInvitationSignals["referral"];
  applicantSummary: ClubsOwnerApplicationInvitationSignals["applicantSummary"];
  reviewData: ClubsOwnerApplicationReviewData | null;
  contactEmailMasked: string;
  verifiedEmailBound: boolean;
  state: ClubsOwnerApplicationInvitationState;
  version: number;
  submittedAt: string;
  updatedAt: string;
  invitationIntentStatus: "none" | "unsent";
  availableActions: readonly ClubsOwnerApplicationInvitationAction[];
  membershipAuthorityGranted: false;
  propertyAdmissionAuthorityGranted: false;
  bookingAuthorityGranted: false;
  paymentAuthorityGranted: false;
  providerAuthorityGranted: false;
  commissionAuthorityGranted: false;
}>;

const deniedAuthorities = Object.freeze({
  membershipAuthorityGranted: false as const,
  propertyAdmissionAuthorityGranted: false as const,
  bookingAuthorityGranted: false as const,
  paymentAuthorityGranted: false as const,
  providerAuthorityGranted: false as const,
  commissionAuthorityGranted: false as const,
});

function availableActions(
  state: ClubsOwnerApplicationInvitationState,
  approvalBindingReady: boolean,
) {
  if (state === "submitted" || state === "more_information_required") {
    return ["start_review"] as const;
  }
  if (state === "under_review") {
    return approvalBindingReady
      ? ([
          "request_more_information",
          "approve_for_invitation",
          "decline",
        ] as const)
      : (["request_more_information", "decline"] as const);
  }
  return [] as const;
}

export function projectClubsOwnerApplicationInvitationItem(
  signals: ClubsOwnerApplicationInvitationSignals,
): ClubsOwnerApplicationInvitationItem {
  if (
    !/^cclub-owner-application-[a-f0-9]{32}$/.test(
      signals.applicationReference,
    ) ||
    !Number.isInteger(signals.version) ||
    signals.version < 0 ||
    !Number.isFinite(new Date(signals.submittedAt).getTime()) ||
    !Number.isFinite(new Date(signals.updatedAt).getTime()) ||
    (signals.sourceChannel === "direct_web" && signals.referral !== null) ||
    (signals.sourceChannel === "ambassador_referral" &&
      signals.referral === null) ||
    (signals.invitationIntentStatus === "unsent" &&
      signals.state !== "approved_for_invitation")
  ) {
    throw new Error("invalid_owner_application_invitation_projection");
  }
  const state = signals.evidenceAmbiguous
    ? "reconciliation_required"
    : signals.state;
  const approvalBindingReady =
    !signals.evidenceAmbiguous &&
    signals.verifiedEmailBound &&
    signals.referralBindingAligned;
  return {
    applicationReference: signals.applicationReference,
    sourceChannel: signals.sourceChannel,
    referral: signals.referral,
    applicantSummary: signals.applicantSummary,
    reviewData: signals.reviewData,
    contactEmailMasked: signals.contactEmailMasked,
    verifiedEmailBound: signals.verifiedEmailBound,
    state,
    version: signals.version,
    submittedAt: new Date(signals.submittedAt).toISOString(),
    updatedAt: new Date(signals.updatedAt).toISOString(),
    invitationIntentStatus: signals.invitationIntentStatus,
    availableActions: availableActions(state, approvalBindingReady),
    ...deniedAuthorities,
  };
}

export function readyClubsOwnerApplicationInvitation(
  view: "queue" | "detail" | "reconciliation",
  items: readonly ClubsOwnerApplicationInvitationItem[],
  truncated = false,
) {
  if (items.length > CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.maximumItems) {
    throw new Error("owner_application_invitation_limit_exceeded");
  }
  return {
    schema: CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.schema,
    version: CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.version,
    status: "ready" as const,
    view,
    items,
    truncated,
    ...deniedAuthorities,
  };
}

export function unavailableClubsOwnerApplicationInvitation(status: string) {
  return {
    schema: CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.schema,
    version: CLUBS_OWNER_APPLICATION_INVITATION_CONTRACT.version,
    status,
    items: [],
    truncated: false,
    ...deniedAuthorities,
  };
}

export const clubsOwnerApplicationInvitationContractTestApi = {
  availableActions,
};
