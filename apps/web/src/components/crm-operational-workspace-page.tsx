"use client";

import { ArrowRight, CalendarDays, Mail, UsersRound } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { EntityTable, type EntityTableRecord, type EntityTableStatus } from "@/components/crays/table/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createDefaultEntityTableState, type EntityTableState } from "@/lib/query-state/entity-table-query";
import { roleByKey } from "@/lib/roles";

export type CrmFamily =
  | "companies"
  | "people"
  | "leads"
  | "opportunities"
  | "emails"
  | "calendar-events"
  | "tasks"
  | "activities"
  | "notes";

type CrmRow = EntityTableRecord & {
  id: string;
  family: CrmFamily;
  label: string;
  status: string;
  owner: string;
  priority: string;
  updatedAt: string;
  craysEntityType: string;
  craysEntityId: string;
  fields: Record<string, string | number | boolean | null>;
};

export type CrmPayload = {
  status: "ready" | "not_configured" | "release_blocked" | "forbidden";
  role: string;
  resource: {
    label: string;
    description: string;
    sourceSystem: string;
    schemaStatus: string;
  };
  access: {
    allowed: boolean;
    reason: string;
    canStageCrmActivity: boolean;
  };
  summary: {
    records: number;
    companies: number;
    people: number;
    leads: number;
    opportunities: number;
    emails: number;
    calendarEvents: number;
    tasks: number;
    activities: number;
    notes: number;
    blockers: number;
    freshnessMinutes: number | null;
  };
  family: CrmFamily;
  rows: CrmRow[];
  pageInfo: {
    offset: number;
    limit: number;
    total: number;
    totalReliable: true;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  actions: {
    commandRoute: "/api/crays/core-command/crm-activity";
    confirmationHeader: "stage-crm-activity-command";
    applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY";
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    externalSendingEnabled: false;
  };
  provenance: {
    sourceSystem: "twenty";
    schemaStatus: "requires-discovery";
    projectionSource: "crays-core";
    seedBatch: string;
    note: string;
  };
  note: string;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: CrmPayload; error: null }
  | { state: "error"; data: null; error: string };

const familyLabels: Record<CrmFamily, string> = {
  companies: "Companies",
  people: "People",
  leads: "Leads",
  opportunities: "Opportunities",
  emails: "Inbox",
  "calendar-events": "Calendar",
  tasks: "Tasks",
  activities: "Timeline",
  notes: "Notes",
};

const familyDescriptions: Record<CrmFamily, string> = {
  companies: "Company address book with ownership, markets, contact volume and linked opportunities.",
  people: "Person/contact address book scoped to CRAYS roles and linked companies/opportunities.",
  leads: "Lead intake and qualification queue across candidate, partner and owner sources.",
  opportunities: "Franchise opportunity pipeline with value, stage, close date, blockers and next actions.",
  emails: "Role-scoped CRM inbox. External sending is closed; follow-ups can only be staged as CRAYS drafts.",
  "calendar-events": "Meeting and site-visit calendar. Calendar writes are closed; event drafts are staged in CRAYS.",
  tasks: "Follow-up and workflow tasks attached to CRM records.",
  activities: "Activity timeline across calls, meetings, messages and source updates.",
  notes: "Scoped CRM notes and review summaries.",
};

const defaultSortByFamily: Record<CrmFamily, Array<{ id: string; desc: boolean }>> = {
  companies: [{ id: "updatedAt", desc: true }],
  people: [{ id: "updatedAt", desc: true }],
  leads: [{ id: "score", desc: true }],
  opportunities: [{ id: "amountEur", desc: true }],
  emails: [{ id: "receivedAt", desc: true }],
  "calendar-events": [{ id: "startAt", desc: false }],
  tasks: [{ id: "dueDate", desc: false }],
  activities: [{ id: "activityAt", desc: true }],
  notes: [{ id: "updatedAt", desc: true }],
};

function familyFrom(view?: string, record?: string): CrmFamily {
  const value = record || view || "opportunities";
  if (value === "home") return "opportunities";
  if (value === "inbox") return "emails";
  if (value === "calendar") return "calendar-events";
  if (value === "pipeline") return "opportunities";
  if (value === "timeline") return "activities";
  if (["companies", "people", "leads", "opportunities", "emails", "calendar-events", "tasks", "activities", "notes"].includes(value)) return value as CrmFamily;
  return "opportunities";
}

function value(row: CrmRow, key: string) {
  return row[key] ?? row.fields[key] ?? "";
}

function textCell(key: string, fallback = "-") {
  function CrmOperationalTextCell({ row }: { row: { original: CrmRow } }) {
    const raw = value(row.original, key);
    return <span className="block max-w-[260px] truncate">{raw === null || raw === undefined || raw === "" ? fallback : String(raw)}</span>;
  }
  return CrmOperationalTextCell;
}

function columnsForFamily(family: CrmFamily): ColumnDef<CrmRow, unknown>[] {
  if (family === "companies") {
    return [
      { accessorKey: "label", header: "Company", meta: { label: "Company" } },
      { id: "address", header: "Address", cell: textCell("address"), meta: { label: "Address" } },
      { id: "city", header: "City", cell: textCell("city"), meta: { label: "City" } },
      { id: "peopleCount", header: "People", cell: textCell("peopleCount"), meta: { label: "People" } },
      { id: "opportunityCount", header: "Opportunities", cell: textCell("opportunityCount"), meta: { label: "Opportunities" } },
      { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
    ];
  }
  if (family === "people") {
    return [
      { accessorKey: "label", header: "Person", meta: { label: "Person" } },
      { id: "company", header: "Company", cell: textCell("company"), meta: { label: "Company" } },
      { id: "role", header: "Role", cell: textCell("role"), meta: { label: "Role" } },
      { id: "email", header: "Email", cell: textCell("email"), meta: { label: "Email" } },
      { id: "city", header: "City", cell: textCell("city"), meta: { label: "City" } },
      { id: "nextContactAt", header: "Next contact", cell: textCell("nextContactAt"), meta: { label: "Next contact" } },
    ];
  }
  if (family === "leads") {
    return [
      { accessorKey: "label", header: "Lead", meta: { label: "Lead" } },
      { accessorKey: "status", header: "Stage", meta: { label: "Stage" } },
      { id: "source", header: "Source", cell: textCell("source"), meta: { label: "Source" } },
      { id: "city", header: "City", cell: textCell("city"), meta: { label: "City" } },
      { id: "score", header: "Score", cell: textCell("score"), meta: { label: "Score" } },
      { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
    ];
  }
  if (family === "opportunities") {
    return [
      { accessorKey: "label", header: "Opportunity", meta: { label: "Opportunity" } },
      { accessorKey: "status", header: "Stage", meta: { label: "Stage" } },
      { id: "company", header: "Company", cell: textCell("company"), meta: { label: "Company" } },
      { id: "amountEur", header: "Amount", cell: textCell("amountEur"), meta: { label: "Amount" } },
      { id: "closeDate", header: "Close", cell: textCell("closeDate"), meta: { label: "Close" } },
      { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
    ];
  }
  if (family === "emails") {
    return [
      { id: "receivedAt", header: "Received", cell: textCell("receivedAt"), meta: { label: "Received" } },
      { id: "from", header: "From", cell: textCell("from"), meta: { label: "From" } },
      { accessorKey: "label", header: "Subject", meta: { label: "Subject" } },
      { accessorKey: "status", header: "Lane", meta: { label: "Lane" } },
      { id: "relatedRecord", header: "Related record", cell: textCell("relatedRecord"), meta: { label: "Related record" } },
      { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
    ];
  }
  if (family === "calendar-events") {
    return [
      { id: "startAt", header: "Start", cell: textCell("startAt"), meta: { label: "Start" } },
      { accessorKey: "label", header: "Event", meta: { label: "Event" } },
      { id: "location", header: "Location", cell: textCell("location"), meta: { label: "Location" } },
      { id: "attendees", header: "Attendees", cell: textCell("attendees"), meta: { label: "Attendees" } },
      { id: "relatedRecord", header: "Related record", cell: textCell("relatedRecord"), meta: { label: "Related record" } },
      { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
    ];
  }
  if (family === "tasks") {
    return [
      { id: "dueDate", header: "Due", cell: textCell("dueDate"), meta: { label: "Due" } },
      { accessorKey: "label", header: "Task", meta: { label: "Task" } },
      { accessorKey: "status", header: "Status", meta: { label: "Status" } },
      { accessorKey: "priority", header: "Priority", meta: { label: "Priority" } },
      { id: "relatedRecord", header: "Related record", cell: textCell("relatedRecord"), meta: { label: "Related record" } },
      { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
    ];
  }
  if (family === "activities") {
    return [
      { id: "activityAt", header: "When", cell: textCell("activityAt"), meta: { label: "When" } },
      { accessorKey: "label", header: "Activity", meta: { label: "Activity" } },
      { id: "activityType", header: "Type", cell: textCell("activityType"), meta: { label: "Type" } },
      { id: "relatedRecord", header: "Related record", cell: textCell("relatedRecord"), meta: { label: "Related record" } },
      { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
      { accessorKey: "status", header: "Status", meta: { label: "Status" } },
    ];
  }
  return [
    { accessorKey: "updatedAt", header: "Updated", meta: { label: "Updated" } },
    { accessorKey: "label", header: "Note", meta: { label: "Note" } },
    { id: "summary", header: "Summary", cell: textCell("summary"), meta: { label: "Summary" } },
    { id: "relatedRecord", header: "Related record", cell: textCell("relatedRecord"), meta: { label: "Related record" } },
    { id: "nextAction", header: "Next action", cell: textCell("nextAction"), meta: { label: "Next action" } },
    { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
    { accessorKey: "status", header: "Status", meta: { label: "Status" } },
  ];
}

function formatFreshness(minutes: number | null) {
  if (minutes === null) return "freshness unknown";
  if (minutes < 60) return `${minutes} min freshness`;
  return `${Math.round(minutes / 60)} h freshness`;
}

function familyTotal(summary: CrmPayload["summary"], family: CrmFamily) {
  if (family === "companies") return summary.companies;
  if (family === "people") return summary.people;
  if (family === "leads") return summary.leads;
  if (family === "opportunities") return summary.opportunities;
  if (family === "emails") return summary.emails;
  if (family === "calendar-events") return summary.calendarEvents;
  if (family === "tasks") return summary.tasks;
  if (family === "activities") return summary.activities;
  if (family === "notes") return summary.notes;
  return summary.records;
}

function statusForLoad(loadState: LoadState, data: CrmPayload | null): EntityTableStatus {
  if (loadState.state === "loading") return { state: "loading", message: "Resolving CRM operational records through CRAYS Core." };
  if (loadState.state === "error") return { state: "error", message: loadState.error };
  if (!data?.access.allowed) return { state: "permission", message: data?.access.reason ?? "This role cannot access this CRM workspace." };
  if (!data.rows.length) return { state: "empty", message: "The operational fixture is not seeded for this CRM family yet." };
  return { state: "ready" };
}

async function loadCrm(role: string, family: CrmFamily, state: EntityTableState, signal: AbortSignal) {
  const sort = state.sorting[0] ?? defaultSortByFamily[family][0];
  const params = new URLSearchParams({
    role,
    family,
    search: state.search,
    filters: JSON.stringify(state.filters),
    sortField: sort.id,
    sortDirection: sort.desc ? "desc" : "asc",
    offset: String(state.pagination.pageIndex * state.pagination.pageSize),
    limit: String(state.pagination.pageSize),
  });
  const response = await fetch(`/api/crays/crm/operational/read-model?${params.toString()}`, { cache: "no-store", signal });
  const payload = (await response.json()) as CrmPayload;
  if (!response.ok && response.status !== 403 && response.status !== 423 && response.status !== 503) {
    throw new Error(`CRM operational read returned HTTP ${response.status}`);
  }
  return payload;
}

export function CrmOperationalWorkspacePage({
  role,
  view,
  record,
  initialPayload = null,
}: {
  role?: string;
  view?: string;
  record?: string;
  initialPayload?: CrmPayload | null;
}) {
  const activeRole = roleByKey(role).key;
  const activeFamily = familyFrom(view, record);
  const isHome = !view || view === "home";

  return <CrmOperationalContent key={`${activeRole}:${activeFamily}:${isHome}`} activeRole={activeRole} activeFamily={activeFamily} isHome={isHome} initialPayload={initialPayload} />;
}

function CrmOperationalContent({
  activeRole,
  activeFamily,
  isHome,
  initialPayload,
}: {
  activeRole: string;
  activeFamily: CrmFamily;
  isHome: boolean;
  initialPayload?: CrmPayload | null;
}) {
  const hasInitialPayload = Boolean(initialPayload && initialPayload.family === activeFamily);
  const [tableState, setTableState] = React.useState<EntityTableState>(() =>
    createDefaultEntityTableState({ pagination: { pageIndex: 0, pageSize: 25 }, sorting: defaultSortByFamily[activeFamily] }),
  );
  const [loadState, setLoadState] = React.useState<LoadState>(() => (hasInitialPayload ? { state: "ready", data: initialPayload as CrmPayload, error: null } : { state: "loading", data: null, error: null }));
  const skipInitialFetchRef = React.useRef(hasInitialPayload);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const controller = new AbortController();
    loadCrm(activeRole, activeFamily, tableState, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "CRM operational read unavailable." });
      });
    return () => controller.abort();
  }, [activeFamily, activeRole, tableState]);

  const data = loadState.data;
  const rows = React.useMemo(() => data?.rows ?? [], [data?.rows]);
  const selectedRow = React.useMemo(() => rows.find((row) => row.id === selectedId) ?? rows[0] ?? null, [rows, selectedId]);
  const columns = React.useMemo(() => columnsForFamily(activeFamily), [activeFamily]);
  const pageIndex = Math.floor((data?.pageInfo.offset ?? 0) / Math.max(data?.pageInfo.limit ?? tableState.pagination.pageSize, 1));
  const pageInfo = data
    ? {
        pageIndex,
        pageSize: data.pageInfo.limit,
        total: data.pageInfo.total,
        totalReliable: data.pageInfo.totalReliable,
        hasNextPage: data.pageInfo.hasNextPage,
        hasPreviousPage: data.pageInfo.hasPreviousPage,
      }
    : undefined;

  async function stageFollowUp() {
    if (!selectedRow || !data?.access.canStageCrmActivity) return;
    setReceipt(null);
    const commandType = activeFamily === "calendar-events" ? "calendar_event" : activeFamily === "tasks" ? "task" : "activity";
    const action = activeFamily === "calendar-events" ? "schedule_event" : activeFamily === "tasks" ? "create_task" : "log_activity";
    const response = await fetch(`${data.actions.commandRoute}?role=${encodeURIComponent(activeRole)}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-crays-dev-confirm": data.actions.confirmationHeader,
      },
      body: JSON.stringify({
        idempotencyKey: `crm-operational:${activeFamily}:${selectedRow.id}:review`,
        actorRole: activeRole,
        commandType,
        action,
        subject: `Review ${familyLabels[activeFamily]} record: ${selectedRow.label}`,
        body: String(selectedRow.fields.nextAction ?? selectedRow.fields.summary ?? `Review ${selectedRow.label} and stage the next safe action.`),
        status: "drafted",
        priority: selectedRow.priority,
        dueDate: String(selectedRow.fields.dueDate ?? selectedRow.fields.nextContactAt ?? ""),
        companyId: activeFamily === "companies" ? selectedRow.id : String(selectedRow.fields.companyId ?? ""),
        personId: activeFamily === "people" || activeFamily === "leads" ? selectedRow.id : String(selectedRow.fields.personId ?? ""),
        opportunityId: activeFamily === "opportunities" ? selectedRow.id : String(selectedRow.fields.opportunityId ?? ""),
        activityId: activeFamily === "activities" || activeFamily === "emails" || activeFamily === "notes" ? selectedRow.id : "",
        taskId: activeFamily === "tasks" ? selectedRow.id : "",
        calendarEventId: activeFamily === "calendar-events" ? selectedRow.id : "",
      }),
    });
    const payload = (await response.json()) as { status?: string; reason?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string }; error?: string };
    if (!response.ok) {
      setReceipt(payload.reason ?? payload.error ?? `CRM command draft was blocked with HTTP ${response.status}.`);
      return;
    }
    setReceipt(`Staged ${payload.result?.commandId ?? "CRM command draft"} · ${payload.result?.applyGate ?? data.actions.applyGate} · target apply ${payload.result?.targetApplyStatus ?? "blocked"}`);
  }

  const cards = data
    ? [
        { label: "Companies", value: data.summary.companies, href: `/crm?role=${activeRole}&view=records&record=companies` },
        { label: "People", value: data.summary.people, href: `/crm?role=${activeRole}&view=records&record=people` },
        { label: "Leads", value: data.summary.leads, href: `/crm?role=${activeRole}&view=records&record=leads` },
        { label: "Opportunities", value: data.summary.opportunities, href: `/crm?role=${activeRole}&view=pipeline&record=opportunities` },
        { label: "Inbox", value: data.summary.emails, href: `/crm?role=${activeRole}&view=inbox&record=emails` },
        { label: "Calendar", value: data.summary.calendarEvents, href: `/crm?role=${activeRole}&view=calendar&record=calendar-events` },
        { label: "Tasks", value: data.summary.tasks, href: `/crm?role=${activeRole}&view=tasks&record=tasks` },
        { label: "Timeline", value: data.summary.activities, href: `/crm?role=${activeRole}&view=timeline&record=activities` },
        { label: "Notes", value: data.summary.notes, href: `/crm?role=${activeRole}&view=notes&record=notes` },
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
      <section className="rounded-[16px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <UsersRound className="size-4 text-emerald-700" aria-hidden="true" />
              CRM operational workspace
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{isHome ? "CRM operating database" : familyLabels[activeFamily]}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              {isHome ? "Global CRAYS/Core projection of CRM operations across companies, people, leads, opportunities, inbox, calendar, tasks and activity." : familyDescriptions[activeFamily]}
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <Badge variant="success">{data?.summary.records ?? 0} CRM records</Badge>
            <Badge variant="info">{data ? familyTotal(data.summary, activeFamily).toLocaleString("en-US") : 0} {familyLabels[activeFamily].toLowerCase()} records</Badge>
            <Badge variant={data?.summary.blockers ? "warning" : "success"}>{data?.summary.blockers ?? 0} blockers</Badge>
            <Badge variant="secondary">{formatFreshness(data?.summary.freshnessMinutes ?? null)}</Badge>
            <Badge variant="outline">{data?.provenance.schemaStatus ?? "requires-discovery"}</Badge>
          </div>
        </div>
      </section>

      {isHome ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className="rounded-[16px] border border-border bg-card p-4 shadow-sm transition hover:border-emerald-700/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{card.label}</p>
                  <strong className="mt-3 block text-3xl font-semibold">{card.value.toLocaleString("en-US")}</strong>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm leading-5 text-muted-foreground">Open the real {card.label.toLowerCase()} work surface.</p>
            </Link>
          ))}
        </section>
      ) : null}

      {activeFamily === "emails" ? (
        <section className="grid gap-3 md:grid-cols-4">
          {["needs-reply", "waiting-on-us", "bank-review", "property-owner"].map((lane) => (
            <article key={lane} className="rounded-[12px] border border-border bg-card p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Mail className="size-4" /> {lane.replaceAll("-", " ")}</p>
              <strong className="mt-2 block text-2xl">{rows.filter((row) => row.status === lane).length}</strong>
            </article>
          ))}
        </section>
      ) : null}

      {activeFamily === "calendar-events" ? (
        <section className="grid gap-3 md:grid-cols-4">
          {rows.slice(0, 4).map((row) => (
            <article key={row.id} className="rounded-[12px] border border-border bg-card p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><CalendarDays className="size-4" /> {String(row.fields.startAt ?? "Scheduled")}</p>
              <strong className="mt-2 block text-sm">{row.label}</strong>
              <p className="mt-2 text-xs text-muted-foreground">{String(row.fields.location ?? row.fields.relatedRecord ?? "CRM event")}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <EntityTable
          resourceLabel={familyLabels[activeFamily]}
          resourceDescription={`${familyDescriptions[activeFamily]} Rows are paged from the CRAYS Core/BFF read model.`}
          columns={columns}
          data={rows}
          state={tableState}
          status={statusForLoad(loadState, data)}
          pageInfo={pageInfo}
          bulkActions={[{ id: "focus", label: "Focus selected" }]}
          getRowId={(row) => row.id}
          onStateChange={setTableState}
          onRowOpen={(row) => setSelectedId(row.id)}
          onBulkAction={(actionId, selectedIds) => {
            if (actionId === "focus" && selectedIds[0]) setSelectedId(selectedIds[0]);
          }}
          onRetry={() => setTableState({ ...tableState })}
        />

        <aside className="space-y-4">
          <article className="rounded-[16px] border border-border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Selected record</h2>
            {selectedRow ? (
              <div className="mt-4 space-y-3">
                {[
                  ["Record", selectedRow.label],
                  ["Status", selectedRow.status],
                  ["Owner", selectedRow.owner],
                  ["Priority", selectedRow.priority],
                  ["CRAYS type", selectedRow.craysEntityType],
                ].map(([label, display]) => (
                  <div key={label} className="rounded-[8px] border border-border bg-background p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-medium">{display}</p>
                  </div>
                ))}
                {["company", "city", "relatedRecord", "nextAction", "blocker", "summary"].map((key) =>
                  selectedRow.fields[key] ? (
                    <div key={key} className="rounded-[8px] border border-border bg-background p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{key.replaceAll("-", " ")}</p>
                      <p className="mt-1 text-sm font-medium">{String(selectedRow.fields[key])}</p>
                    </div>
                  ) : null,
                )}
                <Button type="button" className="w-full" disabled={!data?.access.canStageCrmActivity} title={data?.access.canStageCrmActivity ? undefined : data?.access.reason} onClick={stageFollowUp}>
                  Stage CRAYS follow-up draft
                </Button>
                {receipt ? <p className="rounded-[8px] border border-border bg-secondary p-3 text-sm">{receipt}</p> : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Select a row to inspect record scope and next action.</p>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
