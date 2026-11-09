"use client";

import { Activity, ArrowRight, FileText, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type CrmDealEntityRow = {
  id: string;
  dealId: string;
  preparedOfferId: string;
  propertyCaseId: string;
  candidateName: string;
  candidateCompany: string;
  siteName: string;
  stage: string;
  priority: string;
  owner: string;
  blocker: string;
  nextAction: string;
};

type WorkspaceSection = {
  key: string;
  label: string;
  status: string;
  state: string;
  ownerRole: string;
  blocker: string;
  nextAction: string;
};

type ActivityEvent = {
  eventId: string;
  source: string;
  label: string;
  occurredAt: string;
};

type DocumentItem = {
  linkId: string;
  documentGroup: string;
  status: string;
  versionLabel: string;
  requiredFor?: string | null;
};

type CommandRecord = {
  commandId: string;
  moduleLabel: string;
  targetApplyStatus: string;
  createdAt?: string;
};

type EntityWorkspacePayload = {
  status: "ready" | "forbidden" | "validation_failed";
  workspace?: {
    access: { allowed: boolean; reason: string };
    summary: {
      sections: number;
      readySections: number;
      blockedSections: number;
      commandDrafts: number;
    };
    sections: WorkspaceSection[];
  };
  activity?: {
    access: { allowed: boolean; reason: string };
    summary: {
      documents: number;
      workflowEvents: number;
      commandEvents: number;
      communicationEvents: number;
      sourceEvents: number;
    };
    events: ActivityEvent[];
    documents: DocumentItem[];
  };
  history?: {
    access: { allowed: boolean; reason: string };
    records: CommandRecord[];
  };
  sourceWritesEnabled: false;
  syncApplyEnabled: false;
  targetApplyEnabled: false;
  note: string;
  message?: string;
};

type LoadState =
  | { state: "idle"; data: null; error: null }
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: EntityWorkspacePayload; error: null }
  | { state: "error"; data: null; error: string };

function labelize(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replaceAll("-", " ") : "Not set";
}

function sectionClass(status: string) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-950";
  if (status === "waiting") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-sky-200 bg-sky-50 text-sky-950";
}

async function loadEntityWorkspace(role: string, row: CrmDealEntityRow, signal: AbortSignal) {
  const params = new URLSearchParams({
    role,
    dealId: row.dealId,
    preparedOfferId: row.preparedOfferId,
    propertyCaseId: row.propertyCaseId,
  });
  const response = await fetch(`/api/crays/crm/deals/workspace?${params.toString()}`, { cache: "no-store", signal });
  const payload = (await response.json()) as EntityWorkspacePayload;

  if (!response.ok && response.status !== 403 && response.status !== 422) {
    throw new Error(`CRM entity workspace returned HTTP ${response.status}`);
  }

  return payload;
}

export function CrmDealEntityWorkspace({
  role,
  row,
}: {
  role: string;
  row: CrmDealEntityRow | null;
}) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [loadState, setLoadState] = React.useState<LoadState>({ state: "idle", data: null, error: null });

  React.useEffect(() => {
    if (!row) {
      return;
    }

    const controller = new AbortController();
    let active = true;
    queueMicrotask(() => {
      if (active) setLoadState({ state: "loading", data: null, error: null });
    });

    loadEntityWorkspace(role, row, controller.signal)
      .then((payload) => setLoadState({ state: "ready", data: payload, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "CRM entity workspace unavailable." });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshKey, role, row]);

  if (!row) {
    return (
      <section className="rounded-[16px] border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        Select a deal to load its entity workspace.
      </section>
    );
  }

  const caseHref = `/dashboard?role=${role}&view=case&case=${row.preparedOfferId}&deal=${row.dealId}&propertyCase=${row.propertyCaseId}`;

  if (loadState.state === "loading" || loadState.state === "idle") {
    return (
      <section className="rounded-[16px] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          Loading CRM entity workspace
        </div>
      </section>
    );
  }

  if (loadState.state === "error") {
    return (
      <section className="rounded-[16px] border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm">
        <h2 className="font-semibold">Entity workspace unavailable</h2>
        <p className="mt-2 text-sm">{loadState.error}</p>
      </section>
    );
  }

  const data = loadState.data;
  const workspace = data.workspace;
  const activity = data.activity;
  const history = data.history;
  const eventCount = activity ? activity.summary.workflowEvents + activity.summary.commandEvents + activity.summary.communicationEvents + activity.summary.sourceEvents : 0;

  if (data.status !== "ready" || !workspace || !activity || !history) {
    return (
      <section className="rounded-[16px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
        <div className="flex items-start gap-2">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Entity workspace is gated</h2>
            <p className="mt-2 text-sm">{data.message ?? workspace?.access.reason ?? "CRAYS Core denied this entity workspace for the current role."}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[16px] border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-700" aria-hidden="true" />
            CRM entity workspace
          </p>
          <h2 className="mt-2 text-xl font-semibold">{row.candidateName}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {row.stage} · {row.owner} owns the next action: {row.nextAction}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={workspace.summary.blockedSections ? "warning" : "success"}>{workspace.summary.blockedSections} blockers</Badge>
          <Badge variant="info">{eventCount} events</Badge>
          <Badge variant="secondary">{history.records.length} commands</Badge>
          <Button type="button" variant="outline" size="sm" onClick={() => setRefreshKey((value) => value + 1)}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href={caseHref}>
              Open case
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-md border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold">Work sections</h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {workspace.summary.readySections}/{workspace.summary.sections} ready
            </span>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {workspace.sections.slice(0, 6).map((section) => (
              <div key={section.key} className={`rounded-md border p-3 ${sectionClass(section.status)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase opacity-70">{section.ownerRole}</p>
                    <h4 className="mt-1 font-semibold">{section.label}</h4>
                  </div>
                  <span className="rounded border border-current/20 px-2 py-1 text-[11px] font-semibold uppercase">{section.status}</span>
                </div>
                <p className="mt-3 text-sm font-medium">{section.state}</p>
                <p className="mt-2 text-xs leading-5 opacity-80">Blocker: {section.blocker}</p>
                <p className="mt-1 text-xs font-semibold leading-5">Next: {section.nextAction}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="grid gap-4">
          <article className="rounded-md border border-border bg-background">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Activity className="size-4 text-emerald-700" aria-hidden="true" />
              <h3 className="font-semibold">Recent activity</h3>
            </div>
            <div className="divide-y divide-border">
              {activity.events.slice(0, 5).map((event) => (
                <div key={event.eventId} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{event.label}</p>
                    <span className="text-xs text-muted-foreground">{labelize(event.source)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString("en")}</p>
                </div>
              ))}
              {!activity.events.length ? <p className="px-4 py-3 text-sm text-muted-foreground">No visible activity yet.</p> : null}
            </div>
          </article>

          <article className="rounded-md border border-border bg-background">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <FileText className="size-4 text-emerald-700" aria-hidden="true" />
              <h3 className="font-semibold">Evidence and commands</h3>
            </div>
            <div className="grid gap-3 p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Documents</p>
                <div className="mt-2 grid gap-2">
                  {activity.documents.slice(0, 3).map((document) => (
                    <div key={document.linkId} className="rounded-md border border-border bg-card p-3">
                      <strong>{labelize(document.documentGroup)}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {document.versionLabel} · {document.status} · no file body returned
                      </p>
                    </div>
                  ))}
                  {!activity.documents.length ? <p className="text-muted-foreground">No document metadata visible.</p> : null}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Command history</p>
                <div className="mt-2 grid gap-2">
                  {history.records.slice(0, 3).map((record) => (
                    <div key={record.commandId} className="rounded-md border border-border bg-card p-3">
                      <strong>{record.moduleLabel}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {record.targetApplyStatus} · source writes and target apply remain closed
                      </p>
                    </div>
                  ))}
                  {!history.records.length ? <p className="text-muted-foreground">No command drafts stored for this deal yet.</p> : null}
                </div>
              </div>
            </div>
          </article>
        </aside>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{data.note}</span>
      </div>
    </section>
  );
}
