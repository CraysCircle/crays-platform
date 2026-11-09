import {
  getApprovedAmbassador,
  isApprovedAmbassadorSlug,
  type ApprovedAmbassadorSlug,
} from "@/lib/clubs/public-ambassador-registry";

export const CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT = {
  schema: "crays.clubs.member-ambassador-application-status.v1",
  version: "1.2.0",
  endpoint: "/api/crays/clubs/member/ambassador-application/status",
  cache: "no-store",
  method: "GET",
  authentication: "clubs_member_account_required",
  attributionEvidence:
    "immutable_account_bound_public_ambassador_referral_attribution_receipt",
  reservedUnclaimableState: "attribution_pending_reconciliation",
  states: [
    "no_application",
    "application_received",
    "review_pending",
    "attributed",
    "ambassador_review",
    "more_information_required",
    "team_review",
    "not_recommended",
    "approved",
    "team_go_issued",
    "declined",
    "withdrawn",
    "reconciliation_required",
  ],
  lifecycleEvidence: {
    ambassadorReview: "0260_immutable_recommendation_receipt",
    teamPersonReview: "0261_immutable_person_review_receipt",
    canonicalDecision: "0251_immutable_person_decision_evidence",
    teamGo: "0251_immutable_team_go_evidence",
    ambiguity: "reconciliation_required",
    optimisticApprovalForbidden: true,
  },
  exposedFields: [
    "schema",
    "version",
    "status",
    "state",
    "applicationStatus",
    "submittedAt",
    "statusUpdatedAt",
    "ambassador.slug",
    "ambassador.displayName",
  ],
  deniedFields: [
    "email",
    "applicationId",
    "accountId",
    "receiptId",
    "digest",
    "subject",
    "session",
    "commission",
    "payment",
    "entitlement",
    "teamGo",
    "reviewReference",
    "personReference",
    "decisionPayload",
    "count",
  ],
  deniedAuthorities: {
    membershipCreated: false,
    paymentAuthorityGranted: false,
    providerAuthorityGranted: false,
    commissionAuthorityGranted: false,
  },
} as const;

export type MemberAmbassadorApplicationState =
  | "no_application"
  | "application_received"
  | "review_pending"
  | "attributed"
  | "ambassador_review"
  | "more_information_required"
  | "team_review"
  | "not_recommended"
  | "approved"
  | "team_go_issued"
  | "declined"
  | "withdrawn"
  | "reconciliation_required";

export type MemberAmbassadorApplicationLifecycleStatus =
  | "submitted"
  | "under_review"
  | "ambassador_review"
  | "more_information_required"
  | "team_review"
  | "not_recommended"
  | "approved"
  | "team_go_issued"
  | "declined"
  | "withdrawn"
  | "reconciliation_required";

export type MemberAmbassadorApplicationAmbassadorCommand =
  | "start_ambassador_review"
  | "request_more_information"
  | "recommend_for_team_review"
  | "do_not_recommend";

export type MemberAmbassadorApplicationTeamCommand =
  | "request_more_information"
  | "approve"
  | "decline";

export type MemberAmbassadorApplicationCanonicalOutcome =
  | "more_information_required"
  | "approved_for_membership_payment"
  | "declined";

export type MemberAmbassadorApplicationStatusProjectionInput = Readonly<{
  applicationStatus: string;
  applicationUpdatedAt: Date | string;
  attributedAt: Date | string | null;
  ambassadorSlug: string | null;
  submittedAt: Date | string;
  attributionAmbiguous: boolean;
  lifecycleAmbiguous: boolean;
  ambassadorCommand: MemberAmbassadorApplicationAmbassadorCommand | null;
  ambassadorReceiptAligned: boolean;
  teamCommand: MemberAmbassadorApplicationTeamCommand | null;
  canonicalOutcome: MemberAmbassadorApplicationCanonicalOutcome | null;
  teamDecisionAligned: boolean;
  teamGoIssued: boolean;
  teamGoAligned: boolean;
  lifecycleUpdatedAt: Date | string | null;
}>;

export type MemberAmbassadorApplicationStatusResponse = Readonly<{
  schema: typeof CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.schema;
  version: typeof CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.version;
  status: "ready";
  state: MemberAmbassadorApplicationState;
  applicationStatus: MemberAmbassadorApplicationLifecycleStatus | null;
  submittedAt: string | null;
  statusUpdatedAt: string | null;
  ambassador: Readonly<{
    slug: ApprovedAmbassadorSlug;
    displayName: string;
  }> | null;
  membershipCreated: false;
  paymentAuthorityGranted: false;
  providerAuthorityGranted: false;
  commissionAuthorityGranted: false;
}>;

export type MemberAmbassadorApplicationStatusUnavailableResponse = Readonly<{
  schema: typeof CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.schema;
  version: typeof CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.version;
  status: "temporarily_unavailable";
  state: null;
  applicationStatus: null;
  submittedAt: null;
  statusUpdatedAt: null;
  ambassador: null;
  membershipCreated: false;
  paymentAuthorityGranted: false;
  providerAuthorityGranted: false;
  commissionAuthorityGranted: false;
}>;

export class MemberAmbassadorApplicationStatusProjectionError extends Error {
  constructor() {
    super("member_ambassador_application_status_projection_invalid");
    this.name = "MemberAmbassadorApplicationStatusProjectionError";
  }
}

const APPLICATION_STATUSES = new Set<MemberAmbassadorApplicationLifecycleStatus>([
  "submitted",
  "under_review",
  "ambassador_review",
  "more_information_required",
  "team_review",
  "not_recommended",
  "approved",
  "team_go_issued",
  "declined",
  "withdrawn",
  "reconciliation_required",
]);

function lifecycleStatus(
  value: string,
): MemberAmbassadorApplicationLifecycleStatus {
  if (!APPLICATION_STATUSES.has(value as MemberAmbassadorApplicationLifecycleStatus)) {
    throw new MemberAmbassadorApplicationStatusProjectionError();
  }
  return value as MemberAmbassadorApplicationLifecycleStatus;
}

function isoTimestamp(value: Date | string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new MemberAmbassadorApplicationStatusProjectionError();
  }
  return parsed.toISOString();
}

function reconciliationRequired() {
  return {
    state: "reconciliation_required" as const,
    applicationStatus: "reconciliation_required" as const,
  };
}

function lifecycleFor(
  input: MemberAmbassadorApplicationStatusProjectionInput,
  attributed: boolean,
) {
  if (input.attributionAmbiguous || input.lifecycleAmbiguous) {
    return reconciliationRequired();
  }
  if (input.teamGoIssued) {
    if (
      !input.teamGoAligned ||
      !input.teamDecisionAligned ||
      !input.ambassadorReceiptAligned ||
      input.ambassadorCommand !== "recommend_for_team_review" ||
      input.teamCommand !== "approve" ||
      input.canonicalOutcome !== "approved_for_membership_payment"
    ) {
      return reconciliationRequired();
    }
    return {
      state: "team_go_issued" as const,
      applicationStatus: "team_go_issued" as const,
    };
  }
  if (input.teamCommand !== null || input.canonicalOutcome !== null) {
    if (
      !input.teamDecisionAligned ||
      !input.ambassadorReceiptAligned ||
      input.ambassadorCommand !== "recommend_for_team_review" ||
      input.teamCommand === null ||
      input.canonicalOutcome === null
    ) {
      return reconciliationRequired();
    }
    if (
      input.teamCommand === "approve" &&
      input.canonicalOutcome === "approved_for_membership_payment"
    ) {
      return {
        state: "approved" as const,
        applicationStatus: "approved" as const,
      };
    }
    if (
      input.teamCommand === "decline" &&
      input.canonicalOutcome === "declined"
    ) {
      return {
        state: "declined" as const,
        applicationStatus: "declined" as const,
      };
    }
    if (
      input.teamCommand === "request_more_information" &&
      input.canonicalOutcome === "more_information_required"
    ) {
      return {
        state: "more_information_required" as const,
        applicationStatus: "more_information_required" as const,
      };
    }
    return reconciliationRequired();
  }
  if (input.ambassadorCommand !== null) {
    if (!input.ambassadorReceiptAligned) return reconciliationRequired();
    if (input.ambassadorCommand === "start_ambassador_review") {
      return {
        state: "ambassador_review" as const,
        applicationStatus: "ambassador_review" as const,
      };
    }
    if (input.ambassadorCommand === "request_more_information") {
      return {
        state: "more_information_required" as const,
        applicationStatus: "more_information_required" as const,
      };
    }
    if (input.ambassadorCommand === "recommend_for_team_review") {
      return {
        state: "team_review" as const,
        applicationStatus: "team_review" as const,
      };
    }
    return {
      state: "not_recommended" as const,
      applicationStatus: "not_recommended" as const,
    };
  }

  const sourceStatus = input.applicationStatus;
  if (sourceStatus === "withdrawn") {
    return {
      state: "withdrawn" as const,
      applicationStatus: "withdrawn" as const,
    };
  }
  if (sourceStatus === "not_recommended") {
    return {state: "not_recommended" as const, applicationStatus: "not_recommended" as const};
  }
  if (sourceStatus === "declined") {
    return {
      state: "declined" as const,
      applicationStatus: "declined" as const,
    };
  }
  if (sourceStatus === "more_information_required") {
    return {
      state: "more_information_required" as const,
      applicationStatus: "more_information_required" as const,
    };
  }
  if (sourceStatus === "under_review") {
    return {
      state: "review_pending" as const,
      applicationStatus: "under_review" as const,
    };
  }
  if (sourceStatus === "ambassador_review") {
    return {
      state: "ambassador_review" as const,
      applicationStatus: "ambassador_review" as const,
    };
  }
  if (sourceStatus === "assigned") {
    return {
      state: "review_pending" as const,
      applicationStatus: "under_review" as const,
    };
  }
  if (["recommended", "team_review", "approved"].includes(sourceStatus)) {
    return reconciliationRequired();
  }
  if (sourceStatus === "submitted") {
    return {
      state: attributed ? ("attributed" as const) : ("application_received" as const),
      applicationStatus: "submitted" as const,
    };
  }
  return reconciliationRequired();
}

export function projectMemberAmbassadorApplicationStatus(
  input: MemberAmbassadorApplicationStatusProjectionInput | null,
): MemberAmbassadorApplicationStatusResponse {
  const base = {
    schema: CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.schema,
    version: CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.version,
    status: "ready" as const,
  };
  if (!input) {
    return Object.freeze({
      ...base,
      state: "no_application",
      applicationStatus: null,
      submittedAt: null,
      statusUpdatedAt: null,
      ambassador: null,
      ...CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.deniedAuthorities,
    });
  }

  const attributed = input.ambassadorSlug !== null || input.attributedAt !== null;
  const attributionAligned =
    !input.attributionAmbiguous &&
    (!attributed ||
      (input.ambassadorSlug !== null &&
        input.attributedAt !== null &&
        isApprovedAmbassadorSlug(input.ambassadorSlug)));
  const profile = input.ambassadorSlug
    && attributionAligned
    ? getApprovedAmbassador(input.ambassadorSlug as ApprovedAmbassadorSlug)
    : null;
  const lifecycle = attributionAligned
    ? lifecycleFor(input, attributed)
    : reconciliationRequired();
  lifecycleStatus(lifecycle.applicationStatus);

  return Object.freeze({
    ...base,
    ...lifecycle,
    submittedAt: isoTimestamp(input.submittedAt),
    statusUpdatedAt: isoTimestamp(
      input.lifecycleUpdatedAt ?? input.applicationUpdatedAt,
    ),
    ambassador: profile
      ? Object.freeze({
          slug: profile.slug as ApprovedAmbassadorSlug,
          displayName: profile.name,
        })
      : null,
    ...CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.deniedAuthorities,
  });
}

export function unavailableMemberAmbassadorApplicationStatus(): MemberAmbassadorApplicationStatusUnavailableResponse {
  return Object.freeze({
    schema: CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.schema,
    version: CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.version,
    status: "temporarily_unavailable",
    state: null,
    applicationStatus: null,
    submittedAt: null,
    statusUpdatedAt: null,
    ambassador: null,
    ...CLUBS_MEMBER_AMBASSADOR_APPLICATION_STATUS_CONTRACT.deniedAuthorities,
  });
}
