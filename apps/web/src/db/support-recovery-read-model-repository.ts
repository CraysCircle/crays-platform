import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "support_control" | "finance_scoped" | "member_self" | "release_blocked" | "forbidden";
type CardStatus = "ready" | "attention" | "blocked";
type SourceRow = { external_entity_type: string; external_entity_id: string; crays_entity_type: string; crays_entity_id: string; sync_status: string; last_synced_at: Date | null; metadata: JsonRecord | null };

export type SupportRecoveryRecord = {
  id: string; family: string; label: string; craysEntityType: string; craysEntityId: string; status: string; priority: string; owner: string; audience: string;
  value: string | number | boolean | null; unit: string | null; context: string; currentState: string; nextAction: string; dueDate: string | null;
  caseId: string | null; identifier: string | null; memberId: string | null; memberName: string | null; caseType: string | null; href: string; lastSyncedAt: string | null; fields: JsonRecord;
};
export type SupportRecoveryReadModel = {
  access: { role: RoleKey; allowed: boolean; level: AccessLevel; reason: string; canStageRecovery: boolean; canViewPaymentContext: boolean; canViewInternalEvidence: boolean };
  supportContext: { studioId: string; studioName: string; partnerCompany: string; journey: string; ownMemberId: string | null };
  summary: { records: number; sourceRecords: number; linkedMemberRecords: number; linkedPaymentRecoveryRecords: number; linkedOperationsRecoveryRecords: number; linkedOpeningProjectRecords: number; cases: number; slaEvents: number; memberContexts: number; paymentContexts: number; evidenceLinks: number; recoveryActions: number; breached: number; blockers: number; critical: number; amountAtRisk: number; freshnessMinutes: number | null };
  cards: Array<{ key: string; label: string; value: string; context: string; status: CardStatus; filterFamily: string }>;
  records: SupportRecoveryRecord[];
  controls: { families: Array<{ key: string; label: string; rows: number }>; statuses: Array<{ key: string; label: string; rows: number }>; priorities: Array<{ key: string; label: string; rows: number }>; owners: Array<{ key: string; label: string; rows: number }>; caseTypes: Array<{ key: string; label: string; rows: number }>; sourceBacked: true; roleScoped: true };
  actions: { stageRecoveryAllowed: boolean; commandRoute: "/api/crays/operations/studio-workbench/command-draft"; confirmationHeader: "stage-studio-operations-command"; applyGate: "OPEN_DEV_OPERATIONS_ACTION_APPLY" };
  boundaries: { externalSendingEnabled: false; refundExecutionEnabled: false; paymentInitiationEnabled: false; financePostingEnabled: false; uploadsEnabled: false; privatePreviewEnabled: false; sourceWritesEnabled: false; syncApplyEnabled: false; toolApplyEnabled: false; stakeholderReleaseEnabled: false; liveAiEnabled: false; secretsReturned: false; privateKeysReturned: false };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-support-recovery-20260713-v1";
const memberBatch = "crays-b2c-member-database-berlin-mitte-20260712-v1";
const paymentBatch = "crays-member-payment-recovery-20260712-v1";
const operationsBatch = "crays-studio-operations-recovery-20260712-v1";
const openingBatch = "crays-opening-project-20260713-v1";
const fullRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "studio-manager"];
const blockedRoles: RoleKey[] = ["guest", "franchise-candidate", "bank-partner", "landlord", "vendor", "investor", "hr", "franchise-partner", "expansion-manager", "deal-manager"];

function accessForRole(role: RoleKey): SupportRecoveryReadModel["access"] {
  if (fullRoles.includes(role)) return { role, allowed: true, level: "support_control", reason: "Role can inspect studio support cases, SLA, scoped member/payment context, evidence and guarded recovery actions.", canStageRecovery: ["admin", "crays-management", "studio-manager"].includes(role), canViewPaymentContext: true, canViewInternalEvidence: true };
  if (role === "finance") return { role, allowed: true, level: "finance_scoped", reason: "Finance can inspect payment/refund/chargeback cases, linked evidence and finance-owned recovery actions.", canStageRecovery: true, canViewPaymentContext: true, canViewInternalEvidence: true };
  if (role === "gym-member") return { role, allowed: true, level: "member_self", reason: "Member can inspect only the own support case and safe status context; internal evidence, other members and recovery commands remain hidden.", canStageRecovery: false, canViewPaymentContext: false, canViewInternalEvidence: false };
  if (blockedRoles.includes(role)) return { role, allowed: false, level: "release_blocked", reason: "This role has no released Support Recovery scope.", canStageRecovery: false, canViewPaymentContext: false, canViewInternalEvidence: false };
  return { role, allowed: false, level: "forbidden", reason: "Role is outside Support Recovery scope.", canStageRecovery: false, canViewPaymentContext: false, canViewInternalEvidence: false };
}

const asRecord = (value: unknown): JsonRecord => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
const text = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const num = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const rowFromMetadata = (metadata: JsonRecord | null) => asRecord(metadata?.row);
const fieldsFromMetadata = (metadata: JsonRecord | null) => asRecord(rowFromMetadata(metadata).fields);
const titleCase = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const labels: Record<string, string> = { "support-case": "Cases", "sla-event": "SLA", "member-context": "Member context", "payment-context": "Payment context", "evidence-link": "Evidence", "recovery-action": "Recovery actions" };

function hrefFor(family: string, role: RoleKey) { const roleParam = encodeURIComponent(role); if (family === "payment-context") return `/erp?role=${roleParam}&view=payment-recovery`; if (family === "member-context") return `/operations?role=${roleParam}&view=members`; if (family === "evidence-link") return `/files?role=${roleParam}&view=packages&record=support`; if (family === "recovery-action") return `/operations?role=${roleParam}&view=recovery`; return `/support?role=${roleParam}&view=cases`; }
function mapRecord(row: SourceRow, role: RoleKey): SupportRecoveryRecord {
  const source = rowFromMetadata(row.metadata); const fields = fieldsFromMetadata(row.metadata); const family = row.external_entity_type;
  return { id: `${family}:${row.external_entity_id}`, family, label: text(source.label, row.external_entity_id), craysEntityType: row.crays_entity_type, craysEntityId: row.crays_entity_id, status: text(fields.status, text(source.status, row.sync_status)), priority: text(source.priority, text(fields.priority, "medium")), owner: text(source.owner, text(fields.ownerRole, "Studio Manager")), audience: text(fields.audience, "Studio Manager"), value: (fields.value as string | number | boolean | null | undefined) ?? null, unit: text(fields.unit) || null, context: text(fields.context, "Review support record."), currentState: text(fields.currentState, "Review required."), nextAction: text(fields.nextAction, "Review the next safe action."), dueDate: text(source.dueDate, text(fields.dueDate)) || null, caseId: text(fields.caseId) || null, identifier: text(fields.identifier) || null, memberId: text(fields.memberId) || null, memberName: text(fields.memberName) || null, caseType: text(fields.caseType) || null, href: hrefFor(family, role), lastSyncedAt: row.last_synced_at?.toISOString() ?? null, fields };
}
function financeCaseIds(records: SupportRecoveryRecord[]) { return new Set(records.filter((record) => record.family === "support-case" && (record.owner === "CRAYS Finance" || ["refund_request", "billing_dispute", "payment_issue", "invoice_question"].includes(record.caseType ?? ""))).map((record) => record.identifier ?? record.caseId ?? "")); }
function visibleFor(record: SupportRecoveryRecord, access: SupportRecoveryReadModel["access"], financeIds: Set<string>) {
  if (!access.allowed) return false;
  if (access.level === "support_control") return true;
  if (access.level === "finance_scoped") return record.family === "payment-context" || (record.caseId ? financeIds.has(record.caseId) : false) || (record.identifier ? financeIds.has(record.identifier) : false) || (record.family === "recovery-action" && record.owner === "CRAYS Finance");
  if (access.level === "member_self") return record.memberId === "member_laura_neumann" && ["support-case", "member-context"].includes(record.family);
  return false;
}
function memberSafe(record: SupportRecoveryRecord): SupportRecoveryRecord { const fields = { ...record.fields }; for (const key of ["sourceDatasets", "partnerOrganizationId", "partnerCompany", "externalSendingEnabled", "refundExecutionEnabled", "financePostingEnabled", "sourceWritesEnabled", "syncApplyEnabled", "toolApplyEnabled"]) delete fields[key]; return { ...record, context: "Your support request is assigned to the studio team.", currentState: record.status === "ready" ? "Resolved." : "Review in progress.", nextAction: "The studio team will update the case status after review.", fields }; }

function empty(role: RoleKey, access: SupportRecoveryReadModel["access"], queryStatus: SupportRecoveryReadModel["queryStatus"]): SupportRecoveryReadModel {
  return { access, supportContext: { studioId: "studio_berlin_mitte", studioName: "Berlin Mitte Studio", partnerCompany: access.level === "member_self" ? "" : "Vogt Fitness Betriebs GmbH", journey: "Member or payment issue -> Support case -> SLA and owner -> Evidence -> Recovery action -> Operations or Finance handoff", ownMemberId: access.level === "member_self" ? "member_laura_neumann" : null }, summary: { records: 0, sourceRecords: 0, linkedMemberRecords: 0, linkedPaymentRecoveryRecords: 0, linkedOperationsRecoveryRecords: 0, linkedOpeningProjectRecords: 0, cases: 0, slaEvents: 0, memberContexts: 0, paymentContexts: 0, evidenceLinks: 0, recoveryActions: 0, breached: 0, blockers: 0, critical: 0, amountAtRisk: 0, freshnessMinutes: null }, cards: [], records: [], controls: { families: [], statuses: [], priorities: [], owners: [], caseTypes: [], sourceBacked: true, roleScoped: true }, actions: { stageRecoveryAllowed: access.canStageRecovery, commandRoute: "/api/crays/operations/studio-workbench/command-draft", confirmationHeader: "stage-studio-operations-command", applyGate: "OPEN_DEV_OPERATIONS_ACTION_APPLY" }, boundaries: { externalSendingEnabled: false, refundExecutionEnabled: false, paymentInitiationEnabled: false, financePostingEnabled: false, uploadsEnabled: false, privatePreviewEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false, stakeholderReleaseEnabled: false, liveAiEnabled: false, secretsReturned: false, privateKeysReturned: false }, queryStatus };
}
const countFamily = (records: SupportRecoveryRecord[], family: string) => records.filter((record) => record.family === family).length;
function statusFor(records: SupportRecoveryRecord[], family: string): CardStatus { const scoped = records.filter((record) => record.family === family); if (scoped.some((record) => ["breached", "blocked"].includes(record.status) || record.priority === "critical")) return "blocked"; if (scoped.some((record) => record.status === "attention" || record.priority === "high")) return "attention"; return "ready"; }
function cards(records: SupportRecoveryRecord[]): SupportRecoveryReadModel["cards"] { return [
  { key: "cases", label: "Open cases", value: `${countFamily(records, "support-case")}`, context: "Cases stay linked to member, studio, payment and owner context.", status: statusFor(records, "support-case"), filterFamily: "support-case" },
  { key: "sla", label: "SLA queue", value: `${countFamily(records, "sla-event")}`, context: "Breached and approaching SLAs are visible work, not inbox noise.", status: statusFor(records, "sla-event"), filterFamily: "sla-event" },
  { key: "member", label: "Member context", value: `${countFamily(records, "member-context")}`, context: "Scoped member facts explain the case without unrelated PII.", status: statusFor(records, "member-context"), filterFamily: "member-context" },
  { key: "payment", label: "Payment context", value: `${countFamily(records, "payment-context")}`, context: "Payment, refund and chargeback cases connect to Finance without execution.", status: statusFor(records, "payment-context"), filterFamily: "payment-context" },
  { key: "evidence", label: "Evidence", value: `${countFamily(records, "evidence-link")}`, context: "Evidence metadata is reviewable while upload and private preview stay closed.", status: statusFor(records, "evidence-link"), filterFamily: "evidence-link" },
  { key: "actions", label: "Recovery actions", value: `${countFamily(records, "recovery-action")}`, context: "Guarded commands capture internal recovery work without sending externally.", status: statusFor(records, "recovery-action"), filterFamily: "recovery-action" },
].filter((card) => card.value !== "0"); }
function groupOptions(records: SupportRecoveryRecord[], selector: (record: SupportRecoveryRecord) => string, labeler = titleCase) { const counts = new Map<string, number>(); for (const record of records) { const key = selector(record); if (key) counts.set(key, (counts.get(key) ?? 0) + 1); } return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, label: labeler(key), rows })); }
type LinkedCountKey = "member" | "paymentRecovery" | "operationsRecovery" | "openingProject";
async function linkedCounts() {
  const result = await getCorePgPool().query<{ key: LinkedCountKey; count: string }>(`
    with linked_sources(key, external_system, seed_batch) as (
      values
        ('member', 'member-app', $1),
        ('paymentRecovery', 'erp-engine', $2),
        ('operationsRecovery', 'operations-engine', $3),
        ('openingProject', 'opening-project-engine', $4)
    )
    select linked_sources.key, count(external_record_maps.id)::text as count
    from linked_sources
    left join crays_core.external_record_maps
      on external_record_maps.external_system = linked_sources.external_system
     and coalesce(external_record_maps.metadata->>'seedBatch', external_record_maps.metadata->'fields'->>'seedBatch') = linked_sources.seed_batch
    group by linked_sources.key
  `, [memberBatch, paymentBatch, operationsBatch, openingBatch]);
  const counts: Record<LinkedCountKey, number> = { member: 0, paymentRecovery: 0, operationsRecovery: 0, openingProject: 0 };
  for (const row of result.rows) counts[row.key] = Number.parseInt(row.count, 10) || 0;
  return counts;
}

export async function getSupportRecoveryReadModel(role: RoleKey): Promise<SupportRecoveryReadModel> {
  const access = accessForRole(role); const runtime = getCoreDatabaseRuntimeState(); if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");
  const result = await getCorePgPool().query<SourceRow>(`select external_entity_type,external_entity_id,crays_entity_type,crays_entity_id,sync_status,last_synced_at,metadata from crays_core.external_record_maps where external_system='support-recovery-engine' and metadata->>'seedBatch'=$1 order by external_entity_type,external_entity_id`, [seedBatch]);
  const linked = await linkedCounts();
  const { member: linkedMemberRecords, paymentRecovery: linkedPaymentRecoveryRecords, operationsRecovery: linkedOperationsRecoveryRecords, openingProject: linkedOpeningProjectRecords } = linked;
  const allRecords = result.rows.map((row) => mapRecord(row, role)); const financeIds = financeCaseIds(allRecords); const records = allRecords.filter((record) => visibleFor(record, access, financeIds)).map((record) => access.level === "member_self" ? memberSafe(record) : record).sort((a, b) => ({ critical: 0, high: 1, medium: 2 }[a.priority] ?? 3) - ({ critical: 0, high: 1, medium: 2 }[b.priority] ?? 3) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.label.localeCompare(b.label));
  const model = empty(role, access, "schema_ready"); const latestMs = Math.max(...records.map((record) => record.lastSyncedAt ? Date.parse(record.lastSyncedAt) : 0), 0);
  return { ...model, summary: { records: records.length, sourceRecords: allRecords.length, linkedMemberRecords, linkedPaymentRecoveryRecords, linkedOperationsRecoveryRecords, linkedOpeningProjectRecords, cases: countFamily(records, "support-case"), slaEvents: countFamily(records, "sla-event"), memberContexts: countFamily(records, "member-context"), paymentContexts: countFamily(records, "payment-context"), evidenceLinks: countFamily(records, "evidence-link"), recoveryActions: countFamily(records, "recovery-action"), breached: records.filter((record) => record.status === "breached").length, blockers: records.filter((record) => ["breached", "blocked"].includes(record.status) || record.priority === "critical").length, critical: records.filter((record) => record.priority === "critical").length, amountAtRisk: records.filter((record) => record.family === "payment-context").reduce((sum, record) => sum + (num(record.value) ?? 0), 0), freshnessMinutes: latestMs ? Math.max(0, Math.round((Date.now() - latestMs) / 60000)) : null }, cards: cards(records), records, controls: { families: groupOptions(records, (record) => record.family, (key) => labels[key] ?? titleCase(key)), statuses: groupOptions(records, (record) => record.status), priorities: groupOptions(records, (record) => record.priority), owners: groupOptions(records, (record) => record.owner), caseTypes: groupOptions(records.filter((record) => record.caseType), (record) => record.caseType ?? ""), sourceBacked: true, roleScoped: true } };
}

export function formatSupportRecoveryValue(value: string | number | boolean | null, unit: string | null) { if (value === null) return "Not available"; if (typeof value === "boolean") return value ? "Yes" : "No"; if (typeof value === "string") return titleCase(value); if (unit === "EUR") return `EUR ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`; if (unit === "hours") return value < 0 ? `${Math.abs(value)} h breached` : `${value} h remaining`; return value.toLocaleString("en-US"); }
