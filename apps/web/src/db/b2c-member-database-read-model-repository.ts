import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "member_database_full" | "member_database_finance" | "member_database_studio" | "own_member" | "forbidden";
type DecisionStatus = "ready" | "attention" | "blocked";

type SourceRow = {
  external_entity_type: string;
  external_entity_id: string;
  crays_entity_type: string;
  crays_entity_id: string;
  sync_status: string;
  last_synced_at: Date | null;
  metadata: JsonRecord | null;
};

export type B2cMemberDatabaseRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  memberId: string;
  memberName: string;
  status: string;
  priority: string;
  value: string | number | boolean | null;
  unit: string | null;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type B2cMemberDatabaseReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canViewPaymentDetail: boolean;
    canStageReview: boolean;
  };
  summary: {
    records: number;
    sourceRecords: number;
    members: number;
    activeMembers: number;
    pausedMembers: number;
    trialMembers: number;
    contracts: number;
    invoices: number;
    payments: number;
    failedPayments: number;
    refunds: number;
    cancellations: number;
    chargebacks: number;
    bookings: number;
    checkIns: number;
    supportRequests: number;
    consents: number;
    conflicts: number;
    freshnessMinutes: number | null;
  };
  decisionCards: Array<{
    key: string;
    label: string;
    value: string;
    context: string;
    status: DecisionStatus;
    filterFamily: string;
    searchTerm: string;
  }>;
  records: B2cMemberDatabaseRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stageReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    commandType: "diff_review";
    action: "classify_diff";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    memberAppApiWritesEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    externalSendingEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-b2c-member-database-berlin-mitte-20260712-v1";
const fullRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const studioRoles: RoleKey[] = ["studio-manager", "franchise-partner"];
const financeRoles: RoleKey[] = ["finance"];
const commandRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "studio-manager", "franchise-partner", "finance"];
const financeFamilies = new Set(["membership_contract", "payment_method", "invoice", "member_payment", "failed_payment", "refund_case", "chargeback", "cancellation", "member_profile", "studio"]);
const studioFamilies = new Set(["member_profile", "membership_contract", "course_booking", "check_in", "training_plan", "support_request", "consent_record", "studio", "failed_payment", "refund_case", "cancellation"]);

function accessForRole(role: RoleKey): B2cMemberDatabaseReadModel["access"] {
  if (fullRoles.includes(role)) return { role, allowed: true, level: "member_database_full", reason: "Role can inspect the full B2C member database sample with payment, operations, support and consent lineage.", canViewPaymentDetail: true, canStageReview: commandRoles.includes(role) };
  if (financeRoles.includes(role)) return { role, allowed: true, level: "member_database_finance", reason: "Finance can inspect contracts, invoices, payment methods, payment exceptions, refunds and chargebacks.", canViewPaymentDetail: true, canStageReview: true };
  if (studioRoles.includes(role)) return { role, allowed: true, level: "member_database_studio", reason: "Studio and partner roles can inspect member operating rows and payment exception status for their studio.", canViewPaymentDetail: false, canStageReview: true };
  if (role === "gym-member") return { role, allowed: true, level: "own_member", reason: "Gym Member can inspect only an own-member sample slice.", canViewPaymentDetail: false, canStageReview: false };
  return { role, allowed: false, level: "forbidden", reason: "Role is outside the B2C member database scope.", canViewPaymentDetail: false, canStageReview: false };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function titleCase(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    studio: "Studio snapshot",
    member_profile: "Member profiles",
    membership_contract: "Membership contracts",
    payment_method: "Payment methods",
    invoice: "Invoices",
    member_payment: "Successful payments",
    failed_payment: "Failed payments",
    refund_case: "Refunds",
    cancellation: "Cancellations and pauses",
    chargeback: "Chargebacks",
    course_booking: "Bookings",
    check_in: "Check-ins",
    training_plan: "Training plans",
    support_request: "Support requests",
    consent_record: "Consents",
  };
  return labels[family] ?? titleCase(family);
}

function primaryValue(family: string, fields: JsonRecord) {
  if (["invoice", "member_payment", "failed_payment", "refund_case", "chargeback"].includes(family)) return fields.amountGross as number | null | undefined;
  if (family === "member_profile") return fields.membershipStatus as string | null | undefined;
  if (family === "payment_method") return fields.paymentMethodStatus as string | null | undefined;
  if (family === "course_booking") return fields.bookingStatus as string | null | undefined;
  if (family === "check_in") return fields.accessStatus as string | null | undefined;
  if (family === "training_plan") return fields.planStatus as string | null | undefined;
  if (family === "support_request") return fields.supportStatus as string | null | undefined;
  if (family === "consent_record") return fields.consentStatus as string | null | undefined;
  if (family === "studio") return fields.membersActive as number | null | undefined;
  return null;
}

function valueUnit(family: string) {
  if (["invoice", "member_payment", "failed_payment", "refund_case", "chargeback"].includes(family)) return "EUR";
  if (family === "studio") return "members";
  return null;
}

function statusFor(family: string, fields: JsonRecord, fallback: string) {
  if (family === "member_profile" || family === "membership_contract") return text(fields.membershipStatus, fallback);
  if (family === "payment_method") return text(fields.paymentMethodStatus, fallback);
  if (family === "invoice") return text(fields.invoiceStatus, fallback);
  if (family === "member_payment" || family === "failed_payment" || family === "chargeback") return text(fields.paymentStatus, fallback);
  if (family === "refund_case") return text(fields.refundStatus, fallback);
  if (family === "cancellation") return text(fields.cancellationStatus, fallback);
  if (family === "course_booking") return text(fields.bookingStatus, fallback);
  if (family === "check_in") return text(fields.accessStatus, fallback);
  if (family === "training_plan") return text(fields.planStatus, fallback);
  if (family === "support_request") return text(fields.supportStatus, fallback);
  if (family === "consent_record") return text(fields.consentStatus, fallback);
  if (family === "studio") return text(fields.studioStatus, fallback);
  return fallback;
}

function hrefFor(family: string, role: RoleKey) {
  const encodedRole = encodeURIComponent(role);
  if (["invoice", "member_payment", "failed_payment", "refund_case", "chargeback", "payment_method"].includes(family)) return `/erp?role=${encodedRole}&view=payment-exceptions`;
  if (["course_booking", "check_in", "training_plan", "support_request"].includes(family)) return `/operations?role=${encodedRole}&view=members`;
  if (family === "membership_contract") return `/operations?role=${encodedRole}&view=members&record=contracts`;
  return `/operations?role=${encodedRole}&view=members`;
}

function mapRecord(row: SourceRow, role: RoleKey): B2cMemberDatabaseRecord {
  const fields = asRecord(row.metadata?.fields);
  const family = row.external_entity_type;
  const memberName = text(fields.memberName, text(row.metadata?.label, "Studio"));
  return {
    id: `${family}:${row.external_entity_id}`,
    family,
    label: text(row.metadata?.label, row.external_entity_id),
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    memberId: text(fields.memberId, row.crays_entity_id),
    memberName,
    status: statusFor(family, fields, row.sync_status),
    priority: row.sync_status === "conflict" ? "high" : "normal",
    value: primaryValue(family, fields) ?? null,
    unit: valueUnit(family),
    nextAction: text(fields.nextAction, "Review member database record."),
    href: hrefFor(family, role),
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function visibleFor(record: B2cMemberDatabaseRecord, access: B2cMemberDatabaseReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "member_database_full") return true;
  if (access.level === "member_database_finance") return financeFamilies.has(record.family);
  if (access.level === "member_database_studio") return studioFamilies.has(record.family);
  if (access.level === "own_member") return record.memberId === "member_app_member_1001" || record.craysEntityId.includes("member_1001");
  return false;
}

function empty(role: RoleKey, access: B2cMemberDatabaseReadModel["access"], queryStatus: B2cMemberDatabaseReadModel["queryStatus"]): B2cMemberDatabaseReadModel {
  return {
    access,
    summary: { records: 0, sourceRecords: 0, members: 0, activeMembers: 0, pausedMembers: 0, trialMembers: 0, contracts: 0, invoices: 0, payments: 0, failedPayments: 0, refunds: 0, cancellations: 0, chargebacks: 0, bookings: 0, checkIns: 0, supportRequests: 0, consents: 0, conflicts: 0, freshnessMinutes: null },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], sourceBacked: true, roleScoped: true },
    actions: { stageReviewAllowed: access.canStageReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", commandType: "diff_review", action: "classify_diff", applyGate: "OPEN_DEV_SYNC_APPLY" },
    boundaries: { memberAppApiWritesEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, targetApplyEnabled: false, paymentInitiationEnabled: false, financePostingEnabled: false, externalSendingEnabled: false, liveAiEnabled: false, secretsReturned: false, privateKeysReturned: false },
    queryStatus,
  };
}

function countFamily(records: B2cMemberDatabaseRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function buildDecisionCards(records: B2cMemberDatabaseRecord[]): B2cMemberDatabaseReadModel["decisionCards"] {
  const members = records.filter((record) => record.family === "member_profile");
  const activeMembers = members.filter((record) => record.status === "active").length;
  const failedPayments = records.filter((record) => ["failed_payment", "chargeback"].includes(record.family)).length;
  const refunds = countFamily(records, "refund_case") + countFamily(records, "cancellation");
  const bookings = countFamily(records, "course_booking");
  const support = countFamily(records, "support_request");
  const cards: B2cMemberDatabaseReadModel["decisionCards"] = [
    { key: "member-base", label: "Member profiles", value: String(members.length), context: `${activeMembers} active sample members in the Berlin Mitte database slice.`, status: members.length >= 20 ? "ready" : "attention", filterFamily: "member_profile", searchTerm: "" },
    { key: "payment-exceptions", label: "Payment exceptions", value: String(failedPayments), context: "Failed payments and chargeback cases are review-only; payment initiation stays closed.", status: failedPayments > 0 ? "attention" : "ready", filterFamily: "failed_payment|chargeback", searchTerm: "" },
    { key: "refunds-cancellations", label: "Refunds and cancellations", value: String(refunds), context: "Refund, cancellation and pause records connect to Finance and support recovery.", status: refunds > 0 ? "attention" : "ready", filterFamily: "refund_case|cancellation", searchTerm: "" },
    { key: "bookings-checkins", label: "Bookings", value: String(bookings), context: "Course bookings support capacity, attendance and late-cancellation workflows.", status: bookings >= 30 ? "ready" : "attention", filterFamily: "course_booking", searchTerm: "" },
    { key: "support-consent", label: "Support requests", value: String(support), context: "Support rows include payment, refund, pause and training-plan recovery cases.", status: support > 0 ? "attention" : "ready", filterFamily: "support_request", searchTerm: "" },
  ];
  return cards.filter((card) => Number(card.value) > 0);
}

export async function getB2cMemberDatabaseReadModel(role: RoleKey): Promise<B2cMemberDatabaseReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const result = await getCorePgPool().query<SourceRow>(
    `
      select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
      from crays_core.external_record_maps
      where external_system = 'member-app'
        and metadata -> 'fields' ->> 'seedBatch' = $1
      order by external_entity_type, external_entity_id
    `,
    [seedBatch],
  );

  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords
    .filter((record) => visibleFor(record, access))
    .sort((a, b) => a.family.localeCompare(b.family) || a.memberName.localeCompare(b.memberName));
  const latest = records
    .map((record) => (record.lastSyncedAt ? new Date(record.lastSyncedAt).getTime() : 0))
    .filter((time) => time > 0)
    .sort((a, b) => b - a)[0];
  const freshnessMinutes = latest ? Math.max(0, Math.round((Date.now() - latest) / 60_000)) : null;
  const families = [...new Set(records.map((record) => record.family))];
  const statuses = [...new Set(records.map((record) => record.status).filter(Boolean))];
  const memberProfiles = records.filter((record) => record.family === "member_profile");

  return {
    ...empty(role, access, "schema_ready"),
    summary: {
      records: records.length,
      sourceRecords: result.rowCount ?? result.rows.length,
      members: memberProfiles.length,
      activeMembers: memberProfiles.filter((record) => record.status === "active").length,
      pausedMembers: memberProfiles.filter((record) => record.status === "paused").length,
      trialMembers: memberProfiles.filter((record) => record.status === "trial").length,
      contracts: countFamily(records, "membership_contract"),
      invoices: countFamily(records, "invoice"),
      payments: countFamily(records, "member_payment"),
      failedPayments: countFamily(records, "failed_payment"),
      refunds: countFamily(records, "refund_case"),
      cancellations: countFamily(records, "cancellation"),
      chargebacks: countFamily(records, "chargeback"),
      bookings: countFamily(records, "course_booking"),
      checkIns: countFamily(records, "check_in"),
      supportRequests: countFamily(records, "support_request"),
      consents: countFamily(records, "consent_record"),
      conflicts: records.filter((record) => record.priority === "high").length,
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(records),
    records,
    controls: {
      families: families.map((family) => ({ key: family, label: familyLabel(family), rows: records.filter((record) => record.family === family).length })),
      statuses: statuses.map((status) => ({ key: status, label: titleCase(status), rows: records.filter((record) => record.status === status).length })),
      sourceBacked: true,
      roleScoped: true,
    },
  };
}
