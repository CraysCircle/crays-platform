import type { RoleKey } from "@/lib/roles";
import {
  getProjectNativeOperabilityReadModel,
  type ProjectNativeOperabilityReadModel,
  type ProjectNativeWorkItem,
  type ProjectStateGroup,
} from "@/lib/project-native-operability-read-model";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const defaultSeedBatchId = "crays-benchmark-20260710-v1";

type ProjectSeedRow = {
  external_entity_id: string;
  deal_id: string;
  deal_stage: string;
  deal_status: string;
  kyc_aml_status: string;
  equity_status: string;
  bank_handoff_status: string;
  required_actions: string[] | null;
  offer_id: string | null;
  title: string | null;
  market: string | null;
  offer_status: string | null;
  metrics_snapshot: Record<string, unknown> | null;
  case_id: string | null;
  case_status: string | null;
  current_phase: string | null;
  handoff_status: string | null;
  review_summary: Record<string, unknown> | null;
  city: string | null;
  country: string | null;
  created_at: Date;
  updated_at: Date;
};

type WorkflowRow = {
  related_entity_id: string;
  events: string[] | null;
};

type ProjectCycle = ProjectNativeOperabilityReadModel["cycles"][number];
type ProjectModule = ProjectNativeOperabilityReadModel["modules"][number];
type ProjectPage = ProjectNativeOperabilityReadModel["pages"][number];
type ProjectSavedView = ProjectNativeOperabilityReadModel["savedViews"][number];

const stageCycle: Record<string, string> = {
  candidate_interest: "Candidate diligence",
  deal_detail: "Prepared deal review",
  purchase_intent: "Candidate diligence",
  kyc_aml: "Candidate evidence",
  equity_check: "Candidate evidence",
  deal_readiness: "Deal readiness",
  bank_package: "Bank evidence",
  closing: "Closing readiness",
  franchise_partner_handoff: "Opening handoff",
};

const stateByStage: Record<string, ProjectStateGroup> = {
  candidate_interest: "Backlog",
  deal_detail: "To do",
  purchase_intent: "To do",
  kyc_aml: "In progress",
  equity_check: "In progress",
  deal_readiness: "In progress",
  bank_package: "In progress",
  closing: "In progress",
  franchise_partner_handoff: "Done",
};

const moduleDefinitions: Array<{ id: string; name: string; stages: string[]; lead: string }> = [
  {
    id: "owner-property-check",
    name: "Owner property check",
    stages: ["candidate_interest", "deal_detail"],
    lead: "Expansion Manager",
  },
  {
    id: "candidate-evidence",
    name: "Candidate evidence",
    stages: ["purchase_intent", "kyc_aml", "equity_check"],
    lead: "Deal Manager",
  },
  {
    id: "bank-evidence",
    name: "Bank evidence",
    stages: ["deal_readiness", "bank_package"],
    lead: "Finance",
  },
  {
    id: "opening-handoff",
    name: "Opening handoff",
    stages: ["closing", "franchise_partner_handoff"],
    lead: "Franchise Partner",
  },
];

export async function getRealProjectNativeOperabilityReadModel(
  role: RoleKey,
  seedBatchId = defaultSeedBatchId,
): Promise<ProjectNativeOperabilityReadModel> {
  const base = getProjectNativeOperabilityReadModel(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !base.access.allowed) return base;

  const pool = getCorePgPool();
  const [itemsResult, workflowResult] = await Promise.all([
    pool.query<ProjectSeedRow>(
      `
        select
          external_record_maps.external_entity_id,
          deals.deal_id,
          deals.stage as deal_stage,
          deals.status as deal_status,
          deals.kyc_aml_status,
          deals.equity_status,
          deals.bank_handoff_status,
          deals.required_actions,
          prepared_offers.offer_id,
          prepared_offers.title,
          prepared_offers.market,
          prepared_offers.status as offer_status,
          prepared_offers.metrics_snapshot,
          property_cases.case_id,
          property_cases.status as case_status,
          property_cases.current_phase,
          property_cases.handoff_status,
          property_cases.review_summary,
          properties.city,
          properties.country,
          deals.created_at,
          deals.updated_at
        from crays_core.external_record_maps
        join crays_core.deals on deals.deal_id = external_record_maps.crays_entity_id
        left join crays_core.prepared_offers on prepared_offers.offer_id = deals.prepared_offer_id
        left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
        left join crays_core.properties on properties.property_id = property_cases.property_id
        where external_record_maps.metadata -> '__seed' ->> 'seed_batch_id' = $1
          and external_record_maps.external_system = 'project'
          and external_record_maps.sync_direction = 'read'
          and external_record_maps.sync_status = 'synced'
        order by
          case deals.status when 'blocked' then 0 when 'active' then 1 else 2 end,
          coalesce(nullif(prepared_offers.metrics_snapshot ->> 'bankabilityScore', '')::numeric, 0) desc,
          deals.updated_at desc
      `,
      [seedBatchId],
    ),
    pool.query<WorkflowRow>(
      `
        select
          related_entity_id,
          array_agg(event_type order by occurred_at desc) as events
        from crays_core.workflow_events
        where payload -> '__seed' ->> 'seed_batch_id' = $1
          and related_entity_type = 'deal'
        group by related_entity_id
      `,
      [seedBatchId],
    ),
  ]);

  if (!itemsResult.rows.length) return base;

  const workflowByDeal = new Map(workflowResult.rows.map((row) => [row.related_entity_id, row.events ?? []]));
  const workItems = itemsResult.rows.map((row, index) => mapWorkItem(row, index, workflowByDeal.get(row.deal_id) ?? []));

  return {
    ...base,
    blockRange: "Blocks 461-475",
    workspace: {
      ...base.workspace,
      id: "crays-opening-portfolio",
      name: "Opening operating portfolio",
      projectId: seedBatchId,
      projectName: "Opening portfolio",
      identifier: "OPEN",
      lead: "Deal Manager",
    },
    workItems,
    cycles: buildCycles(workItems, itemsResult.rows),
    modules: buildModules(workItems, itemsResult.rows),
    pages: buildPages(workItems, itemsResult.rows, seedBatchId),
    savedViews: buildSavedViews(workItems),
  };
}

function mapWorkItem(row: ProjectSeedRow, index: number, workflowEvents: string[]): ProjectNativeWorkItem {
  const identifier = `OPEN-${numericSuffix(row.external_entity_id, index + 1)}`;
  const market = row.market ?? ([row.city, row.country].filter(Boolean).join(", ") || "Market pending");
  const locationScore = numberFromRecord(row.metrics_snapshot, "locationScore") ?? numberFromRecord(row.review_summary, "siteScore");
  const bankabilityScore = numberFromRecord(row.metrics_snapshot, "bankabilityScore");
  const openingReadiness = numberFromRecord(row.review_summary, "openingReadiness") ?? numberFromRecord(row.metrics_snapshot, "openingReadiness");
  const requiredActions = Array.isArray(row.required_actions) ? row.required_actions.filter(Boolean) : [];
  const priority = priorityFor(row, locationScore, openingReadiness);
  const state = stateFor(row);
  const cycle = stageCycle[row.deal_stage] ?? "Prepared deal review";
  const modules = modulesFor(row);

  return {
    id: row.deal_id,
    identifier,
    type: typeFor(row),
    title: titleFor(row, market),
    description: `Coordinate property check, deal evidence, candidate readiness and bank package work for ${market}.`,
    state,
    priority,
    lead: leadFor(row),
    assignees: assigneesFor(row),
    labels: labelsFor(row),
    startDate: dateOnly(row.created_at),
    dueDate: dueDateFor(row.updated_at, priority),
    cycle,
    modules,
    estimate: estimateFor(locationScore, bankabilityScore, openingReadiness),
    parent: "",
    blocking: blockingFor(row, requiredActions),
    blockedBy: blockedByFor(row, requiredActions),
    related: [shortReference("Offer", row.offer_id), shortReference("Case", row.case_id)].filter(Boolean),
    duplicateOf: "",
    links: ["Prepared deal package", "Evidence checklist", "Bank package"],
    customFields: [
      { key: "market", label: "Market", type: "text", value: market },
      { key: "stage", label: "Deal stage", type: "select", value: readable(row.deal_stage) },
      { key: "caseStatus", label: "Property case", type: "select", value: readable(row.case_status ?? "pending") },
      { key: "locationScore", label: "Location score", type: "number", value: valueOrDash(locationScore) },
      { key: "bankability", label: "Bankability", type: "number", value: valueOrDash(bankabilityScore) },
      { key: "openingReadiness", label: "Opening readiness", type: "number", value: valueOrDash(openingReadiness) },
      { key: "candidateCheck", label: "Candidate check", type: "select", value: readable(row.kyc_aml_status) },
      { key: "equityCheck", label: "Equity check", type: "select", value: readable(row.equity_status) },
      { key: "bankHandoff", label: "Bank handoff", type: "select", value: readable(row.bank_handoff_status) },
    ],
    comments: requiredActions.length ? requiredActions : [nextActionFor(row)],
    history: [
      "CRAYS Core read map verified",
      ...workflowEvents.map((event) => readable(event)).slice(0, 3),
      `Source snapshot ${defaultSeedBatchId} verified`,
    ],
  };
}

function buildCycles(workItems: ProjectNativeWorkItem[], rows: ProjectSeedRow[]): ProjectCycle[] {
  const groups = new Map<string, ProjectNativeWorkItem[]>();
  workItems.forEach((item) => {
    groups.set(item.cycle, [...(groups.get(item.cycle) ?? []), item]);
  });

  return Array.from(groups.entries()).map(([name, items], index) => {
    const relatedRows = rows.filter((row) => items.some((item) => item.id === row.deal_id));
    const progress = progressFor(items);
    return {
      id: slug(name),
      name,
      state: progress >= 90 ? "Completed" : progress > 20 ? "Active" : "Planned",
      startDate: dateOnly(minDate(relatedRows.map((row) => row.created_at))),
      endDate: dueDateFor(maxDate(relatedRows.map((row) => row.updated_at)), index < 2 ? "High" : "Medium"),
      progress,
      workItemIds: items.map((item) => item.id),
    };
  });
}

function buildModules(workItems: ProjectNativeWorkItem[], rows: ProjectSeedRow[]): ProjectModule[] {
  return moduleDefinitions.map((definition) => {
    const items = workItems.filter((item) => {
      const row = rows.find((entry) => entry.deal_id === item.id);
      return row ? definition.stages.includes(row.deal_stage) : false;
    });
    const relatedRows = rows.filter((row) => items.some((item) => item.id === row.deal_id));
    return {
      id: definition.id,
      name: definition.name,
      state: items.length ? "In Progress" : "Planned",
      lead: definition.lead,
      startDate: dateOnly(minDate(relatedRows.map((row) => row.created_at))),
      dueDate: dueDateFor(maxDate(relatedRows.map((row) => row.updated_at)), "Medium"),
      progress: progressFor(items),
      workItemIds: items.map((item) => item.id),
    };
  });
}

function buildPages(workItems: ProjectNativeWorkItem[], rows: ProjectSeedRow[], seedBatchId: string): ProjectPage[] {
  const urgentItems = workItems.filter((item) => item.priority === "Urgent" || item.priority === "High");
  const bankItems = workItems.filter((item) => item.modules.includes("Bank evidence"));
  const handoffItems = workItems.filter((item) => item.modules.includes("Opening handoff") || item.modules.includes("Owner property check"));

  return [
    {
      id: "project-evidence-brief",
      title: "Opening evidence brief",
      status: "Review",
      owner: "Deal Manager",
      updatedAt: dateOnly(maxDate(rows.map((row) => row.updated_at))),
      body: `${workItems.length} mapped work items from ${seedBatchId}. ${urgentItems.length} need priority review before release gates can move.`,
      linkedWorkItemIds: urgentItems.slice(0, 8).map((item) => item.id),
    },
    {
      id: "bank-readiness-notes",
      title: "Bank readiness notes",
      status: bankItems.length ? "Review" : "Draft",
      owner: "Finance",
      updatedAt: dateOnly(maxDate(rows.map((row) => row.updated_at))),
      body: `${bankItems.length} bank evidence work items are staged from CRAYS Core. Bank sends remain off.`,
      linkedWorkItemIds: bankItems.slice(0, 8).map((item) => item.id),
    },
    {
      id: "handoff-playbook",
      title: "Opening handoff playbook",
      status: "Draft",
      owner: "Expansion Manager",
      updatedAt: dateOnly(maxDate(rows.map((row) => row.updated_at))),
      body: `${handoffItems.length} property or handoff records are available for project planning, partner readiness and launch sequencing.`,
      linkedWorkItemIds: handoffItems.slice(0, 8).map((item) => item.id),
    },
  ];
}

function buildSavedViews(workItems: ProjectNativeWorkItem[]): ProjectSavedView[] {
  return [
    {
      id: "priority-review",
      name: "Priority review",
      layout: "Board",
      groupBy: "State",
      sortBy: "Priority",
      filters: [`priority: ${workItems.filter((item) => item.priority === "Urgent" || item.priority === "High").length} high priority`],
      fields: ["Identifier", "Title", "State", "Priority", "Assignees", "Due date"],
    },
    {
      id: "bank-evidence",
      name: "Bank evidence",
      layout: "List",
      groupBy: "Module",
      sortBy: "Due date",
      filters: [`module: ${workItems.filter((item) => item.modules.includes("Bank evidence")).length} bank evidence items`],
      fields: ["Identifier", "Title", "Bank handoff", "Candidate check", "Equity check"],
    },
    {
      id: "opening-handoff",
      name: "Opening handoff",
      layout: "Timeline",
      groupBy: "Cycle",
      sortBy: "Due date",
      filters: [`state: ${workItems.filter((item) => item.state === "In progress").length} in progress`],
      fields: ["Identifier", "Title", "Market", "Opening readiness", "Due date"],
    },
  ];
}

function stateFor(row: ProjectSeedRow): ProjectStateGroup {
  if (row.deal_status === "closed") return "Done";
  if (row.deal_status === "archived") return "Cancelled";
  if (row.bank_handoff_status === "blocked") return "To do";
  return stateByStage[row.deal_stage] ?? "Backlog";
}

function priorityFor(row: ProjectSeedRow, locationScore: number | null, openingReadiness: number | null): ProjectNativeWorkItem["priority"] {
  if (row.bank_handoff_status === "blocked" || row.deal_status === "blocked") return "Urgent";
  if ((locationScore ?? 100) < 72 || (openingReadiness ?? 100) < 55) return "High";
  if (row.deal_status === "active") return "Medium";
  if (row.deal_status === "review") return "Low";
  return "None";
}

function typeFor(row: ProjectSeedRow): ProjectNativeWorkItem["type"] {
  if (row.deal_stage === "bank_package" || row.deal_stage === "franchise_partner_handoff") return "Milestone";
  if (row.deal_stage === "deal_readiness" || row.deal_stage === "closing") return "Epic";
  return "Task";
}

function titleFor(row: ProjectSeedRow, market: string) {
  if (row.deal_stage === "bank_package") return `Bank evidence package - ${market}`;
  if (row.deal_stage === "deal_readiness") return `Prepared deal readiness - ${market}`;
  if (row.deal_stage === "franchise_partner_handoff") return `Opening handoff - ${market}`;
  return row.title?.replace("Prepared Franchise Deal - ", "Opening package - ") ?? `Opening package - ${market}`;
}

function leadFor(row: ProjectSeedRow) {
  if (row.deal_stage === "bank_package") return "Finance";
  if (row.deal_stage === "franchise_partner_handoff") return "Franchise Partner";
  if (row.case_status === "handoff_ready") return "Deal Manager";
  return "Expansion Manager";
}

function assigneesFor(row: ProjectSeedRow) {
  const assignees = new Set<string>(["Deal Manager"]);
  if (row.case_status !== "handoff_ready") assignees.add("Expansion Manager");
  if (row.bank_handoff_status === "blocked" || row.bank_handoff_status === "ready") assignees.add("Finance");
  if (row.kyc_aml_status !== "passed" || row.equity_status !== "verified") assignees.add("Reviewer");
  return Array.from(assignees);
}

function labelsFor(row: ProjectSeedRow) {
  return [
    readable(row.deal_stage),
    readable(row.deal_status),
    row.bank_handoff_status === "blocked" ? "bank blocker" : "",
    row.handoff_status === "ready" ? "owner ready" : "",
  ].filter(Boolean);
}

function modulesFor(row: ProjectSeedRow) {
  const modules = new Set<string>();
  if (row.case_id) modules.add("Owner property check");
  modules.add("Location Intelligence");
  modules.add("Prepared Deal");
  if (row.kyc_aml_status !== "passed" || row.equity_status !== "verified") modules.add("Candidate evidence");
  if (row.bank_handoff_status === "blocked" || row.bank_handoff_status === "ready" || row.deal_stage === "bank_package") modules.add("Bank evidence");
  if (row.deal_stage === "franchise_partner_handoff" || row.deal_stage === "closing") modules.add("Opening handoff");
  return Array.from(modules);
}

function blockingFor(row: ProjectSeedRow, requiredActions: string[]) {
  if (row.bank_handoff_status === "blocked") return requiredActions.length ? requiredActions : ["Bank evidence review"];
  return [];
}

function blockedByFor(row: ProjectSeedRow, requiredActions: string[]) {
  if (row.bank_handoff_status === "blocked") return ["Controlled release gate"];
  if (row.kyc_aml_status !== "passed") return ["Candidate evidence"];
  if (row.equity_status !== "verified") return ["Equity evidence"];
  return requiredActions.slice(0, 1);
}

function nextActionFor(row: ProjectSeedRow) {
  const fromReview = typeof row.review_summary?.nextAction === "string" ? row.review_summary.nextAction : "";
  if (fromReview) return fromReview;
  const firstAction = Array.isArray(row.required_actions) ? row.required_actions[0] : "";
  return firstAction || "Review prepared deal";
}

function estimateFor(locationScore: number | null, bankabilityScore: number | null, openingReadiness: number | null) {
  const signals = [locationScore, bankabilityScore, openingReadiness].filter((value): value is number => typeof value === "number");
  if (!signals.length) return "Unestimated";
  const average = signals.reduce((total, value) => total + value, 0) / signals.length;
  return `${Math.max(3, Math.round((100 - average) / 5) + 3)} points`;
}

function progressFor(items: ProjectNativeWorkItem[]) {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => {
    if (item.state === "Done") return sum + 100;
    if (item.state === "In progress") return sum + 55;
    if (item.state === "To do") return sum + 25;
    if (item.state === "Backlog") return sum + 10;
    return sum;
  }, 0);
  return Math.round(total / items.length);
}

function numberFromRecord(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function valueOrDash(value: number | null) {
  return typeof value === "number" ? String(value) : "-";
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dueDateFor(value: Date, priority: ProjectNativeWorkItem["priority"]) {
  const due = new Date(value);
  const days = priority === "Urgent" ? 2 : priority === "High" ? 5 : priority === "Medium" ? 10 : 14;
  due.setUTCDate(due.getUTCDate() + days);
  return dateOnly(due);
}

function minDate(values: Date[]) {
  if (!values.length) return new Date();
  return new Date(Math.min(...values.map((value) => value.getTime())));
}

function maxDate(values: Date[]) {
  if (!values.length) return new Date();
  return new Date(Math.max(...values.map((value) => value.getTime())));
}

function shortReference(label: string, value: string | null) {
  if (!value) return "";
  return `${label} ${numericSuffix(value, 0)}`;
}

function numericSuffix(value: string, fallback: number) {
  const match = value.match(/(\d{1,6})$/);
  if (!match) return String(fallback).padStart(4, "0");
  return match[1].padStart(4, "0");
}

function readable(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
