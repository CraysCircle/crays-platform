"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { HorizontalOverflowRegion } from
  "@/components/crays/accessibility/horizontal-overflow-region";
import { normalizeWorkbenchReturnTo } from
  "@/components/saas/navigation/workbench-route";

const VERTICALS = ["coffee", "retail", "gym", "clubs"] as const;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;

type VerticalRoot = (typeof VERTICALS)[number];
type QueueFilter = "attention" | "all" | "reconciled";

type ReconciliationItem = Readonly<{
  eventReference: string;
  eventType: string;
  aggregateType: string;
  aggregateReference: string;
  deliveryState: "PENDING" | "ACKNOWLEDGED" | "QUARANTINED" | "UNKNOWN" | "RECONCILED";
  attemptCount: number;
  businessState:
    | "PROVIDER_DELIVERY_PENDING"
    | "PENDING_RECONCILIATION"
    | "OUTCOME_UNKNOWN"
    | "ACTION_REQUIRED"
    | "RECONCILIATION_CONFLICT"
    | "RECONCILED";
  businessComplete: boolean;
  providerAcknowledgement: null | Readonly<{
    receiptSha256: string;
    receivedAt: string;
  }>;
  latestObservation: null | Readonly<{
    providerState: "OBSERVED" | "NOT_FOUND" | "UNKNOWN" | "LEGACY_UNSPECIFIED";
    reconciliationState: "MATCHED" | "MISSING" | "MISMATCH" | "UNKNOWN";
    receiptSha256: string;
    observedAt: string;
  }>;
  attention: null | Readonly<{
    ownerRole: "PARTNER_ACCOUNTANT" | "ERP_INTEGRATION_OPERATOR";
    state: "UNACKNOWLEDGED" | "ACKNOWLEDGED" | "ESCALATED" | "RESOLVED";
    requiredInformation: string;
    slaSeconds: number;
    dueAt: string;
    expiresAt: string;
    escalationAt: string;
    escalationOwnerRole: "PARTNER_FINANCE_MANAGER" | "ERP_PLATFORM_OWNER";
    nextSafeAction: string;
  }>;
}>;

type ReadyPayload = Readonly<{
  state: "ready";
  scope: Readonly<{
    verticalRoot: VerticalRoot;
    storeId: string;
    storeOperatorAssignmentVersion: number;
  }>;
  items: readonly ReconciliationItem[];
}>;

type StoreContext = Readonly<{
  verticalRoot: VerticalRoot;
  storeId: string;
  sellerLegalName: string;
  storeOperatorAssignmentVersion: number;
  contextFingerprint: string;
  verifiedAt: string;
}>;

type LoadState =
  | { state: "loading" }
  | { state: "ready"; context: StoreContext; data: ReadyPayload }
  | { state: "conflict"; code: string; message: string; recovery: string }
  | { state: "error"; code: string; message: string; recovery: string };

type ContextOption = Readonly<{
  verticalRoot: VerticalRoot;
  storeId: string;
  storeDisplayName: string;
  operatorLegalName: string;
  storeOperatorAssignmentVersion: number;
}>;

type ContextChoiceState =
  | { state: "loading" }
  | { state: "ready"; contexts: readonly ContextOption[] }
  | { state: "error"; message: string };

function isContextOption(value: unknown): value is ContextOption {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const option = value as Record<string, unknown>;
  return isVertical(typeof option.verticalRoot === "string" ? option.verticalRoot : null) &&
    typeof option.storeId === "string" && REFERENCE.test(option.storeId) &&
    typeof option.storeDisplayName === "string" && option.storeDisplayName.length >= 1 && option.storeDisplayName.length <= 200 &&
    typeof option.operatorLegalName === "string" && option.operatorLegalName.length >= 1 && option.operatorLegalName.length <= 200 &&
    Number.isSafeInteger(option.storeOperatorAssignmentVersion) && Number(option.storeOperatorAssignmentVersion) >= 1;
}

class WorkbenchLoadError extends Error {
  constructor(
    readonly code: string,
    readonly recovery: string,
    message: string,
  ) {
    super(message);
    this.name = "WorkbenchLoadError";
  }
}

function isVertical(value: string | null): value is VerticalRoot {
  return value !== null && VERTICALS.includes(value as VerticalRoot);
}

function label(value: string) {
  return value.toLowerCase().split("_").map((part) =>
    part ? part[0].toUpperCase() + part.slice(1) : part
  ).join(" ");
}

function dateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function failureMessage(code: string) {
  if (code.includes("AUTHORIZATION_REQUIRED")) {
    return "Your current CRAYS role or assurance level cannot read this Store queue.";
  }
  if (code.includes("SCOPE_NOT_AVAILABLE") || code.includes("CONTEXT_NOT_AVAILABLE") || code.includes("CONTEXT_CHANGED")) {
    return "The Store context changed, expired or is outside your active assignment.";
  }
  if (code.includes("PROVIDER_REJECTED")) {
    return "The Store provider binding rejected this read. No completion is inferred.";
  }
  if (code.includes("OUTCOME_UNKNOWN") || code.includes("TEMPORARILY_UNAVAILABLE")) {
    return "The durable reconciliation source is temporarily unknown. Existing records remain unchanged.";
  }
  return "The reconciliation queue could not be loaded safely.";
}

async function postJson(path: string, body: object, signal: AbortSignal) {
  const response = await fetch(path, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const code = typeof payload.code === "string" ? payload.code : `HTTP_${response.status}`;
    const recovery = typeof payload.recovery === "string" ? payload.recovery : "return_to_role_home";
    throw new WorkbenchLoadError(code, recovery, failureMessage(code));
  }
  return payload;
}

async function loadWorkbench(
  selection: Readonly<{
    verticalRoot: VerticalRoot;
    storeId: string;
    expectedAssignmentVersion?: number;
  }>,
  signal: AbortSignal,
): Promise<{ context: StoreContext; data: ReadyPayload }> {
  const contextPayload = await postJson(
    "/api/crays/commerce/context",
    selection,
    signal,
  );
  if (contextPayload.state !== "ready" || !contextPayload.store || typeof contextPayload.store !== "object") {
    throw new WorkbenchLoadError(
      "COMMERCE_CONTEXT_RESPONSE_INVALID",
      "return_to_role_home",
      "The authorized Store context could not be verified.",
    );
  }
  const context = contextPayload.store as StoreContext;
  const data = await postJson(
    "/api/crays/operations/commerce/vendure-reconciliation",
    {
      verticalRoot: context.verticalRoot,
      storeId: context.storeId,
      expectedAssignmentVersion: context.storeOperatorAssignmentVersion,
      take: 50,
    },
    signal,
  ) as ReadyPayload;
  if (
    data.state !== "ready" ||
    data.scope.storeId !== context.storeId ||
    data.scope.verticalRoot !== context.verticalRoot ||
    data.scope.storeOperatorAssignmentVersion !== context.storeOperatorAssignmentVersion ||
    !Array.isArray(data.items)
  ) {
    throw new WorkbenchLoadError(
      "VENDURE_RECONCILIATION_RESPONSE_INVALID",
      "retry_after_backoff",
      "The reconciliation source returned a mismatched Store scope.",
    );
  }
  return { context, data };
}

function stateTone(item: ReconciliationItem) {
  if (item.businessComplete) return "border-sky-900/15 bg-sky-50 text-sky-950";
  if (["OUTCOME_UNKNOWN", "RECONCILIATION_CONFLICT"].includes(item.businessState)) {
    return "border-rose-800/20 bg-rose-50 text-rose-950";
  }
  return "border-amber-800/20 bg-amber-50 text-amber-950";
}

function isOverdue(item: ReconciliationItem) {
  return item.attention !== null && !item.businessComplete &&
    new Date(item.attention.dueAt).getTime() < Date.now();
}

function SummaryCard({ label: title, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">{detail}</p>
    </div>
  );
}

function AuthorizedStoreChoices({ returnTo }: { returnTo: string }) {
  const [state, setState] = useState<ContextChoiceState>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    if (!navigator.onLine) {
      setState({ state: "error", message: "You are offline. Authorized Store contexts cannot be verified." });
      return () => controller.abort();
    }
    fetch("/api/crays/operations/commerce/vendure-reconciliation/contexts", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (
          !response.ok || payload.state !== "ready" ||
          !Array.isArray(payload.contexts) ||
          !payload.contexts.every(isContextOption)
        ) {
          throw new Error("Authorized Store contexts are unavailable.");
        }
        setState({ state: "ready", contexts: payload.contexts });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ state: "error", message: error instanceof Error ? error.message : "Authorized Store contexts are unavailable." });
      });
    return () => controller.abort();
  }, []);

  if (state.state === "loading") {
    return <p role="status" className="mt-4 flex min-h-11 items-center gap-2 text-sm"><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading authorized Stores</p>;
  }
  if (state.state === "error") {
    return <p role="alert" className="mt-4 text-sm font-semibold">{state.message}</p>;
  }
  if (state.contexts.length === 0) {
    return <p className="mt-4 text-sm font-semibold">No active Store with reconciliation read authority is assigned to this role.</p>;
  }
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {state.contexts.map((context) => {
        const params = new URLSearchParams({
          verticalRoot: context.verticalRoot,
          storeId: context.storeId,
          assignmentVersion: String(context.storeOperatorAssignmentVersion),
          filter: "attention",
          returnTo,
        });
        return (
          <a key={`${context.verticalRoot}:${context.storeId}:${context.storeOperatorAssignmentVersion}`} href={`/erp/commerce-reconciliation?${params.toString()}`} className="min-h-11 rounded-[8px] border border-current bg-white/70 p-4 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#0b405f]/25">
            <span className="block text-xs font-semibold uppercase opacity-70">{label(context.verticalRoot)} · assignment v{context.storeOperatorAssignmentVersion}</span>
            <strong className="mt-1 block">{context.storeDisplayName}</strong>
            <span className="mt-1 block text-sm opacity-80">{context.operatorLegalName}</span>
          </a>
        );
      })}
    </div>
  );
}

export function CommerceReconciliationWorkbench() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const verticalRoot = searchParams.get("verticalRoot");
  const storeId = searchParams.get("storeId");
  const assignmentVersionRaw = searchParams.get("assignmentVersion");
  const assignmentVersion = assignmentVersionRaw === null ? undefined : Number(assignmentVersionRaw);
  const validSelection = isVertical(verticalRoot) && storeId !== null && REFERENCE.test(storeId) &&
    (assignmentVersion === undefined || (Number.isSafeInteger(assignmentVersion) && assignmentVersion > 0));
  const filterParam = searchParams.get("filter");
  const filter: QueueFilter = filterParam === "all" || filterParam === "reconciled"
    ? filterParam
    : "attention";
  const selectedEvent = searchParams.get("record");
  const returnTo = normalizeWorkbenchReturnTo(searchParams.get("returnTo")) ??
    "/erp?view=work-queue";
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const detailRef = useRef<HTMLElement>(null);

  function replaceRoute(values: Readonly<{ filter?: QueueFilter; record?: string }>) {
    const next = new URLSearchParams(searchParams.toString());
    if (values.filter) next.set("filter", values.filter);
    if (values.record) next.set("record", values.record);
    else if (values.record === "") next.delete("record");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!validSelection) return;
    const controller = new AbortController();
    if (!navigator.onLine) {
      setLoadState({
        state: "error",
        code: "RECONCILIATION_OFFLINE_NO_FRESH_STATE",
        message: "You are offline. No cached business state is shown as current.",
        recovery: "reconnect_then_retry_same_read",
      });
      return () => controller.abort();
    }
    setLoadState({ state: "loading" });
    loadWorkbench({
      verticalRoot,
      storeId,
      ...(assignmentVersion === undefined ? {} : { expectedAssignmentVersion: assignmentVersion }),
    }, controller.signal)
      .then(({ context, data }) => setLoadState({ state: "ready", context, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const failure = error instanceof WorkbenchLoadError
          ? error
          : new WorkbenchLoadError("RECONCILIATION_READ_UNKNOWN", "retry_after_backoff", failureMessage("OUTCOME_UNKNOWN"));
        setLoadState(failure.code === "COMMERCE_CONTEXT_CHANGED"
          ? { state: "conflict", code: failure.code, message: failure.message, recovery: failure.recovery }
          : { state: "error", code: failure.code, message: failure.message, recovery: failure.recovery });
      });
    return () => controller.abort();
  }, [assignmentVersion, refreshVersion, storeId, validSelection, verticalRoot]);

  useEffect(() => {
    const handleOffline = () => setLoadState({
      state: "error",
      code: "RECONCILIATION_OFFLINE_NO_FRESH_STATE",
      message: "You are offline. No cached business state is shown as current.",
      recovery: "reconnect_then_retry_same_read",
    });
    const handleOnline = () => setRefreshVersion((value) => value + 1);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (loadState.state !== "loading") headingRef.current?.focus();
  }, [loadState.state]);

  const items = loadState.state === "ready" ? loadState.data.items : [];
  const visibleItems = useMemo(() => items.filter((item) => {
    if (filter === "reconciled") return item.businessComplete;
    if (filter === "attention") return !item.businessComplete;
    return true;
  }), [filter, items]);
  const selected = visibleItems.find((item) => item.eventReference === selectedEvent) ?? visibleItems[0] ?? null;
  const attentionCount = items.filter((item) =>
    item.attention !== null && item.attention.state !== "RESOLVED"
  ).length;
  const reconciledCount = items.filter((item) => item.businessComplete).length;
  const unknownCount = items.filter((item) => ["OUTCOME_UNKNOWN", "RECONCILIATION_CONFLICT"].includes(item.businessState)).length;
  const overdueCount = items.filter(isOverdue).length;

  if (!validSelection) {
    return (
      <section aria-labelledby="reconciliation-title" className="space-y-5">
        <header>
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">ERP · Store operations</p>
          <h1 ref={headingRef} tabIndex={-1} id="reconciliation-title" className="mt-2 text-3xl font-semibold tracking-tight outline-none">Commerce reconciliation</h1>
        </header>
        <div className="rounded-[8px] border border-amber-800/20 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Select an authorized Store first</h2>
              <p className="mt-1 text-sm opacity-80">This queue never accepts a free-form tenant, operator, seller or provider scope. The choices below are re-derived from your active CRAYS role and grants.</p>
              <AuthorizedStoreChoices returnTo={returnTo} />
              <a href={returnTo} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-current px-3 py-2 text-sm font-semibold">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Return to work queue
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loadState.state === "loading") {
    return (
      <section aria-labelledby="reconciliation-title" aria-busy="true">
        <h1 ref={headingRef} tabIndex={-1} id="reconciliation-title" className="text-3xl font-semibold tracking-tight outline-none">Commerce reconciliation</h1>
        <div role="status" className="mt-5 flex min-h-24 items-center gap-3 rounded-[8px] border border-[var(--line)] bg-white p-5 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" /> Verifying Store authority and loading durable receipts
        </div>
      </section>
    );
  }

  if (loadState.state === "conflict") {
    return (
      <section aria-labelledby="reconciliation-title" className="space-y-5">
        <h1 ref={headingRef} tabIndex={-1} id="reconciliation-title" className="text-3xl font-semibold tracking-tight outline-none">Commerce reconciliation</h1>
        <div role="alert" className="rounded-[8px] border border-amber-800/20 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Store assignment changed</h2>
              <p className="mt-1 text-sm opacity-80">No reconciliation data is shown from the stale context. Return to your work queue and select the authorized Store again.</p>
              <p className="mt-2 font-mono text-xs">{loadState.code} · {loadState.recovery}</p>
              <a href={returnTo} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-current px-3 py-2 text-sm font-semibold">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Reselect Store
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loadState.state === "error") {
    return (
      <section aria-labelledby="reconciliation-title" className="space-y-5">
        <h1 ref={headingRef} tabIndex={-1} id="reconciliation-title" className="text-3xl font-semibold tracking-tight outline-none">Commerce reconciliation</h1>
        <div role="alert" className="rounded-[8px] border border-rose-800/20 bg-rose-50 p-5 text-rose-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-semibold">Queue unavailable without changing business state</h2>
              <p className="mt-1 text-sm opacity-80">{loadState.message}</p>
              <p className="mt-2 break-all font-mono text-xs">{loadState.code} · {loadState.recovery}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry same read
                </button>
                <a href={returnTo} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-current px-3 py-2 text-sm font-semibold">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Work queue
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="reconciliation-title" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">ERP · {label(loadState.context.verticalRoot)} · exact Store</p>
          <h1 ref={headingRef} tabIndex={-1} id="reconciliation-title" className="mt-2 text-3xl font-semibold tracking-tight outline-none">Commerce reconciliation</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">Provider delivery is only transport. This queue remains open until the durable business observation matches and owned attention is resolved.</p>
        </div>
        <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--foreground)]">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh durable state
        </button>
      </header>

      <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Verified operating context</p>
            <p className="mt-1 font-semibold">{loadState.context.sellerLegalName}</p>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-xs uppercase text-[var(--ink-muted)]">Store</dt><dd className="font-mono">{loadState.context.storeId}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--ink-muted)]">Assignment</dt><dd className="font-mono">v{loadState.context.storeOperatorAssignmentVersion}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--ink-muted)]">Verified</dt><dd><time dateTime={loadState.context.verifiedAt}>{dateTime(loadState.context.verifiedAt)}</time></dd></div>
          </dl>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Source-backed queue summary">
        <SummaryCard label="Action now" value={attentionCount} detail="Owned unresolved exceptions" />
        <SummaryCard label="Reconciled" value={reconciledCount} detail="Matched durable outcomes" />
        <SummaryCard label="Unknown or conflict" value={unknownCount} detail="Never retried as success" />
        <SummaryCard label="Past due" value={overdueCount} detail="Based on server-provided SLA" />
      </div>

      <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-4">
          <div>
            <h2 className="text-lg font-semibold">Durable event queue</h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Up to 50 latest Store-scoped records · no provider identifiers exposed</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter reconciliation events">
            {(["attention", "all", "reconciled"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => replaceRoute({ filter: value, record: "" })} className={`min-h-11 rounded-[8px] border px-3 py-2 text-sm font-semibold ${filter === value ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white"}`}>
                {value === "attention" ? "Needs attention" : label(value)}
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="p-8 text-center">
            <FileCheck2 className="mx-auto h-7 w-7 text-[var(--ink-muted)]" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">No records in this view</h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">No durable provider events match the selected filter in the returned Store window.</p>
          </div>
        ) : (
          <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_400px]">
            <HorizontalOverflowRegion label="Store commerce reconciliation event table" className="min-w-0">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <caption className="sr-only">Store-scoped commerce reconciliation events</caption>
                <thead className="bg-white text-left text-xs uppercase text-[var(--ink-muted)]">
                  <tr><th className="px-4 py-3">Record</th><th className="px-3 py-3">Business state</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Due</th><th className="px-4 py-3 text-right">Details</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {visibleItems.map((item) => (
                    <tr key={item.eventReference} className={selected?.eventReference === item.eventReference ? "bg-sky-50/60" : "bg-white hover:bg-[var(--surface)]"}>
                      <td className="px-4 py-4"><span className="block text-xs uppercase text-[var(--ink-muted)]">{item.aggregateType}</span><strong className="mt-1 block font-mono text-xs">{item.aggregateReference}</strong><span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.eventType}</span></td>
                      <td className="px-3 py-4"><span className={`inline-flex rounded-[7px] border px-2 py-1 text-xs font-semibold ${stateTone(item)}`}>{label(item.businessState)}</span><span className="mt-2 block text-xs text-[var(--ink-muted)]">Delivery: {label(item.deliveryState)} · attempt {item.attemptCount}</span></td>
                      <td className="px-3 py-4">{item.attention ? <><span className="font-semibold">{label(item.attention.ownerRole)}</span><span className="mt-1 block text-xs text-[var(--ink-muted)]">{label(item.attention.state)}</span></> : <span className="text-[var(--ink-muted)]">No human attention</span>}</td>
                      <td className="px-3 py-4">{item.attention ? <><time dateTime={item.attention.dueAt}>{dateTime(item.attention.dueAt)}</time>{isOverdue(item) ? <span className="mt-1 block text-xs font-semibold text-rose-800">Past due</span> : null}</> : <span className="text-[var(--ink-muted)]">Not assigned</span>}</td>
                      <td className="px-4 py-4 text-right"><button type="button" aria-pressed={selected?.eventReference === item.eventReference} onClick={() => {
                        replaceRoute({ record: item.eventReference });
                        window.requestAnimationFrame(() => detailRef.current?.focus());
                      }} className="min-h-11 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold" aria-label={`Inspect ${item.aggregateReference}`}>Inspect</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </HorizontalOverflowRegion>

            {selected ? (
              <aside ref={detailRef} tabIndex={-1} aria-label="Selected reconciliation record" className="border-t border-[var(--line)] bg-white p-5 outline-none xl:border-l xl:border-t-0">
                <div className="flex items-center gap-2">
                  {selected.businessComplete ? <CheckCircle2 className="h-5 w-5 text-sky-900" aria-hidden="true" /> : <Clock3 className="h-5 w-5 text-amber-800" aria-hidden="true" />}
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Canonical event</p>
                </div>
                <h3 className="mt-2 break-all font-mono text-sm font-semibold">{selected.eventReference}</h3>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Required information</dt><dd className="mt-1">{selected.attention?.requiredInformation ?? "No owned exception is open."}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Next safe action</dt><dd className="mt-1 font-semibold">{selected.attention?.nextSafeAction ?? (selected.businessComplete ? "Business effect matched; no further action." : "No human action assigned; await the durable state transition.")}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Escalation</dt><dd className="mt-1">{selected.attention ? <>{label(selected.attention.escalationOwnerRole)} · <time dateTime={selected.attention.escalationAt}>{dateTime(selected.attention.escalationAt)}</time></> : "Not assigned"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Transport ACK receipt (optional)</dt><dd className="mt-1 break-all font-mono text-xs">{selected.providerAcknowledgement?.receiptSha256 ?? (selected.businessComplete ? "Not captured; exact matched observation proves completion." : "Not received")}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Latest observation</dt><dd className="mt-1">{selected.latestObservation ? `${label(selected.latestObservation.providerState)} · ${label(selected.latestObservation.reconciliationState)}` : "Not observed"}</dd>{selected.latestObservation ? <dd className="mt-1 break-all font-mono text-xs text-[var(--ink-muted)]">{selected.latestObservation.receiptSha256}</dd> : null}</div>
                </dl>
                <div className="mt-5 border-t border-[var(--line)] pt-4">
                  <a href={returnTo} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-[var(--line)] px-3 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Return to work queue</a>
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{visibleItems.length} reconciliation records shown.</p>
    </section>
  );
}
