import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "management_analytics" | "finance_analytics" | "studio_analytics" | "external_scoped_analytics" | "forbidden";
type KpiStatus = "ready" | "attention" | "blocked";
type DrillKey = "portfolio" | "financial" | "members" | "bank" | "evidence" | "opening";

type SourceMapRow = {
  crays_entity_type: string;
  crays_entity_id: string;
  external_system: string;
  external_entity_type: string;
  external_entity_id: string;
  sync_status: string;
  last_synced_at: Date | null;
  metadata: JsonRecord | null;
};

type ModuleStatsRow = {
  module_key: string;
  source_maps: string;
  conflicts: string;
  last_synced_at: Date | null;
};

type CommandRow = {
  command_id: string;
  command_key: string;
  module_key: string;
  actor_role: string;
  entity_type: string;
  entity_id: string | null;
  command_status: string;
  target_apply_status: string;
  apply_gate: string;
  input_payload: JsonRecord | null;
  created_at: Date;
};

export type AnalyticsManagementKpi = {
  key: string;
  label: string;
  value: string;
  status: KpiStatus;
  ownerRole: string;
  source: string;
  drillKey: DrillKey;
  context: string;
};

export type AnalyticsManagementDrillRow = {
  id: string;
  label: string;
  moduleKey: string;
  moduleLabel: string;
  family: string;
  status: string;
  owner: string;
  sourceType: "source-map" | "core-command";
  sourceLabel: string;
  entityType: string;
  entityId: string | null;
  evidence: string;
  nextAction: string;
  href: string;
  lastUpdatedAt: string | null;
};

export type AnalyticsManagementKpiReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
  };
  caseContext: {
    title: string;
    journey: string;
    ownerRole: string;
    consumingRoles: string[];
  };
  summary: {
    kpis: number;
    drillRows: number;
    sourceMaps: number;
    sourceConflicts: number;
    financialModelRecords: number;
    memberRecords: number;
    paymentExceptionRecords: number;
    evidenceRecords: number;
    bankRecords: number;
    commandDrafts: number;
    applyBlockedCommands: number;
    freshnessMinutes: number | null;
  };
  kpis: AnalyticsManagementKpi[];
  drilldowns: Record<DrillKey, AnalyticsManagementDrillRow[]>;
  moduleHealth: Array<{
    moduleKey: string;
    label: string;
    sourceMaps: number;
    conflicts: number;
    status: KpiStatus;
    lastSyncedAt: string | null;
    nextAction: string;
  }>;
  controls: {
    drillFilters: Array<{ key: DrillKey; label: string; rows: number }>;
    searchEnabled: true;
    roleScoped: true;
    hardRefreshStable: true;
  };
  boundaries: {
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    reportPublicationEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const fullRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const financeRoles: RoleKey[] = ["finance", "deal-manager", "expansion-manager"];
const studioRoles: RoleKey[] = ["franchise-partner", "studio-manager"];
const externalScopedRoles: RoleKey[] = ["bank-partner", "landlord", "investor"];

function accessForRole(role: RoleKey): AnalyticsManagementKpiReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "management_analytics",
      reason: "Role can inspect portfolio KPIs, source lineage, exceptions and command queue status.",
    };
  }
  if (financeRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "finance_analytics",
      reason: "Role can inspect financial, bank, evidence and deal execution KPI drilldowns.",
    };
  }
  if (studioRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "studio_analytics",
      reason: "Role can inspect own operating and member-performance KPI drilldowns without internal bank or release controls.",
    };
  }
  if (externalScopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "external_scoped_analytics",
      reason: "Role receives scoped, aggregated KPI rows only; internal source records and private member details stay hidden.",
    };
  }
  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Management analytics require an internal or approved stakeholder role.",
  };
}

function emptyReadModel(role: RoleKey, queryStatus: AnalyticsManagementKpiReadModel["queryStatus"]): AnalyticsManagementKpiReadModel {
  return {
    access: accessForRole(role),
    caseContext: {
      title: "Management KPI drilldown",
      journey: "Portfolio exception -> source record -> module workflow -> guarded follow-up",
      ownerRole: "CRAYS Management",
      consumingRoles: ["Finance", "Deal Manager", "Studio Manager", "Franchise Partner", "Reviewer"],
    },
    summary: {
      kpis: 0,
      drillRows: 0,
      sourceMaps: 0,
      sourceConflicts: 0,
      financialModelRecords: 0,
      memberRecords: 0,
      paymentExceptionRecords: 0,
      evidenceRecords: 0,
      bankRecords: 0,
      commandDrafts: 0,
      applyBlockedCommands: 0,
      freshnessMinutes: null,
    },
    kpis: [],
    drilldowns: { portfolio: [], financial: [], members: [], bank: [], evidence: [], opening: [] },
    moduleHealth: [],
    controls: {
      drillFilters: [
        { key: "portfolio", label: "Portfolio exceptions", rows: 0 },
        { key: "financial", label: "Financial model", rows: 0 },
        { key: "members", label: "Member operations", rows: 0 },
        { key: "bank", label: "Bank package", rows: 0 },
        { key: "evidence", label: "Evidence packages", rows: 0 },
        { key: "opening", label: "Opening readiness", rows: 0 },
      ],
      searchEnabled: true,
      roleScoped: true,
      hardRefreshStable: true,
    },
    boundaries: boundaries(),
    queryStatus,
  };
}

function boundaries(): AnalyticsManagementKpiReadModel["boundaries"] {
  return {
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    reportPublicationEnabled: false,
    externalSendingEnabled: false,
    candidateReleaseEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    liveAiEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function iso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function minutesSince(value: Date | null) {
  if (!value) return null;
  return Math.max(0, Math.round((Date.now() - value.getTime()) / 60_000));
}

function moduleKey(row: SourceMapRow) {
  const metadata = safeObject(row.metadata);
  if (row.external_system === "member-app") return "operations";
  const value = text(metadata.moduleKey) ?? text(safeObject(metadata.row).moduleKey);
  if (value) return value;
  if (row.external_system.endsWith("-engine")) return row.external_system.replace(/-engine$/, "");
  return row.external_system;
}

function safeObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fieldValue(fields: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = fields[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return null;
}

function fields(row: SourceMapRow) {
  const metadata = safeObject(row.metadata);
  const direct = safeObject(metadata.fields);
  if (Object.keys(direct).length) return direct;
  return safeObject(safeObject(metadata.row).fields);
}

function label(row: SourceMapRow) {
  const metadata = safeObject(row.metadata);
  return text(metadata.label) ?? text(safeObject(metadata.row).label) ?? row.external_entity_id;
}

function owner(row: SourceMapRow) {
  const metadata = safeObject(row.metadata);
  const rowObject = safeObject(metadata.row);
  return text(metadata.owner) ?? text(rowObject.owner) ?? fieldValue(fields(row), ["owner", "ownerRole", "responsible"]) ?? "CRAYS Core";
}

function titleCase(value: unknown) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function moduleLabel(value: unknown) {
  const key = String(value ?? "");
  const known: Record<string, string> = {
    crm: "CRM",
    project: "Project",
    erp: "ERP",
    files: "Files",
    loans: "Loans",
    operations: "Operations",
    analytics: "Analytics",
    hr: "HR",
    learning: "Learning",
    support: "Support",
    sync: "Sync",
  };
  return known[key] ?? titleCase(key);
}

function statusFor(conflicts: number, records: number): KpiStatus {
  if (conflicts > 0) return "attention";
  if (records <= 0) return "blocked";
  return "ready";
}

function rowStatus(row: SourceMapRow) {
  const field = fields(row);
  return text(field.status) ?? text(field.paymentStatus) ?? text(field.supportStatus) ?? row.sync_status;
}

function nextActionFor(row: SourceMapRow) {
  const field = fields(row);
  const explicit = fieldValue(field, ["nextAction", "next_action", "reviewAction"]);
  if (explicit) return explicit;
  if (row.sync_status === "conflict") return "Review source-record conflict before relying on this record.";
  if (row.crays_entity_type === "financial-model") return "Review financial assumptions and source lineage.";
  if (row.crays_entity_type === "member") return "Review member exception and recovery state.";
  if (row.crays_entity_type === "bank-package" || row.crays_entity_type === "loan-case") return "Review bank package conditions.";
  if (row.crays_entity_type === "document" || row.crays_entity_type === "evidence-package") return "Review evidence package readiness.";
  return "Open the connected module workflow.";
}

function hrefFor(module: string, role: RoleKey, row: SourceMapRow) {
  if (module === "operations") return `/operations?role=${role}&view=members&record=${encodeURIComponent(row.external_entity_type)}`;
  if (["crm", "project", "erp", "files", "analytics", "loans"].includes(module)) {
    return `/${module}?role=${role}&view=records&record=${encodeURIComponent(row.external_entity_type)}`;
  }
  return `/dashboard?role=${role}&view=signals`;
}

function sourceRowToDrill(row: SourceMapRow, role: RoleKey): AnalyticsManagementDrillRow {
  const sourceModuleKey = moduleKey(row);
  const field = fields(row);
  return {
    id: `${row.external_system}:${row.external_entity_type}:${row.external_entity_id}`,
    label: label(row),
    moduleKey: sourceModuleKey,
    moduleLabel: moduleLabel(sourceModuleKey),
    family: titleCase(row.external_entity_type),
    status: rowStatus(row),
    owner: owner(row),
    sourceType: "source-map",
    sourceLabel: row.external_system === "member-app" ? "Member App source map" : `${moduleLabel(sourceModuleKey)} source map`,
    entityType: row.crays_entity_type,
    entityId: row.crays_entity_id,
    evidence: fieldValue(field, ["sourceUse", "supportTicket", "invoiceNo", "package", "documentType", "studio", "relatedDeal"]) ?? titleCase(row.crays_entity_type),
    nextAction: nextActionFor(row),
    href: hrefFor(sourceModuleKey, role, row),
    lastUpdatedAt: iso(row.last_synced_at),
  };
}

function commandToDrill(row: CommandRow, role: RoleKey): AnalyticsManagementDrillRow {
  const payload = safeObject(row.input_payload);
  const labelText = text(payload.title) ?? text(payload.subject) ?? titleCase(row.command_key);
  return {
    id: row.command_id,
    label: labelText,
    moduleKey: row.module_key,
    moduleLabel: moduleLabel(row.module_key),
    family: "Core Command",
    status: row.target_apply_status === "blocked" ? "apply blocked" : row.command_status,
    owner: titleCase(row.actor_role),
    sourceType: "core-command",
    sourceLabel: "Core command queue",
    entityType: row.entity_type,
    entityId: row.entity_id,
    evidence: row.apply_gate,
    nextAction: "Review preflight, rollback and gate status before any future apply path.",
    href: `/dashboard?role=${role}&view=actions`,
    lastUpdatedAt: row.created_at.toISOString(),
  };
}

function scopedRows(role: RoleKey, rows: AnalyticsManagementDrillRow[]) {
  if (fullRoles.includes(role)) return rows;
  if (role === "finance") return rows.filter((row) => ["erp", "loans", "files", "analytics", "operations"].includes(row.moduleKey));
  if (role === "deal-manager") return rows.filter((row) => ["crm", "project", "files", "loans", "analytics", "operations"].includes(row.moduleKey));
  if (role === "expansion-manager") return rows.filter((row) => ["crm", "project", "files", "analytics"].includes(row.moduleKey));
  if (role === "franchise-partner" || role === "studio-manager") return rows.filter((row) => ["operations", "project", "erp", "support", "analytics"].includes(row.moduleKey));
  if (role === "bank-partner") return rows.filter((row) => row.moduleKey === "loans" || row.entityType === "bank-package" || row.entityType === "financial-model").slice(0, 8);
  if (role === "landlord") return rows.filter((row) => row.moduleKey === "analytics" || row.moduleKey === "project" || row.entityType === "property-case" || row.entityType === "location-analysis").slice(0, 8);
  if (role === "investor") return rows.filter((row) => row.moduleKey === "analytics" || row.entityType === "financial-model").slice(0, 8);
  return [];
}

function countMaps(rows: SourceMapRow[], predicate: (row: SourceMapRow) => boolean) {
  return rows.filter(predicate).length;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function sumField(rows: SourceMapRow[], keys: string[]) {
  return rows.reduce((sum, row) => {
    const value = fieldValue(fields(row), keys);
    return sum + toNumber(value);
  }, 0);
}

export async function getAnalyticsManagementKpiReadModel(role: RoleKey): Promise<AnalyticsManagementKpiReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) return emptyReadModel(role, "forbidden");
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(role, "not_configured");

  const [sourceResult, moduleResult, commandResult] = await Promise.all([
    getCorePgPool().query<SourceMapRow>(
      `
        select
          crays_entity_type,
          crays_entity_id,
          external_system,
          external_entity_type,
          external_entity_id,
          sync_status,
          last_synced_at,
          metadata
        from crays_core.external_record_maps
        order by last_synced_at desc nulls last, updated_at desc
        limit 900
      `,
    ),
    getCorePgPool().query<ModuleStatsRow>(
      `
        select
          case when external_system = 'member-app' then 'operations' else coalesce(metadata ->> 'moduleKey', regexp_replace(external_system, '-engine$', '')) end as module_key,
          count(*)::text as source_maps,
          count(*) filter (where sync_status = 'conflict')::text as conflicts,
          max(last_synced_at) as last_synced_at
        from crays_core.external_record_maps
        group by 1
        order by 1
      `,
    ),
    getCorePgPool().query<CommandRow>(
      `
        select
          command_id,
          command_key,
          module_key,
          actor_role,
          entity_type,
          entity_id,
          command_status,
          target_apply_status,
          apply_gate,
          input_payload,
          created_at
        from crays_core.core_command_requests
        order by created_at desc
        limit 120
      `,
    ),
  ]);

  const sourceRows = sourceResult.rows;
  const commandRows = commandResult.rows;
  const commandDrillRows = commandRows.map((row) => commandToDrill(row, role));

  const financialRows = sourceRows.filter((row) => row.crays_entity_type === "financial-model" || ["erp", "analytics"].includes(moduleKey(row)));
  const memberRows = sourceRows.filter((row) => row.external_system === "member-app" || row.crays_entity_type === "member");
  const paymentRows = sourceRows.filter((row) => {
    const family = row.external_entity_type.toLowerCase();
    const status = rowStatus(row).toLowerCase();
    return family.includes("payment") || status.includes("payment") || status.includes("past_due") || status.includes("failed");
  });
  const evidenceRows = sourceRows.filter((row) => ["document", "evidence-package"].includes(row.crays_entity_type) || moduleKey(row) === "files");
  const bankRows = sourceRows.filter((row) => ["bank-package", "loan-case"].includes(row.crays_entity_type) || moduleKey(row) === "loans");
  const openingRows = sourceRows.filter((row) => ["property-case", "location-analysis"].includes(row.crays_entity_type) || moduleKey(row) === "project");
  const conflictRows = sourceRows.filter((row) => row.sync_status === "conflict");

  const drilldowns = {
    portfolio: scopedRows(role, [...conflictRows.map((row) => sourceRowToDrill(row, role)), ...commandDrillRows]).slice(0, 40),
    financial: scopedRows(role, financialRows.map((row) => sourceRowToDrill(row, role))).slice(0, 40),
    members: scopedRows(role, memberRows.map((row) => sourceRowToDrill(row, role))).slice(0, 40),
    bank: scopedRows(role, bankRows.map((row) => sourceRowToDrill(row, role))).slice(0, 40),
    evidence: scopedRows(role, evidenceRows.map((row) => sourceRowToDrill(row, role))).slice(0, 40),
    opening: scopedRows(role, openingRows.map((row) => sourceRowToDrill(row, role))).slice(0, 40),
  };

  const sourceConflicts = countMaps(sourceRows, (row) => row.sync_status === "conflict");
  const commandDrafts = commandRows.length;
  const applyBlockedCommands = commandRows.filter((row) => row.target_apply_status === "blocked").length;
  const latestSync = sourceRows.reduce<Date | null>((latest, row) => {
    if (!row.last_synced_at) return latest;
    if (!latest || row.last_synced_at > latest) return row.last_synced_at;
    return latest;
  }, null);

  const memberActive = Math.max(
    ...memberRows.map((row) => toNumber(fieldValue(fields(row), ["membersActive", "activeMembers"]))),
    0,
  );
  const checkinsToday = Math.max(...memberRows.map((row) => toNumber(fieldValue(fields(row), ["checkinsToday"]))), 0);
  const forecastRevenue = sumField(financialRows, ["projectedMrrEur", "targetMRR", "targetMrrEur", "amountEur"]);

  const kpis: AnalyticsManagementKpi[] = [
    {
      key: "portfolio-exceptions",
      label: "Portfolio exceptions",
      value: String(sourceConflicts + applyBlockedCommands),
      status: sourceConflicts + applyBlockedCommands > 0 ? "attention" : "ready",
      ownerRole: "CRAYS Management",
      source: "Core source maps + command queue",
      drillKey: "portfolio",
      context: `${sourceConflicts} source conflicts and ${applyBlockedCommands} apply-blocked command drafts`,
    },
    {
      key: "financial-model-records",
      label: "Financial model records",
      value: String(financialRows.length),
      status: financialRows.length ? statusFor(sourceConflicts, financialRows.length) : "blocked",
      ownerRole: "Finance",
      source: "ERP, Analytics and Core financial source maps",
      drillKey: "financial",
      context: forecastRevenue > 0 ? `${currency(forecastRevenue)} tracked across visible finance rows` : "Financial rows need scenario expansion in the next block",
    },
    {
      key: "member-operating-records",
      label: "Member operating records",
      value: String(memberRows.length),
      status: paymentRows.length > 0 ? "attention" : statusFor(0, memberRows.length),
      ownerRole: "Studio Manager",
      source: "Member App bridge source maps",
      drillKey: "members",
      context: `${memberActive} active members, ${checkinsToday} check-ins today, ${paymentRows.length} payment exception rows`,
    },
    {
      key: "bank-package-records",
      label: "Bank package records",
      value: String(bankRows.length),
      status: bankRows.some((row) => row.sync_status === "conflict" || rowStatus(row).toLowerCase().includes("blocked")) ? "blocked" : statusFor(0, bankRows.length),
      ownerRole: "Finance",
      source: "Loans and Core bank-package source maps",
      drillKey: "bank",
      context: "Bank package and condition rows stay review-only; bank send is closed",
    },
    {
      key: "evidence-records",
      label: "Evidence records",
      value: String(evidenceRows.length),
      status: evidenceRows.some((row) => row.sync_status === "conflict" || rowStatus(row).toLowerCase().includes("blocked")) ? "attention" : statusFor(0, evidenceRows.length),
      ownerRole: "Reviewer",
      source: "Files and evidence package maps",
      drillKey: "evidence",
      context: "Documents, redactions, grants and room preflight rows",
    },
    {
      key: "opening-readiness-records",
      label: "Opening readiness records",
      value: String(openingRows.length),
      status: openingRows.some((row) => row.sync_status === "conflict" || rowStatus(row).toLowerCase().includes("blocked")) ? "attention" : statusFor(0, openingRows.length),
      ownerRole: "Deal Manager",
      source: "Project, property-case and location-analysis maps",
      drillKey: "opening",
      context: "Opening project, location and property-case signals",
    },
  ];

  const moduleHealth = moduleResult.rows.map((row) => {
    const sourceMaps = toNumber(row.source_maps);
    const conflicts = toNumber(row.conflicts);
    return {
      moduleKey: row.module_key,
      label: moduleLabel(row.module_key),
      sourceMaps,
      conflicts,
      status: statusFor(conflicts, sourceMaps),
      lastSyncedAt: iso(row.last_synced_at),
      nextAction:
        conflicts > 0
          ? "Classify conflict rows before relying on this module for stakeholder decisions."
          : sourceMaps > 0
            ? "Use current Core projection for first decision and drill into records as needed."
            : "Add realistic source records for this module.",
    };
  });

  const drillRows = Object.values(drilldowns).reduce((sum, rows) => sum + rows.length, 0);

  return {
    access,
    caseContext: {
      title: "Management KPI drilldown",
      journey: "Portfolio exception -> source record -> module workflow -> guarded follow-up",
      ownerRole: "CRAYS Management",
      consumingRoles: ["Finance", "Deal Manager", "Studio Manager", "Franchise Partner", "Reviewer", "Bank Partner scoped", "Real Estate Partner scoped"],
    },
    summary: {
      kpis: kpis.length,
      drillRows,
      sourceMaps: sourceRows.length,
      sourceConflicts,
      financialModelRecords: financialRows.length,
      memberRecords: memberRows.length,
      paymentExceptionRecords: paymentRows.length,
      evidenceRecords: evidenceRows.length,
      bankRecords: bankRows.length,
      commandDrafts,
      applyBlockedCommands,
      freshnessMinutes: minutesSince(latestSync),
    },
    kpis,
    drilldowns,
    moduleHealth,
    controls: {
      drillFilters: [
        { key: "portfolio", label: "Portfolio exceptions", rows: drilldowns.portfolio.length },
        { key: "financial", label: "Financial model", rows: drilldowns.financial.length },
        { key: "members", label: "Member operations", rows: drilldowns.members.length },
        { key: "bank", label: "Bank package", rows: drilldowns.bank.length },
        { key: "evidence", label: "Evidence packages", rows: drilldowns.evidence.length },
        { key: "opening", label: "Opening readiness", rows: drilldowns.opening.length },
      ],
      searchEnabled: true,
      roleScoped: true,
      hardRefreshStable: true,
    },
    boundaries: boundaries(),
    queryStatus: "schema_ready",
  };
}
