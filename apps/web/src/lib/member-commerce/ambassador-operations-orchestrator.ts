import { createHash, randomUUID } from "node:crypto";

export type AmbassadorOperationsState = Readonly<{
  paperwork: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  erp: "NOT_REQUESTED" | "PENDING" | "READY" | "BLOCKED";
  sponsor: "NONE" | "PROPOSED" | "CONFIRMED" | "REVOKED";
  management: "NONE" | "PROPOSED" | "APPROVED" | "SUSPENDED";
  admission: "NONE" | "SUBMITTED" | "PREQUALIFIED" | "REJECTED" | "TEAM_APPROVED" | "TEAM_DECLINED";
  booking: "NONE" | "PROPOSED" | "CONFIRMED" | "REJECTED";
  payment: "PENDING" | "READY" | "BLOCKED" | "SETTLED";
  audit: "NOT_STARTED" | "OPEN" | "PASSED" | "FAILED";
  aggregateVersion: number;
  lastEventId?: string;
}>;

export type AmbassadorOperationsEventKind =
  | "PAPERWORK_SUBMITTED" | "PAPERWORK_APPROVED" | "PAPERWORK_REJECTED"
  | "ERP_PROFILE_REQUESTED" | "ERP_PROFILE_READY" | "ERP_PROFILE_BLOCKED"
  | "SPONSOR_ASSIGNMENT_PROPOSED" | "SPONSOR_ASSIGNMENT_CONFIRMED" | "SPONSOR_ASSIGNMENT_REVOKED"
  | "MANAGEMENT_SCOPE_PROPOSED" | "MANAGEMENT_SCOPE_APPROVED" | "MANAGEMENT_SCOPE_SUSPENDED"
  | "ADMISSION_REFERRAL_SUBMITTED" | "ADMISSION_PREQUALIFIED" | "ADMISSION_REJECTED"
  | "ADMISSION_TEAM_APPROVED" | "ADMISSION_TEAM_DECLINED"
  | "BOOKING_ATTRIBUTION_PROPOSED" | "BOOKING_ATTRIBUTION_CONFIRMED" | "BOOKING_ATTRIBUTION_REJECTED"
  | "PAYMENT_ELIGIBILITY_PENDING" | "PAYMENT_ELIGIBILITY_READY" | "PAYMENT_ELIGIBILITY_BLOCKED"
  | "PAYMENT_SETTLED" | "AUDIT_REVIEW_OPENED" | "AUDIT_REVIEW_PASSED" | "AUDIT_REVIEW_FAILED";

export type AmbassadorOperationsEvent = Readonly<{
  id: string;
  tenantId: string;
  projectKey: string;
  franchiseKey: string;
  locationKey: string;
  ambassadorId: string;
  eventKind: AmbassadorOperationsEventKind;
  authorityKind: "AMBASSADOR" | "CRAYS_TEAM" | "SYSTEM" | "ERP" | "PAYMENT_PROVIDER";
  actorReference: string;
  sourceEventId: string;
  subjectReference?: string;
  evidenceHash: string;
  effectiveAt: Date;
}>;

export const initialAmbassadorOperationsState: AmbassadorOperationsState = {
  paperwork: "DRAFT",
  erp: "NOT_REQUESTED",
  sponsor: "NONE",
  management: "NONE",
  admission: "NONE",
  booking: "NONE",
  payment: "PENDING",
  audit: "NOT_STARTED",
  aggregateVersion: 0,
};

function reject(event: AmbassadorOperationsEvent, reason: string): never {
  throw new Error(`AMBASSADOR_TRANSITION_REJECTED:${event.eventKind}:${reason}`);
}

function requireFinalTeamAuthority(event: AmbassadorOperationsEvent): void {
  if (event.authorityKind !== "CRAYS_TEAM") reject(event, "FINAL_DECISION_REQUIRES_CRAYS_TEAM");
}

export function reduceAmbassadorOperations(
  current: AmbassadorOperationsState,
  event: AmbassadorOperationsEvent,
): AmbassadorOperationsState {
  let next: AmbassadorOperationsState = { ...current };
  switch (event.eventKind) {
    case "PAPERWORK_SUBMITTED":
      if (!(["DRAFT", "REJECTED"] as const).includes(current.paperwork as "DRAFT" | "REJECTED")) {
        reject(event, "PAPERWORK_NOT_SUBMITTABLE");
      }
      next = { ...next, paperwork: "SUBMITTED" };
      break;
    case "PAPERWORK_APPROVED":
      if (current.paperwork !== "SUBMITTED") reject(event, "PAPERWORK_NOT_SUBMITTED");
      next = { ...next, paperwork: "APPROVED" };
      break;
    case "PAPERWORK_REJECTED":
      if (current.paperwork !== "SUBMITTED") reject(event, "PAPERWORK_NOT_SUBMITTED");
      next = { ...next, paperwork: "REJECTED" };
      break;
    case "ERP_PROFILE_REQUESTED":
      if (current.paperwork !== "APPROVED") reject(event, "PAPERWORK_NOT_APPROVED");
      next = { ...next, erp: "PENDING" };
      break;
    case "ERP_PROFILE_READY":
      if (current.erp !== "PENDING") reject(event, "ERP_NOT_PENDING");
      next = { ...next, erp: "READY" };
      break;
    case "ERP_PROFILE_BLOCKED":
      if (!(["PENDING", "READY"] as const).includes(current.erp as "PENDING" | "READY")) reject(event, "ERP_NOT_ACTIVE");
      next = { ...next, erp: "BLOCKED", payment: "BLOCKED" };
      break;
    case "SPONSOR_ASSIGNMENT_PROPOSED":
      if (!(["NONE", "REVOKED"] as const).includes(current.sponsor as "NONE" | "REVOKED")) reject(event, "SPONSOR_ALREADY_ACTIVE");
      next = { ...next, sponsor: "PROPOSED" };
      break;
    case "SPONSOR_ASSIGNMENT_CONFIRMED":
      if (current.sponsor !== "PROPOSED") reject(event, "SPONSOR_NOT_PROPOSED");
      next = { ...next, sponsor: "CONFIRMED" };
      break;
    case "SPONSOR_ASSIGNMENT_REVOKED":
      if (current.sponsor !== "CONFIRMED") reject(event, "SPONSOR_NOT_CONFIRMED");
      next = { ...next, sponsor: "REVOKED" };
      break;
    case "MANAGEMENT_SCOPE_PROPOSED":
      if (!(["NONE", "SUSPENDED"] as const).includes(current.management as "NONE" | "SUSPENDED")) reject(event, "MANAGEMENT_ALREADY_ACTIVE");
      next = { ...next, management: "PROPOSED" };
      break;
    case "MANAGEMENT_SCOPE_APPROVED":
      if (current.management !== "PROPOSED") reject(event, "MANAGEMENT_NOT_PROPOSED");
      next = { ...next, management: "APPROVED" };
      break;
    case "MANAGEMENT_SCOPE_SUSPENDED":
      if (current.management !== "APPROVED") reject(event, "MANAGEMENT_NOT_APPROVED");
      next = { ...next, management: "SUSPENDED" };
      break;
    case "ADMISSION_REFERRAL_SUBMITTED":
      if (current.admission !== "NONE") reject(event, "ADMISSION_ALREADY_EXISTS");
      next = { ...next, admission: "SUBMITTED" };
      break;
    case "ADMISSION_PREQUALIFIED":
      if (current.admission !== "SUBMITTED") reject(event, "ADMISSION_NOT_SUBMITTED");
      if (!(["AMBASSADOR", "CRAYS_TEAM"] as const).includes(
        event.authorityKind as "AMBASSADOR" | "CRAYS_TEAM",
      )) reject(event, "INVALID_PREQUALIFICATION_AUTHORITY");
      next = { ...next, admission: "PREQUALIFIED" };
      break;
    case "ADMISSION_REJECTED":
      if (!(["SUBMITTED", "PREQUALIFIED"] as const).includes(
        current.admission as "SUBMITTED" | "PREQUALIFIED",
      )) reject(event, "ADMISSION_NOT_REVIEWABLE");
      next = { ...next, admission: "REJECTED" };
      break;
    case "ADMISSION_TEAM_APPROVED":
      requireFinalTeamAuthority(event);
      if (!(["SUBMITTED", "PREQUALIFIED"] as const).includes(
        current.admission as "SUBMITTED" | "PREQUALIFIED",
      )) reject(event, "ADMISSION_NOT_REVIEWABLE");
      next = { ...next, admission: "TEAM_APPROVED" };
      break;
    case "ADMISSION_TEAM_DECLINED":
      requireFinalTeamAuthority(event);
      if (!(["SUBMITTED", "PREQUALIFIED"] as const).includes(
        current.admission as "SUBMITTED" | "PREQUALIFIED",
      )) reject(event, "ADMISSION_NOT_REVIEWABLE");
      next = { ...next, admission: "TEAM_DECLINED" };
      break;
    case "BOOKING_ATTRIBUTION_PROPOSED":
      if (current.booking !== "NONE") reject(event, "BOOKING_ATTRIBUTION_ALREADY_EXISTS");
      next = { ...next, booking: "PROPOSED" };
      break;
    case "BOOKING_ATTRIBUTION_CONFIRMED":
      if (current.booking !== "PROPOSED") reject(event, "BOOKING_ATTRIBUTION_NOT_PROPOSED");
      next = { ...next, booking: "CONFIRMED" };
      break;
    case "BOOKING_ATTRIBUTION_REJECTED":
      if (current.booking !== "PROPOSED") reject(event, "BOOKING_ATTRIBUTION_NOT_PROPOSED");
      next = { ...next, booking: "REJECTED" };
      break;
    case "PAYMENT_ELIGIBILITY_PENDING":
      next = { ...next, payment: "PENDING" };
      break;
    case "PAYMENT_ELIGIBILITY_READY":
      if (current.paperwork !== "APPROVED" || current.erp !== "READY" || current.booking !== "CONFIRMED") {
        reject(event, "PAYMENT_PREREQUISITES_NOT_READY");
      }
      next = { ...next, payment: "READY" };
      break;
    case "PAYMENT_ELIGIBILITY_BLOCKED":
      next = { ...next, payment: "BLOCKED" };
      break;
    case "PAYMENT_SETTLED":
      if (current.payment !== "READY") reject(event, "PAYMENT_NOT_READY");
      next = { ...next, payment: "SETTLED" };
      break;
    case "AUDIT_REVIEW_OPENED":
      if (!(["NOT_STARTED", "FAILED"] as const).includes(current.audit as "NOT_STARTED" | "FAILED")) reject(event, "AUDIT_NOT_OPENABLE");
      next = { ...next, audit: "OPEN" };
      break;
    case "AUDIT_REVIEW_PASSED":
      if (current.audit !== "OPEN") reject(event, "AUDIT_NOT_OPEN");
      next = { ...next, audit: "PASSED" };
      break;
    case "AUDIT_REVIEW_FAILED":
      if (current.audit !== "OPEN") reject(event, "AUDIT_NOT_OPEN");
      next = { ...next, audit: "FAILED" };
      break;
  }
  return { ...next, aggregateVersion: current.aggregateVersion + 1, lastEventId: event.id };
}

export type AmbassadorNotificationIntent = Readonly<{
  id: string;
  audienceKind: "AMBASSADOR" | "OWNER_AUDIT";
  recipientReference: string;
  channelKind: "INTERNAL_AUDIT";
  templateKind: string;
  contentHash: string;
  state: "PREPARED_NOT_SENT";
}>;

export function prepareDualConfirmationIntents(input: Readonly<{
  event: AmbassadorOperationsEvent;
  ambassadorRecipientReference: string;
  ownerAuditRecipientReference: string;
  templateKind: string;
  content: Readonly<Record<string, unknown>>;
}>): readonly AmbassadorNotificationIntent[] {
  const contentHash = createHash("sha256").update(JSON.stringify({
    eventId: input.event.id,
    templateKind: input.templateKind,
    content: input.content,
  })).digest("hex");
  return [
    {
      id: randomUUID(),
      audienceKind: "AMBASSADOR",
      recipientReference: input.ambassadorRecipientReference,
      channelKind: "INTERNAL_AUDIT",
      templateKind: input.templateKind,
      contentHash,
      state: "PREPARED_NOT_SENT",
    },
    {
      id: randomUUID(),
      audienceKind: "OWNER_AUDIT",
      recipientReference: input.ownerAuditRecipientReference,
      channelKind: "INTERNAL_AUDIT",
      templateKind: input.templateKind,
      contentHash,
      state: "PREPARED_NOT_SENT",
    },
  ];
}
