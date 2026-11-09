"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, AlertTriangle, Building2, ClipboardList, RefreshCw, Users } from "lucide-react";
import { roleByKey } from "@/lib/roles";

type Drill = "members" | "support" | "portfolio" | "commands";

type OperationsPayload = {
  readModel: {
    access: { allowed: boolean };
    studio: { label: string; syncStatus: string } | null;
    summary: {
      membersActive: number;
      checkinsToday: number;
      classesToday: number;
      trainersOnShift: number;
      openSupportRequests: number;
      paymentExceptions: number;
      highRiskMembers: number;
      commandDrafts: number;
    };
    memberExceptions: Array<{ memberId: string; label: string; paymentStatus: string; serviceRisk: string; nextAction: string }>;
    supportRequests: Array<{ requestId: string; label: string; priority: string; status: string; nextAction: string }>;
    sourceHealth: { records: number; status: string };
  };
};

type SignalsPayload = {
  readModel: {
    summary: {
      preparedDeals: number;
      criticalSignals: number;
      blockedReleaseGates: number;
      commandDrafts: number;
      workflowEvents: number;
      documentApprovalCoverage: number;
    };
    signals: Array<{
      id: string;
      title: string;
      market: string;
      priority: string;
      state: string;
      blocker: string;
      nextAction: string;
      kpis: {
        location: number | null;
        bankability: number | null;
        openingReadiness: number | null;
        documents: number;
        approvedDocuments: number;
        blockedGates: number;
      };
      links: { caseHref: string; primaryModuleHref: string; primaryModuleLabel: string };
    }>;
  };
};

type GatePayload = {
  readModel: {
    summary: { returned: number; modules: number; departments: number; applyBlocked: number };
    queue: Array<{
      commandId: string;
      moduleLabel: string;
      departmentOwner: string;
      owner: string;
      label: string;
      targetObject: string;
      queueState: string;
      nextReviewAction: string;
      preflight: { summary: string };
      gateReview: { message: string };
    }>;
  };
};

type Row = {
  id: string;
  title: string;
  source: string;
  state: string;
  context: string;
  next: string;
  href?: string;
};

async function maybeJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  const response = await fetch(url, { cache: "no-store", signal });
  return response.ok ? ((await response.json()) as T) : null;
}

function pct(value: number) {
  return `${value}%`;
}

export function ManagementPortfolioPanel() {
  const role = roleByKey(useSearchParams().get("role")).key;
  const [refresh, setRefresh] = useState(0);
  const [drill, setDrill] = useState<Drill>("portfolio");
  const [data, setData] = useState<{
    operations: OperationsPayload | null;
    signals: SignalsPayload | null;
    gates: GatePayload | null;
    error: string | null;
  }>({ operations: null, signals: null, gates: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      maybeJson<OperationsPayload>(`/api/crays/operations/studio-workbench/read-model?role=${role}`, controller.signal),
      maybeJson<SignalsPayload>(`/api/crays/operational-signals/read-model?role=${role}&limit=8`, controller.signal),
      maybeJson<GatePayload>(`/api/crays/management/gate-review/read-model?role=${role}`, controller.signal),
    ])
      .then(([operations, signals, gates]) => setData({ operations, signals, gates, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setData({ operations: null, signals: null, gates: null, error: error instanceof Error ? error.message : "Portfolio data unavailable" });
        }
      });
    return () => controller.abort();
  }, [refresh, role]);

  const ops = data.operations?.readModel;
  const signals = data.signals?.readModel;
  const gates = data.gates?.readModel;
  const allowed = Boolean(ops?.access.allowed || signals || gates);

  const rows = useMemo<Row[]>(() => {
    if (drill === "members") {
      return (ops?.memberExceptions ?? []).map((item) => ({
        id: item.memberId,
        title: item.label,
        source: "Member App",
        state: item.paymentStatus,
        context: `Service risk ${item.serviceRisk}`,
        next: item.nextAction,
      }));
    }

    if (drill === "support") {
      return (ops?.supportRequests ?? []).map((item) => ({
        id: item.requestId,
        title: item.label,
        source: "Member App",
        state: item.status,
        context: `${item.priority} priority`,
        next: item.nextAction,
      }));
    }

    if (drill === "commands") {
      return (gates?.queue ?? []).slice(0, 10).map((item) => ({
        id: item.commandId,
        title: item.label,
        source: item.moduleLabel,
        state: item.queueState,
        context: `${item.targetObject} · ${item.preflight.summary}`,
        next: item.nextReviewAction,
      }));
    }

    return (signals?.signals ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      source: item.links.primaryModuleLabel,
      state: item.state,
      context: `${item.market} · ${item.blocker} · Docs ${item.kpis.approvedDocuments}/${item.kpis.documents}`,
      next: item.nextAction,
      href: item.links.caseHref,
    }));
  }, [drill, gates, ops, signals]);

  if (!allowed) return null;

  const metrics: Array<{ label: string; value: string | number; context: string; target: Drill; icon: typeof Users }> = [
    {
      label: "Critical signals",
      value: signals?.summary.criticalSignals ?? 0,
      context: `${signals?.summary.blockedReleaseGates ?? 0} blocked gates across prepared deals`,
      target: "portfolio",
      icon: AlertTriangle,
    },
    {
      label: "Active members",
      value: ops?.summary.membersActive ?? 0,
      context: `${ops?.summary.highRiskMembers ?? 0} high-risk member records`,
      target: "members",
      icon: Users,
    },
    {
      label: "Check-ins today",
      value: ops?.summary.checkinsToday ?? 0,
      context: `${ops?.summary.classesToday ?? 0} classes, ${ops?.summary.trainersOnShift ?? 0} trainers on shift`,
      target: "members",
      icon: Activity,
    },
    {
      label: "Payment exceptions",
      value: ops?.summary.paymentExceptions ?? 0,
      context: "Member App payment-method and membership exceptions",
      target: "members",
      icon: Users,
    },
    {
      label: "Support requests",
      value: ops?.summary.openSupportRequests ?? 0,
      context: "Open support queue from the Member App bridge",
      target: "support",
      icon: Building2,
    },
    {
      label: "Command queue",
      value: gates?.summary.returned ?? signals?.summary.commandDrafts ?? 0,
      context: `${gates?.summary.applyBlocked ?? 0} apply-blocked Core commands`,
      target: "commands",
      icon: ClipboardList,
    },
  ];

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Management portfolio</p>
            <h2 className="mt-2 text-2xl font-semibold">Portfolio decisions with source drill-down</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              {ops?.studio?.label ?? "CRAYS Portfolio"} · {ops?.sourceHealth.records ?? 0} Member App source records · {signals?.summary.workflowEvents ?? 0} workflow events · document coverage {pct(signals?.summary.documentApprovalCoverage ?? 0)}
            </p>
          </div>
          <button type="button" onClick={() => setRefresh((value) => value + 1)} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </article>

      {data.error ? <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{data.error}</section> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(({ label, value, context, target, icon: Icon }) => (
          <button type="button" key={label} onClick={() => setDrill(target)} className={`rounded-[8px] border p-4 text-left ${drill === target ? "border-emerald-600 bg-emerald-50" : "border-[var(--line)] bg-white"}`}>
            <Icon className="h-4 w-4 text-[var(--accent)]" />
            <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-2 block text-2xl">{value}</strong>
            <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">{context}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["portfolio", "Portfolio signals"],
          ["members", "Member exceptions"],
          ["support", "Support queue"],
          ["commands", "Command queue"],
        ] as const).map(([key, label]) => (
          <button type="button" key={key} onClick={() => setDrill(key)} className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${drill === key ? "bg-black text-white" : "border border-[var(--line)] bg-white"}`}>
            {label}
          </button>
        ))}
      </div>

      <article className="overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_160px] gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">
          <span>Record</span>
          <span>State</span>
          <span>Next action</span>
        </div>
        {rows.length ? (
          rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_120px_160px] gap-3 border-b border-[var(--line)] px-4 py-3 text-sm last:border-0">
              <div className="min-w-0">
                {row.href ? <a href={row.href} className="font-semibold hover:underline">{row.title}</a> : <strong>{row.title}</strong>}
                <p className="mt-1 text-xs text-[var(--ink-muted)]">{row.source} · {row.context}</p>
              </div>
              <span>{row.state}</span>
              <span className="text-[var(--ink-muted)]">{row.next}</span>
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-[var(--ink-muted)]">No source-backed records in this view.</p>
        )}
      </article>
    </section>
  );
}
