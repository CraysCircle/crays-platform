"use client";

import { ArrowRight, BriefcaseBusiness, LockKeyhole } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { EntityForm } from "@/components/crays/forms/entity-form";
import { FieldDisplay } from "@/components/crays/forms/field-display";
import { CrmDealEntityWorkspace } from "@/components/crm-deal-entity-workspace";
import { EntityTable, type EntityTableRecord, type EntityTableStatus } from "@/components/crays/table/entity-table";
import { Badge } from "@/components/ui/badge";
import { createDefaultEntityTableState, type EntityTableState } from "@/lib/query-state/entity-table-query";
import type { ResourceCommandReceipt, ResourceFieldDescriptor, ResourceFilter } from "@/lib/resources";
import { roleByKey } from "@/lib/roles";

type CrmDealRow = EntityTableRecord & {
  id: string;
  dealId: string;
  preparedOfferId: string;
  propertyCaseId: string;
  candidateName: string;
  candidateCompany: string;
  siteName: string;
  stage: string;
  priority: string;
  status: string;
  owner: string;
  audience: string;
  blocker: string;
  nextAction: string;
  updatedAt: string;
  sourceRecordId: string;
  href: string;
  context: string;
  value: string | number | boolean | null;
  unit: string | null;
  fields: Record<string, unknown>;
};

type CrmDealCollectionPayload = {
  status: "ready" | "release_blocked" | "forbidden";
  serverAuthority: string;
  tenantId: string;
  role: string;
  resource: {
    fields: ResourceFieldDescriptor[];
  };
  access: {
    allowed: boolean;
    reason: string;
    canStageOfferReview: boolean;
  };
  summary: {
    records: number;
    blockers: number;
    attention: number;
    conflicts: number;
    readinessScore: number;
    freshnessMinutes: number | null;
  };
  offerContext: {
    candidateName: string;
    candidateCompany: string;
    siteName: string;
    address: string;
  };
  rows: CrmDealRow[];
  actions: {
    canUpdateDeal: boolean;
    commandRoute: "/api/crays/resources/command";
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
  };
  note: string;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: CrmDealCollectionPayload; error: null }
  | { state: "error"; data: null; error: string };

const columns: ColumnDef<CrmDealRow, unknown>[] = [
  { accessorKey: "candidateName", header: "Candidate", meta: { label: "Candidate" } },
  { accessorKey: "stage", header: "Stage", meta: { label: "Stage" } },
  { accessorKey: "priority", header: "Priority", meta: { label: "Priority" } },
  { accessorKey: "owner", header: "Owner", meta: { label: "Owner" } },
  { accessorKey: "blocker", header: "Blocker", meta: { label: "Blocker" } },
  { accessorKey: "updatedAt", header: "Updated", meta: { label: "Updated" } },
];

const editableDealFieldKeys = new Set(["stage", "priority", "owner", "nextAction", "blocker"]);

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left ?? "").localeCompare(String(right ?? ""), "en", { numeric: true, sensitivity: "base" });
}

function matchesFilter(row: CrmDealRow, filter: ResourceFilter) {
  const value = row[filter.field];
  const expected = filter.value;

  switch (filter.operator) {
    case "eq":
      return text(value) === text(expected);
    case "neq":
      return text(value) !== text(expected);
    case "contains":
      return text(value).includes(text(expected));
    case "startsWith":
      return text(value).startsWith(text(expected));
    case "in":
      return Array.isArray(expected) ? expected.map(text).includes(text(value)) : text(value) === text(expected);
    case "gt":
      return compareValues(value, expected) > 0;
    case "gte":
      return compareValues(value, expected) >= 0;
    case "lt":
      return compareValues(value, expected) < 0;
    case "lte":
      return compareValues(value, expected) <= 0;
    case "isNull":
      return value === null || value === undefined || value === "";
    default:
      return true;
  }
}

function applyTableState(rows: CrmDealRow[], state: EntityTableState) {
  const search = state.search.trim().toLowerCase();
  const searched = search
    ? rows.filter((row) => [row.candidateName, row.candidateCompany, row.stage, row.priority, row.owner, row.status, row.blocker, row.nextAction, row.siteName].join(" ").toLowerCase().includes(search))
    : rows;
  const filtered = state.filters.reduce((current, filter) => current.filter((row) => matchesFilter(row, filter)), searched);
  const sorted = [...filtered].sort((left, right) => {
    for (const sort of state.sorting) {
      const direction = sort.desc ? -1 : 1;
      const result = compareValues(left[sort.id], right[sort.id]);
      if (result !== 0) return result * direction;
    }
    return 0;
  });
  const start = state.pagination.pageIndex * state.pagination.pageSize;

  return {
    total: sorted.length,
    rows: sorted.slice(start, start + state.pagination.pageSize),
  };
}

async function loadCrmDeals(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/crm/deals/read-model?role=${role}`, { cache: "no-store", signal });
  const payload = (await response.json()) as CrmDealCollectionPayload;

  if (!response.ok && response.status !== 403 && response.status !== 423) {
    throw new Error(`CRM deals returned HTTP ${response.status}`);
  }

  return payload;
}

async function submitCraysCommand(role: string, route: string, body: unknown) {
  const response = await fetch(`${route}?role=${role}`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { receipt?: ResourceCommandReceipt; message?: string };

  if (!payload.receipt) {
    throw new Error(payload.message ?? `CRAYS command returned HTTP ${response.status}`);
  }

  return payload.receipt;
}

function formatFreshness(minutes: number | null) {
  if (minutes === null) return "freshness unknown";
  if (minutes < 60) return `${minutes} min freshness`;
  return `${Math.round(minutes / 60)} h freshness`;
}

function statusForLoad(loadState: LoadState, data: CrmDealCollectionPayload | null): EntityTableStatus {
  if (loadState.state === "loading") return { state: "loading", message: "Resolving CRM deals through CRAYS Core." };
  if (loadState.state === "error") return { state: "error", message: loadState.error };
  if (!data?.access.allowed) return { state: "permission", message: data?.access.reason ?? "This role cannot access CRM deals." };
  return { state: "ready" };
}

export function CrmDealCollectionPage({ role }: { role?: string }) {
  const activeRole = roleByKey(role).key;

  return <CrmDealCollectionContent key={activeRole} activeRole={activeRole} />;
}

function CrmDealCollectionContent({ activeRole }: { activeRole: string }) {
  const [loadState, setLoadState] = React.useState<LoadState>({ state: "loading", data: null, error: null });
  const [tableState, setTableState] = React.useState<EntityTableState>(() => createDefaultEntityTableState({ pagination: { pageIndex: 0, pageSize: 10 } }));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    loadCrmDeals(activeRole, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "CRM deals unavailable." });
      });

    return () => controller.abort();
  }, [activeRole]);

  const data = loadState.data;
  const visible = React.useMemo(() => applyTableState(data?.rows ?? [], tableState), [data?.rows, tableState]);
  const selectedRow = React.useMemo(() => visible.rows.find((row) => row.id === selectedId) ?? visible.rows[0] ?? data?.rows[0] ?? null, [data?.rows, selectedId, visible.rows]);
  const editFields = React.useMemo(() => (data?.resource.fields ?? []).filter((field) => editableDealFieldKeys.has(field.key) && field.updatePermission), [data?.resource.fields]);
  const initialValues = React.useMemo(
    () =>
      selectedRow
        ? {
            stage: selectedRow.stage,
            priority: selectedRow.priority,
            owner: selectedRow.owner,
            nextAction: selectedRow.nextAction,
            blocker: selectedRow.blocker,
          }
        : {},
    [selectedRow],
  );

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
      <section className="rounded-[16px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <BriefcaseBusiness className="size-4 text-emerald-700" aria-hidden="true" />
              CRM deal collection
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Deal work queue</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              Object-led CRM workspace backed by CRAYS Core. Twenty schema-backed CRM resources remain discovery-gated until verified; this slice uses the CRAYS deal projection and the shared table/form command contract.
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <Badge variant="success">{data?.summary.records ?? 0} records</Badge>
            <Badge variant={data?.summary.blockers ? "warning" : "success"}>{data?.summary.blockers ?? 0} blockers</Badge>
            <Badge variant="info">{data?.summary.readinessScore ?? 0}% readiness</Badge>
            <Badge variant="secondary">{formatFreshness(data?.summary.freshnessMinutes ?? null)}</Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <EntityTable
          resourceLabel="CRM deals"
          resourceDescription="Search, filter, sort and page the CRAYS deal projection without exposing native CRM source APIs."
          columns={columns}
          data={visible.rows}
          state={tableState}
          status={statusForLoad(loadState, data)}
          pageInfo={{
            pageIndex: tableState.pagination.pageIndex,
            pageSize: tableState.pagination.pageSize,
            total: visible.total,
            totalReliable: true,
            hasNextPage: (tableState.pagination.pageIndex + 1) * tableState.pagination.pageSize < visible.total,
            hasPreviousPage: tableState.pagination.pageIndex > 0,
          }}
          savedViews={[
            { id: "blocked-deals", label: "Blocked deals", scope: "role" },
            { id: "bank-package-review", label: "Bank package review", scope: "team" },
          ]}
          bulkActions={[
            { id: "focus-selected", label: "Focus selected" },
          ]}
          onStateChange={(nextState) => {
            setTableState(nextState);
            setSelectedId(null);
          }}
          onRowOpen={(row) => setSelectedId(String(row.id))}
          onBulkAction={(_actionId, selectedRowIds) => {
            const nextSelectedId = selectedRowIds[0];
            if (nextSelectedId) setSelectedId(nextSelectedId);
          }}
        />

        <aside className="space-y-4">
          <section className="rounded-[16px] border border-border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Selected deal</h2>
            {selectedRow ? (
              <div className="mt-4 grid gap-3 text-sm">
                {[
                  ["Candidate", selectedRow.candidateName],
                  ["Company", selectedRow.candidateCompany],
                  ["Site", selectedRow.siteName],
                  ["Stage", selectedRow.stage],
                  ["Priority", selectedRow.priority],
                  ["Owner", selectedRow.owner],
                  ["Blocker", selectedRow.blocker || "No blocker recorded"],
                  ["Next action", selectedRow.nextAction],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                    <div className="mt-1 font-medium">
                      <FieldDisplay field={{ key: label, label, type: "text", nullable: true, pii: "business", public: false, listVisible: true, detailVisible: true, clientSelectable: true, filterOperators: [], sortable: false, readScopes: ["deal"], source: { system: "crays-core" } }} value={value} />
                    </div>
                  </div>
                ))}
                <Link href={`/dashboard?role=${activeRole}&view=case`} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Open case workspace
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Select a deal row to see its current owner, blocker and next action.</p>
            )}
          </section>

          {selectedRow && data?.access.allowed ? (
            <EntityForm
              key={selectedRow.id}
              resource="deals"
              resourceLabel="Stage deal command"
              operation="update"
              recordId={selectedRow.dealId}
              fields={editFields}
              initialValues={initialValues}
              canSubmit={data.actions.canUpdateDeal}
              disabledReason={data.actions.canUpdateDeal ? undefined : "This role can inspect the deal but cannot stage a CRM command."}
              submitLabel="Stage gated command"
              onSubmit={({ envelope }) => submitCraysCommand(activeRole, data.actions.commandRoute, envelope)}
            />
          ) : (
            <section className="rounded-[16px] border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
              <div className="flex items-start gap-2">
                <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>Deal command staging appears only when CRAYS Core returns an allowed deal scope. Source writes and apply remain closed.</p>
              </div>
            </section>
          )}
        </aside>
      </section>

      <CrmDealEntityWorkspace role={activeRole} row={selectedRow} />
    </div>
  );
}
