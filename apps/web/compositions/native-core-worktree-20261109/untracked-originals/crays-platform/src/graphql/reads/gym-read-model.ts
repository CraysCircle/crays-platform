import DataLoader from "dataloader";
import { GraphQLError } from "graphql";

import { getCorePgPool } from "@/db/client";
import { listOperationalRecords, type OperationalRecord } from "@/db/operational-record-write-repository";
import { evaluateOperationalReadPolicy, type OperationalResourceKey } from "@/lib/read-write/operational-record-policy";
import type { RoleKey } from "@/lib/roles";

export const gymReadDomains = ["CRM", "FRANCHISE", "PROJECT", "MEMBER", "STUDIO_OPERATIONS", "ERP_FINANCE", "DOCUMENTS", "ANALYTICS"] as const;
export type GymReadDomainKey = (typeof gymReadDomains)[number];
export type GymNodeSortKey = "CREATED_AT_ASC" | "CREATED_AT_DESC" | "ID_ASC" | "ID_DESC";

type LifecycleStateValue = { code: string; label: string; changedAt: string };
export type CanonicalGymNode = {
  __typename: "CrmRelationship" | "FranchiseCase" | "GymProject" | "GymMember" | "StudioOperation" | "FinanceDocument" | "ManagedDocument" | "MetricObservation";
  id: string;
  rawId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  sourceSystem: string;
  state: LifecycleStateValue;
  displayName?: string;
  title?: string;
  targetDate?: string | null;
  dueAt?: string | null;
  reference?: string;
  total?: { amount: string; currency: string };
  versionHash?: string;
  metricKey?: string;
  value?: string;
  observedAt?: string;
  evidence?: { edges: []; pageInfo: { hasNextPage: false; hasPreviousPage: false; startCursor: null; endCursor: null }; totalCount: 0 };
};

export type GymNodeQuery = {
  page: {
    first: number;
    after?: string | null;
  };
  search?: string | null;
  states?: string[] | null;
  sort?: GymNodeSortKey | null;
  viewKey?: string | null;
};

export type GymReadScope = {
  tenantId: string;
  role: RoleKey;
  accountId: string | null;
};

export type GymReadRepositoryPort = {
  readonly scope: GymReadScope;
  list(domain: GymReadDomainKey): Promise<CanonicalGymNode[]>;
  queryCount(): number;
};

const operationalDomain: Partial<Record<GymReadDomainKey, OperationalResourceKey>> = {
  CRM: "crm-companies",
  FRANCHISE: "crm-opportunities",
  PROJECT: "project-work-items",
  ERP_FINANCE: "erp-documents",
  DOCUMENTS: "files-documents",
  ANALYTICS: "analytics-reports",
};

const memberRoles = new Set<RoleKey>(["admin", "crays-management", "studio-manager", "finance", "hr", "reviewer", "gym-member"]);
const studioRoles = new Set<RoleKey>(["admin", "crays-management", "studio-manager", "franchise-partner", "finance", "hr", "reviewer"]);
const lineageRoles = new Set<RoleKey>(["admin", "crays-management", "deal-manager", "expansion-manager", "studio-manager", "finance", "hr", "reviewer"]);

export function canReadGymDomain(domain: GymReadDomainKey, role: RoleKey) {
  const resource = operationalDomain[domain];
  if (resource) return evaluateOperationalReadPolicy({ resource, role }).allowed;
  if (domain === "MEMBER") return memberRoles.has(role);
  if (domain === "STUDIO_OPERATIONS") return studioRoles.has(role);
  return false;
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function lifecycle(code: unknown, changedAt: string): LifecycleStateValue {
  const normalized = text(code, "active");
  return { code: normalized, label: normalized.replaceAll(/[-_]+/g, " "), changedAt };
}

export function encodeGymNodeId(domain: GymReadDomainKey, rawId: string) {
  return Buffer.from(JSON.stringify({ d: domain, r: rawId }), "utf8").toString("base64url");
}

export function decodeGymNodeId(value: string): { domain: GymReadDomainKey; rawId: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { d?: unknown; r?: unknown };
    if (!gymReadDomains.includes(parsed.d as GymReadDomainKey) || typeof parsed.r !== "string" || !parsed.r) return null;
    return { domain: parsed.d as GymReadDomainKey, rawId: parsed.r };
  } catch {
    return null;
  }
}

export function canonicalFromOperational(domain: GymReadDomainKey, record: OperationalRecord): CanonicalGymNode {
  const data = record.data;
  const common = {
    id: encodeGymNodeId(domain, record.recordId),
    rawId: record.recordId,
    tenantId: record.tenantId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sourceSystem: "crays-core",
    state: lifecycle(data.status ?? record.state, record.updatedAt),
  };
  if (domain === "CRM") return { ...common, __typename: "CrmRelationship", displayName: text(data.name ?? data.title, record.recordId) };
  if (domain === "FRANCHISE") return { ...common, __typename: "FranchiseCase", title: text(data.name ?? data.title, record.recordId), evidence: { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 } };
  if (domain === "PROJECT") return { ...common, __typename: "GymProject", title: text(data.title, record.recordId), targetDate: optionalText(data.dueDate) };
  if (domain === "ERP_FINANCE") {
    const totals = typeof data.totals === "object" && data.totals ? data.totals as Record<string, unknown> : {};
    return { ...common, __typename: "FinanceDocument", reference: text(data.reference ?? data.title, record.recordId), total: { amount: text(totals.grandTotal ?? totals.total ?? data.amount, "0"), currency: text(data.currency, "EUR") } };
  }
  if (domain === "DOCUMENTS") return { ...common, __typename: "ManagedDocument", title: text(data.title, record.recordId), versionHash: text(data.versionHash ?? data.versionLabel, `unversioned:${record.version}`) };
  return { ...common, __typename: "MetricObservation", metricKey: text(data.reportType ?? data.title, record.recordId), value: text(data.value, "0"), observedAt: optionalText(data.periodEnd) ?? record.updatedAt };
}

export class PostgresGymReadRepository implements GymReadRepositoryPort {
  private queries = 0;
  constructor(readonly scope: GymReadScope) {}

  queryCount() {
    return this.queries;
  }

  async list(domain: GymReadDomainKey): Promise<CanonicalGymNode[]> {
    if (!canReadGymDomain(domain, this.scope.role)) return [];
    if (domain === "MEMBER") return this.listMembers();
    if (domain === "STUDIO_OPERATIONS") return this.listStudioOperations();
    const resource = operationalDomain[domain];
    if (!resource) return [];
    this.queries += 1;
    const records = await listOperationalRecords({ tenantId: this.scope.tenantId, resource, limit: 1000 });
    return records.map((record) => canonicalFromOperational(domain, record));
  }

  private async listMembers(): Promise<CanonicalGymNode[]> {
    if (this.scope.role === "gym-member" && !this.scope.accountId) return [];
    this.queries += 1;
    const values: unknown[] = [this.scope.tenantId];
    const memberScope = this.scope.role === "gym-member" ? "and account_id=$2" : "";
    if (this.scope.role === "gym-member") values.push(this.scope.accountId);
    const result = await getCorePgPool().query<{
      memberId: string; displayName: string; lifecycleState: string; createdAt: Date; updatedAt: Date;
    }>(`select member_id as "memberId",display_name as "displayName",lifecycle_state as "lifecycleState",created_at as "createdAt",updated_at as "updatedAt" from crays_core.studio_members where tenant_id=$1 ${memberScope} order by created_at desc,member_id limit 1000`, values);
    return result.rows.map((row) => ({
      __typename: "GymMember",
      id: encodeGymNodeId("MEMBER", row.memberId), rawId: row.memberId, tenantId: this.scope.tenantId,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), sourceSystem: "crays-core",
      displayName: row.displayName, state: lifecycle(row.lifecycleState, row.updatedAt.toISOString()),
    }));
  }

  private async listStudioOperations(): Promise<CanonicalGymNode[]> {
    this.queries += 1;
    const result = await getCorePgPool().query<{
      caseId: string; title: string; caseState: string; slaDueAt: Date | null; createdAt: Date; updatedAt: Date;
    }>(`select case_id as "caseId",title,case_state as "caseState",sla_due_at as "slaDueAt",created_at as "createdAt",updated_at as "updatedAt" from crays_core.studio_daily_cases where tenant_id=$1 order by created_at desc,case_id limit 1000`, [this.scope.tenantId]);
    return result.rows.map((row) => ({
      __typename: "StudioOperation",
      id: encodeGymNodeId("STUDIO_OPERATIONS", row.caseId), rawId: row.caseId, tenantId: this.scope.tenantId,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), sourceSystem: "crays-core",
      title: row.title, dueAt: row.slaDueAt?.toISOString() ?? null, state: lifecycle(row.caseState, row.updatedAt.toISOString()),
    }));
  }
}

type CursorValue = { d: GymReadDomainKey; c: string; i: string };
function encodeCursor(domain: GymReadDomainKey, node: CanonicalGymNode) {
  return Buffer.from(JSON.stringify({ d: domain, c: node.createdAt, i: node.rawId } satisfies CursorValue), "utf8").toString("base64url");
}

function decodeCursor(value: string): CursorValue | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as CursorValue;
    return gymReadDomains.includes(parsed.d) && typeof parsed.c === "string" && typeof parsed.i === "string" ? parsed : null;
  } catch { return null; }
}

function nodeLabel(node: CanonicalGymNode) {
  return node.displayName ?? node.title ?? node.reference ?? node.metricKey ?? node.rawId;
}

export function paginateGymNodes(domain: GymReadDomainKey, nodes: CanonicalGymNode[], input: GymNodeQuery, role: RoleKey) {
  const first = input.page.first;
  if (!Number.isSafeInteger(first) || first < 1 || first > 100) throw new GraphQLError("Page size must be between 1 and 100.", { extensions: { code: "VALIDATION_FAILED" } });
  if ((input.states?.length ?? 0) > 20) throw new GraphQLError("At most 20 states may be filtered.", { extensions: { code: "VALIDATION_FAILED" } });
  const search = input.search?.trim().toLocaleLowerCase() ?? "";
  const states = new Set(input.states ?? []);
  const filtered = nodes.filter((node) => (!search || nodeLabel(node).toLocaleLowerCase().includes(search)) && (!states.size || states.has(node.state.code)));
  const sort = input.sort ?? "CREATED_AT_DESC";
  filtered.sort((left, right) => {
    if (sort === "ID_ASC" || sort === "ID_DESC") return (sort === "ID_ASC" ? 1 : -1) * left.rawId.localeCompare(right.rawId);
    const compared = left.createdAt.localeCompare(right.createdAt) || left.rawId.localeCompare(right.rawId);
    return (sort === "CREATED_AT_ASC" ? 1 : -1) * compared;
  });
  let start = 0;
  if (input.page.after) {
    const cursor = decodeCursor(input.page.after);
    if (!cursor || cursor.d !== domain) throw new GraphQLError("Cursor is invalid for this collection.", { extensions: { code: "VALIDATION_FAILED" } });
    const index = filtered.findIndex((node) => node.createdAt === cursor.c && node.rawId === cursor.i);
    if (index < 0) throw new GraphQLError("Cursor is no longer available in this collection.", { extensions: { code: "VALIDATION_FAILED" } });
    start = index + 1;
  }
  const page = filtered.slice(start, start + first);
  const operatingLineage = lineageRoles.has(role);
  const edges = page.map((node) => ({
    cursor: encodeCursor(domain, node), node,
    lineage: operatingLineage ? { sourceSystem: node.sourceSystem, sourceRecordId: node.rawId, freshnessAt: node.updatedAt } : null,
  }));
  return {
    edges,
    pageInfo: {
      hasNextPage: start + page.length < filtered.length,
      hasPreviousPage: start > 0,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
    totalCount: filtered.length,
  };
}

export function createGymReadLoaders(port: GymReadRepositoryPort) {
  const nodeById = new DataLoader<string, CanonicalGymNode | null>(async (ids) => {
    const decoded = ids.map((id) => decodeGymNodeId(id));
    const requestedDomains = [...new Set(decoded.flatMap((item) => item ? [item.domain] : []))];
    const lists = new Map<GymReadDomainKey, CanonicalGymNode[]>();
    await Promise.all(requestedDomains.map(async (domain) => lists.set(domain, await port.list(domain))));
    return decoded.map((item) => item ? lists.get(item.domain)?.find((node) => node.rawId === item.rawId) ?? null : null);
  });
  return { nodeById };
}
