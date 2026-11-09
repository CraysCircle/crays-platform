"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  CircleAlert,
  DoorClosed,
  FileCheck2,
  FolderKanban,
  Gauge,
  Handshake,
  Landmark,
  LineChart,
  ListTodo,
  LockKeyhole,
  MapPinned,
  NotebookTabs,
  PanelRightOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { RealProductCase, RealProductReadModel } from "@/db/real-product-read-model-repository";

type Payload = {
  status: "ready" | "forbidden";
  readModel: RealProductReadModel;
};

type LoadState =
  | { state: "loading"; data: null; error: null }
  | { state: "ready"; data: Payload; error: null }
  | { state: "error"; data: null; error: string };

type CommandDraftStatus = "staging" | "created" | "idempotent_existing" | "blocked" | "invalid" | "network_error" | "local_only";

type CommandDraftRequest = {
  localKey: string;
  offerId: string;
  actionKey: string;
  label: string;
  moduleLabel: "Project" | "CRM" | "Files" | "ERP" | "Loans" | "Sync";
  route: string;
  confirmation: string;
  idempotencyKey: string;
  body: Record<string, string | number | null | undefined>;
};

type CommandDraftRecord = {
  localKey: string;
  offerId: string;
  actionKey: string;
  label: string;
  moduleLabel: CommandDraftRequest["moduleLabel"];
  route: string;
  status: CommandDraftStatus;
  message: string;
  commandId: string | null;
  applyGate: string | null;
  actorRole?: string | null;
  targetObject?: string | null;
  commandStatus?: string | null;
  preflight?: string | null;
  source?: "session" | "persisted";
  createdAt: string;
};

type CommandDraftResponse = {
  status?: string;
  reason?: string;
  error?: string;
  result?: {
    commandId?: string;
    commandStatus?: string;
    targetApplyStatus?: string;
    applyGate?: string;
    moduleKey?: string;
  };
};

type PersistedCommandHistoryRecord = {
  commandId: string;
  commandKey: string;
  moduleLabel: CommandDraftRequest["moduleLabel"];
  actorRole: string;
  label: string;
  commandStatus: string;
  targetApplyStatus: string;
  applyGate: string;
  targetObject: string;
  preparedOfferId: string | null;
  preflight: string;
  rollbackPolicy: string;
  auditEvent: string;
  createdAt: string;
};

type CommandHistoryPayload = {
  status?: string;
  readModel?: {
    records?: PersistedCommandHistoryRecord[];
  };
};

type CaseActivityBackbonePayload = {
  status?: string;
  readModel?: {
    summary?: {
      documents: number;
      approvedDocuments: number;
      workflowEvents: number;
      commandEvents: number;
      kpis: number;
      latestEventAt: string | null;
    };
    documents?: Array<{
      linkId: string;
      documentGroup: string;
      documentRefType: string;
      documentRefId: string;
      status: string;
      requiredFor: string | null;
      visibilityRoles: string[];
      versionLabel: string;
      updatedAt: string;
    }>;
    events?: Array<{
      eventId: string;
      eventType: string;
      eventStatus: string;
      source: "workflow" | "command";
      actorRole: string | null;
      label: string;
      occurredAt: string;
    }>;
    kpis?: Array<{
      key: string;
      label: string;
      value: string;
      unit: string;
      period: string;
      source: string;
      dataStatus: "available" | "derived" | "missing";
    }>;
  };
};

const journeyIcons = {
  "owner-property-check": Building2,
  "location-intelligence": MapPinned,
  "rent-potential": Gauge,
  "prepared-deal": FolderKanban,
  "candidate-evidence": Users,
  "bank-evidence": Banknote,
  "controlled-release": ShieldCheck,
};

const toneClass = {
  green: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  amber: "border-amber-700/20 bg-amber-50 text-amber-950",
  rose: "border-rose-700/20 bg-rose-50 text-rose-950",
  blue: "border-sky-700/20 bg-sky-50 text-sky-950",
  ink: "border-black/10 bg-white text-[var(--foreground)]",
};

type WorkspaceView =
  | "overview"
  | "property"
  | "evidence"
  | "economics"
  | "candidate"
  | "bank"
  | "opening"
  | "files"
  | "rooms"
  | "gates"
  | "transitions"
  | "activity";

const workspaceTabs: Array<{ key: WorkspaceView; label: string; icon: typeof Gauge }> = [
  { key: "overview", label: "Overview", icon: Gauge },
  { key: "property", label: "Property", icon: Building2 },
  { key: "evidence", label: "Evidence", icon: FileCheck2 },
  { key: "economics", label: "Economics", icon: LineChart },
  { key: "candidate", label: "Candidate", icon: Users },
  { key: "bank", label: "Bank", icon: Landmark },
  { key: "opening", label: "Opening", icon: Handshake },
  { key: "files", label: "Files", icon: NotebookTabs },
  { key: "rooms", label: "Rooms", icon: DoorClosed },
  { key: "gates", label: "Gates", icon: ShieldCheck },
  { key: "transitions", label: "Transitions", icon: CheckCircle2 },
  { key: "activity", label: "Activity", icon: ListTodo },
];

const workspaceViewKeys = new Set<WorkspaceView>(workspaceTabs.map((tab) => tab.key));

async function loadRealProductWorkbench(role: string, signal: AbortSignal) {
  const response = await fetch(`/api/crays/real-product/read-model?role=${role}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Real product workbench returned HTTP ${response.status}`);
  return (await response.json()) as Payload;
}

async function loadPersistedCommandHistory(role: string, item: RealProductCase, signal: AbortSignal) {
  const params = new URLSearchParams({
    role,
    preparedOfferId: item.offerId,
    limit: "20",
  });
  if (item.dealId) params.set("dealId", item.dealId);
  if (item.propertyCaseId) params.set("propertyCaseId", item.propertyCaseId);
  const response = await fetch(`/api/crays/core-command/history/read-model?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Core command history returned HTTP ${response.status}`);
  const payload = (await response.json()) as CommandHistoryPayload;
  return (payload.readModel?.records ?? []).map((record) => commandDraftFromHistory(record, item.offerId));
}

async function loadCaseActivityBackbone(role: string, item: RealProductCase, signal: AbortSignal) {
  const params = new URLSearchParams({
    role,
    preparedOfferId: item.offerId,
    limit: "8",
  });
  if (item.dealId) params.set("dealId", item.dealId);
  if (item.propertyCaseId) params.set("propertyCaseId", item.propertyCaseId);
  const response = await fetch(`/api/crays/case-activity/read-model?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`Case activity backbone returned HTTP ${response.status}`);
  return (await response.json()) as CaseActivityBackbonePayload;
}

function formatMoney(value: number | null) {
  if (value === null) return "n/a";
  if (value >= 1_000_000) return `EUR ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `EUR ${Math.round(value / 1_000)}k`;
  return `EUR ${value}`;
}

function formatScore(value: number | null) {
  return value === null ? "n/a" : String(Math.round(value));
}

function labelize(value: string | null | undefined) {
  if (!value) return "Not set";
  return value.replaceAll("_", " ");
}

function eventLabel(label: string) {
  return `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${label}`;
}

function formatCommandHistoryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function caseReadiness(item: RealProductCase) {
  const checks = [
    item.handoffStatus === "ready",
    item.evidence.locationRuns > 0,
    item.evidence.rentModels > 0,
    item.evidence.dealEconomicsModels > 0,
    item.evidence.bankingSnapshots > 0,
    item.evidence.blockedReleaseGates === 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function readinessTone(score: number) {
  if (score >= 80) return "text-[var(--accent)]";
  if (score >= 50) return "text-[var(--amber)]";
  return "text-[var(--rose)]";
}

function localActionKey(item: RealProductCase, action: string) {
  return `${item.offerId}:${action}`;
}

function commandDraftStatusLabel(status: CommandDraftStatus) {
  if (status === "staging") return "Checking guard";
  if (status === "created") return "Stored in test DB";
  if (status === "idempotent_existing") return "Already stored";
  if (status === "blocked") return "Guard blocked";
  if (status === "invalid") return "Invalid draft";
  if (status === "network_error") return "Network issue";
  return "Draft staged";
}

function commandDraftStatusClass(status: CommandDraftStatus) {
  if (status === "created" || status === "idempotent_existing") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (status === "blocked" || status === "local_only") return "border-amber-200 bg-amber-50 text-amber-950";
  if (status === "invalid" || status === "network_error") return "border-rose-200 bg-rose-50 text-rose-950";
  return "border-sky-200 bg-sky-50 text-sky-950";
}

function commandDraftFromHistory(record: PersistedCommandHistoryRecord, selectedOfferId: string): CommandDraftRecord {
  return {
    localKey: `persisted:${record.commandId}`,
    offerId: record.preparedOfferId ?? selectedOfferId,
    actionKey: record.commandKey,
    label: record.label,
    moduleLabel: record.moduleLabel,
    route: "/api/crays/core-command/history/read-model",
    status: "created",
    message: `${record.commandStatus}, apply ${record.targetApplyStatus}. ${record.preflight}.`,
    commandId: record.commandId,
    applyGate: record.applyGate,
    actorRole: record.actorRole,
    targetObject: record.targetObject,
    commandStatus: record.commandStatus,
    preflight: record.preflight,
    source: "persisted",
    createdAt: formatCommandHistoryTime(record.createdAt),
  };
}

function commandRouteForAction(actionKey: string): Pick<CommandDraftRequest, "moduleLabel" | "route" | "confirmation"> {
  if (
    actionKey === "role-primary" ||
    actionKey === "property-fit" ||
    actionKey === "opening-handoff" ||
    actionKey.startsWith("signal-project") ||
    actionKey === "transition-property" ||
    actionKey === "transition-opening"
  ) {
    return {
      moduleLabel: "Project",
      route: "/api/crays/core-command/project-work-item",
      confirmation: "stage-project-work-item-command",
    };
  }

  if (actionKey === "candidate-intent" || actionKey.startsWith("signal-crm") || actionKey.startsWith("evidence-") || actionKey === "transition-candidate") {
    return {
      moduleLabel: "CRM",
      route: "/api/crays/core-command/crm-activity",
      confirmation: "stage-crm-activity-command",
    };
  }

  if (
    actionKey === "files-package" ||
    actionKey.endsWith("-room") ||
    actionKey.endsWith("-release") ||
    actionKey.startsWith("signal-files") ||
    actionKey === "transition-evidence"
  ) {
    return {
      moduleLabel: "Files",
      route: "/api/crays/core-command/files-package",
      confirmation: "stage-files-package-command",
    };
  }

  if (actionKey === "deal-economics" || actionKey.startsWith("signal-erp") || actionKey === "transition-finance") {
    return {
      moduleLabel: "ERP",
      route: "/api/crays/core-command/erp-finance",
      confirmation: "stage-erp-finance-command",
    };
  }

  if (actionKey === "bank-readiness" || actionKey === "bank-release" || actionKey.startsWith("signal-loans") || actionKey === "transition-bank") {
    return {
      moduleLabel: "Loans",
      route: "/api/crays/core-command/loans-checklist",
      confirmation: "stage-loans-checklist-command",
    };
  }

  return {
    moduleLabel: "Sync",
    route: "/api/crays/core-command/sync-preview",
    confirmation: "stage-sync-preview-command",
  };
}

const caseModuleLinkSpecs = [
  { moduleKey: "crm", label: "CRM", view: "timeline", record: "opportunities", purpose: "relationships" },
  { moduleKey: "project", label: "Project", view: "board", record: "all", purpose: "opening work" },
  { moduleKey: "erp", label: "ERP", view: "finance-summary", record: "all", purpose: "economics" },
  { moduleKey: "files", label: "Files", view: "vault", record: "all", purpose: "documents" },
  { moduleKey: "analytics", label: "Analytics", view: "scorecards", record: "all", purpose: "scores" },
  { moduleKey: "loans", label: "Loans", view: "package-readiness", record: "all", purpose: "bank readiness" },
] as const;

function caseModuleLinks(role: string, item: RealProductCase) {
  return caseModuleLinkSpecs.map((spec) => {
    const params = new URLSearchParams({
      role,
      case: item.offerId,
      view: spec.view,
      record: spec.record,
    });
    if (item.dealId) params.set("deal", item.dealId);
    if (item.propertyCaseId) params.set("propertyCase", item.propertyCaseId);
    return {
      ...spec,
      href: `/${spec.moduleKey}?${params.toString()}`,
    };
  });
}

function commandBodyForAction(item: RealProductCase, actionKey: string, label: string, role: string, moduleLabel: CommandDraftRequest["moduleLabel"]) {
  const base = {
    idempotencyKey: `workbench:${item.offerId}:${actionKey}`,
    actorRole: role,
    preparedOfferId: item.offerId,
    dealId: item.dealId,
    propertyCaseId: item.propertyCaseId,
  };
  const notes = `CRAYS workbench staged this review command for ${item.title}. Execution remains closed until approval, scope and preflight are present.`;

  if (moduleLabel === "Project") {
    return {
      ...base,
      action: "update",
      title: label,
      status: "drafted",
      priority: "high",
      ownerRole: role,
      notes,
    };
  }

  if (moduleLabel === "CRM") {
    return {
      ...base,
      commandType: "task",
      action: "create_task",
      subject: label,
      body: notes,
      status: "drafted",
      priority: "normal",
      assigneeRole: role,
    };
  }

  if (moduleLabel === "Files") {
    return {
      ...base,
      commandType: "visibility_review",
      action: "request_visibility_review",
      title: label,
      notes,
      status: "drafted",
      sectionKey: actionKey,
      visibilityScope: actionKey.includes("bank") ? "bank_partner" : actionKey.includes("owner") ? "property_owner" : "internal_review",
    };
  }

  if (moduleLabel === "ERP") {
    return {
      ...base,
      commandType: "finance_summary",
      action: "request_finance_review",
      title: label,
      notes,
      status: "drafted",
      currency: "EUR",
    };
  }

  if (moduleLabel === "Loans") {
    return {
      ...base,
      commandType: "bank_package_checklist",
      action: "request_bank_review",
      title: label,
      notes,
      status: "drafted",
      checklistItemKey: actionKey,
    };
  }

  return {
    ...base,
    commandType: "apply_gate_request",
    action: "request_apply_gate",
    title: label,
    notes,
    status: "drafted",
    sourceModule: "crays-core",
    targetModule: "operating-platform",
    entityTypeKey: "prepared-offer",
    rollbackPlan: "Target apply remains blocked until an exact execution gate is approved.",
  };
}

function commandDraftForAction(item: RealProductCase, actionKey: string, label: string, role: string): CommandDraftRequest {
  const route = commandRouteForAction(actionKey);
  return {
    localKey: localActionKey(item, actionKey),
    offerId: item.offerId,
    actionKey,
    label,
    ...route,
    idempotencyKey: `workbench:${item.offerId}:${actionKey}`,
    body: commandBodyForAction(item, actionKey, label, role, route.moduleLabel),
  };
}

async function persistCommandDraft(request: CommandDraftRequest): Promise<Omit<CommandDraftRecord, "createdAt">> {
  try {
    const response = await fetch(request.route, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crays-dev-confirm": request.confirmation,
      },
      body: JSON.stringify(request.body),
    });
    const payload = (await response.json().catch(() => ({}))) as CommandDraftResponse;
    const status = response.ok
      ? payload.status === "idempotent_existing"
        ? "idempotent_existing"
        : "created"
      : payload.status === "invalid"
        ? "invalid"
        : "blocked";
    const commandStatus = payload.result?.commandStatus ? `, ${payload.result.commandStatus}` : "";
    const targetApplyStatus = payload.result?.targetApplyStatus ? `, apply ${payload.result.targetApplyStatus}` : "";
    const message = response.ok
      ? `${request.moduleLabel} command draft stored${commandStatus}${targetApplyStatus}.`
      : (payload.reason ?? payload.error ?? `HTTP ${response.status}`);

    return {
      localKey: request.localKey,
      offerId: request.offerId,
      actionKey: request.actionKey,
      label: request.label,
      moduleLabel: request.moduleLabel,
      route: request.route,
      status,
      message,
      commandId: payload.result?.commandId ?? null,
      applyGate: payload.result?.applyGate ?? null,
    };
  } catch (error) {
    return {
      localKey: request.localKey,
      offerId: request.offerId,
      actionKey: request.actionKey,
      label: request.label,
      moduleLabel: request.moduleLabel,
      route: request.route,
      status: "network_error",
      message: error instanceof Error ? error.message : "Command draft could not reach the local server.",
      commandId: null,
      applyGate: null,
    };
  }
}

function actionIsStaged(item: RealProductCase, action: string, localActions: string[]) {
  return localActions.includes(localActionKey(item, action));
}

function taskState(item: RealProductCase, action: string, localActions: string[], ready: boolean, waitingLabel: string) {
  if (actionIsStaged(item, action, localActions)) return "Staged local";
  return ready ? "Ready" : waitingLabel;
}

function caseTasks(item: RealProductCase, localActions: string[]) {
  return [
    {
      key: "property-fit",
      owner: "Expansion",
      label: "Property fit review",
      state: taskState(item, "property-fit", localActions, item.handoffStatus === "ready", "Needs review"),
      action: "Review property fit",
    },
    {
      key: "location-evidence",
      owner: "Expansion",
      label: "Location evidence",
      state: taskState(item, "location-evidence", localActions, item.evidence.locationRuns > 0, "Missing evidence"),
      action: "Open evidence",
    },
    {
      key: "deal-economics",
      owner: "Deal Manager",
      label: "Deal economics",
      state: taskState(item, "deal-economics", localActions, item.evidence.dealEconomicsModels > 0, "Model needed"),
      action: "Review economics",
    },
    {
      key: "candidate-intent",
      owner: "Deal Manager",
      label: "Candidate intent",
      state: taskState(item, "candidate-intent", localActions, item.kycAmlStatus === "passed", "Release gated"),
      action: "Prepare candidate update",
    },
    {
      key: "bank-readiness",
      owner: "Finance",
      label: "Bank package readiness",
      state: taskState(item, "bank-readiness", localActions, item.bankPackageStatus === "ready", "Blocked"),
      action: "Prepare bank checklist",
    },
    {
      key: "opening-handoff",
      owner: "Operations",
      label: "Opening handoff",
      state: taskState(item, "opening-handoff", localActions, item.scores.openingReadiness !== null && item.scores.openingReadiness >= 80, "Not ready"),
      action: "Prepare handoff",
    },
  ];
}

function transitionState(item: RealProductCase, key: string, localActions: string[], drafts: CommandDraftRecord[], ready: boolean, waitingLabel: string) {
  const stored = drafts.find((draft) => draft.actionKey === key || draft.label.toLowerCase().includes(key.replace("transition-", "").replace("-", " ")));
  if (stored?.commandId) return { label: "Command stored", commandId: stored.commandId, applyGate: stored.applyGate };
  if (actionIsStaged(item, key, localActions)) return { label: "Staged this session", commandId: null, applyGate: null };
  return { label: ready ? "Ready" : waitingLabel, commandId: null, applyGate: null };
}

function caseTransitions(item: RealProductCase, localActions: string[], drafts: CommandDraftRecord[]) {
  const definitions = [
    {
      key: "transition-property",
      label: "Property review",
      owner: "Expansion Manager",
      moduleLabel: "Project",
      targetObject: item.propertyCaseId ?? item.offerId,
      ready: item.handoffStatus === "ready" && item.scores.location !== null,
      waitingLabel: "Owner handoff or location score pending",
      blocker: item.handoffStatus === "ready" ? "No property blocker in this read model." : "Owner handoff is not ready.",
      nextAction: "Stage property review transition",
    },
    {
      key: "transition-evidence",
      label: "Evidence review",
      owner: "Deal Manager",
      moduleLabel: "Files",
      targetObject: item.offerId,
      ready: item.evidence.packages > 0 && item.evidence.blockedReleaseGates === 0,
      waitingLabel: "Evidence gates pending",
      blocker: item.evidence.blockedReleaseGates > 0 ? `${item.evidence.blockedReleaseGates} release gates blocked.` : "No evidence blocker in this read model.",
      nextAction: "Stage evidence review transition",
    },
    {
      key: "transition-finance",
      label: "Finance review",
      owner: "Finance",
      moduleLabel: "ERP",
      targetObject: item.dealId ?? item.offerId,
      ready: item.evidence.dealEconomicsModels > 0 && item.scores.bankability !== null,
      waitingLabel: "Economics or bankability pending",
      blocker: item.evidence.dealEconomicsModels > 0 ? "No finance blocker in this read model." : "Deal economics model is missing.",
      nextAction: "Stage finance review transition",
    },
    {
      key: "transition-candidate",
      label: "Candidate intent",
      owner: "Deal Manager",
      moduleLabel: "CRM",
      targetObject: item.dealId ?? item.offerId,
      ready: item.kycAmlStatus === "passed" && item.equityStatus === "confirmed",
      waitingLabel: "Candidate evidence pending",
      blocker: item.kycAmlStatus === "passed" ? "No candidate identity blocker in this read model." : "Candidate identity or equity is not cleared.",
      nextAction: "Stage candidate transition",
    },
    {
      key: "transition-bank",
      label: "Bank readiness",
      owner: "Finance",
      moduleLabel: "Loans",
      targetObject: item.dealId ?? item.offerId,
      ready: item.bankPackageStatus === "ready",
      waitingLabel: "Bank package blocked",
      blocker: item.bankPackageStatus === "ready" ? "No bank package blocker in this read model." : "Bank package is not ready.",
      nextAction: "Stage bank readiness transition",
    },
    {
      key: "transition-opening",
      label: "Opening handoff",
      owner: "Franchise Partner",
      moduleLabel: "Project",
      targetObject: item.dealId ?? item.offerId,
      ready: item.scores.openingReadiness !== null && item.scores.openingReadiness >= 80,
      waitingLabel: "Opening readiness pending",
      blocker:
        item.scores.openingReadiness !== null && item.scores.openingReadiness >= 70
          ? "No opening blocker in this read model."
          : "Opening readiness needs project handoff detail.",
      nextAction: "Stage opening handoff transition",
    },
  ];

  return definitions.map((definition) => ({
    ...definition,
    state: transitionState(item, definition.key, localActions, drafts, definition.ready, definition.waitingLabel),
  }));
}

function stakeholderRooms(item: RealProductCase, localActions: string[]) {
  return [
    {
      key: "candidate-room",
      audience: "Franchise Candidate",
      state: actionIsStaged(item, "candidate-room", localActions) ? "Preview staged" : "Prepared closed",
      scope: "Released evidence summary, questions, intent state and financing path only after release.",
      visibleSections: ["Deal summary", "Location evidence", "Funding path", "Opening timeline"],
      hiddenSections: ["Internal gates", "Bank conditions", "Owner negotiation notes"],
      redactions: ["Internal risk notes", "Unapproved finance assumptions"],
      prerequisites: ["Candidate release gate", "Evidence redaction review", "Reviewer approval"],
      leakageCheck: "No bank package conditions, internal gate notes or owner negotiation records are exposed.",
      nextStep: "Stage Candidate room preview command for review history.",
      releaseGate: "CANDIDATE_ROOM_RELEASE",
      action: "Preview candidate room",
    },
    {
      key: "owner-room",
      audience: "Property Owner",
      state: actionIsStaged(item, "owner-room", localActions) ? "Preview staged" : "Prepared closed",
      scope: "Property fit, rent potential, owner handoff status and missing actions after owner release.",
      visibleSections: ["Property facts", "Fit summary", "Handoff checklist", "Lease questions"],
      hiddenSections: ["Candidate finance", "Bank package", "Internal scoring logic"],
      redactions: ["Candidate identity", "Banking evidence", "Internal valuation notes"],
      prerequisites: ["Owner release gate", "Property fact review", "Reviewer approval"],
      leakageCheck: "Candidate identity, bank evidence and internal score details stay hidden.",
      nextStep: "Stage Owner room preview command for property-scope review.",
      releaseGate: "OWNER_ROOM_RELEASE",
      action: "Preview owner room",
    },
    {
      key: "bank-room",
      audience: "Bank Partner",
      state: actionIsStaged(item, "bank-room", localActions) ? "Preview staged" : "Prepared closed",
      scope: "Released bank package status, conditions and evidence provenance after exact bank release.",
      visibleSections: ["Bank package", "Finance summary", "Evidence package", "Conditions"],
      hiddenSections: ["Owner negotiation notes", "Candidate-private comments", "Internal release gates"],
      redactions: ["Non-bank documents", "Internal blocker notes", "Unapproved partner terms"],
      prerequisites: ["Bank release gate", "Finance review", "Document grant review"],
      leakageCheck: "Only bank-granted evidence metadata is prepared; no lender send or release is executed.",
      nextStep: "Stage Bank room preview command for finance/document review.",
      releaseGate: "BANK_ROOM_RELEASE",
      action: "Preview bank room",
    },
    {
      key: "partner-room",
      audience: "Franchise Partner",
      state: actionIsStaged(item, "partner-room", localActions) ? "Preview staged" : "Prepared closed",
      scope: "Opening tasks, training, files, launch readiness and support handoff after partner release.",
      visibleSections: ["Opening work", "Training tasks", "Launch files", "Support handoff"],
      hiddenSections: ["Bank-only evidence", "Candidate-private history", "Internal QA notes"],
      redactions: ["Internal scoring notes", "Unapproved vendor terms"],
      prerequisites: ["Partner release gate", "Opening readiness review", "Operations approval"],
      leakageCheck: "Opening work can be previewed without exposing bank-only or Candidate-private records.",
      nextStep: "Stage Partner room preview command for opening handoff review.",
      releaseGate: "PARTNER_ROOM_RELEASE",
      action: "Preview partner room",
    },
  ];
}

function releaseGates(item: RealProductCase, localActions: string[]) {
  return [
    {
      key: "candidate-release",
      label: "Candidate release",
      state: actionIsStaged(item, "candidate-release", localActions) ? "Approval staged" : "Ready for exact approval",
      detail: `${item.evidence.blockedReleaseGates} release preflight items require review before candidate visibility changes.`,
      action: "Stage candidate approval",
    },
    {
      key: "owner-release",
      label: "Owner room release",
      state: actionIsStaged(item, "owner-release", localActions) ? "Approval staged" : "Ready for exact approval",
      detail: "Owner workspace can be prepared with scoped property fit, rent and missing-action evidence.",
      action: "Stage owner approval",
    },
    {
      key: "bank-release",
      label: "Bank release",
      state: actionIsStaged(item, "bank-release", localActions) ? "Approval staged" : "Ready for exact approval",
      detail: `${labelize(item.bankPackageStatus)} bank package state; lender send stays a separate reviewed execution step.`,
      action: "Stage bank approval",
    },
    {
      key: "module-apply",
      label: "Module apply",
      state: actionIsStaged(item, "module-apply", localActions) ? "Approval staged" : "Ready for exact approval",
      detail: "Project, CRM, Files, ERP, Loans and Sync apply commands need target, rollback and audit before execution.",
      action: "Stage apply approval",
    },
  ];
}

function workspaceViewFromParam(value: string | null): WorkspaceView {
  return value && workspaceViewKeys.has(value as WorkspaceView) ? (value as WorkspaceView) : "overview";
}

function filterCaseForStep(item: RealProductCase, step: string) {
  if (step === "all") return true;
  if (step === "owner-property-check") return item.handoffStatus !== "ready";
  if (step === "location-intelligence") return item.evidence.locationRuns === 0;
  if (step === "rent-potential") return item.evidence.rentModels === 0;
  if (step === "prepared-deal") return item.evidence.dealEconomicsModels === 0;
  if (step === "candidate-evidence") return item.kycAmlStatus !== "passed";
  if (step === "bank-evidence") return item.bankPackageStatus !== "ready";
  if (step === "controlled-release") return item.evidence.blockedReleaseGates > 0;
  return true;
}

export function RealProductWorkbench() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const requestedStep = searchParams.get("step") ?? "all";
  const requestedCase = searchParams.get("case");
  const requestedTab = workspaceViewFromParam(searchParams.get("tab"));
  const [loadState, setLoadState] = useState<LoadState>({ state: "loading", data: null, error: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [activeStep, setActiveStep] = useState(requestedStep);
  const [selectedId, setSelectedId] = useState<string | null>(requestedCase);
  const [stagedEvents, setStagedEvents] = useState<string[]>([]);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(requestedTab);
  const [localActions, setLocalActions] = useState<string[]>([]);
  const [commandDrafts, setCommandDrafts] = useState<CommandDraftRecord[]>([]);
  const [persistedCommandDrafts, setPersistedCommandDrafts] = useState<CommandDraftRecord[]>([]);
  const [commandHistoryState, setCommandHistoryState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [commandHistoryRefreshKey, setCommandHistoryRefreshKey] = useState(0);
  const [caseActivityState, setCaseActivityState] = useState<{
    state: "idle" | "loading" | "ready" | "error";
    data: CaseActivityBackbonePayload["readModel"] | null;
  }>({ state: "idle", data: null });
  const [caseActivityRefreshKey, setCaseActivityRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadRealProductWorkbench(role, controller.signal)
      .then((data) => {
        setLoadState({ state: "ready", data, error: null });
        setSelectedId((current) => {
          const currentExists = data.readModel.cases.some((item) => item.offerId === current);
          return currentExists ? current : (data.readModel.cases[0]?.offerId ?? null);
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({ state: "error", data: null, error: error instanceof Error ? error.message : "Real product workbench failed" });
      });

    return () => controller.abort();
  }, [refreshKey, role]);

  const readModel = loadState.data?.readModel ?? null;
  const selectedCase = readModel?.cases.find((item) => item.offerId === selectedId) ?? readModel?.cases[0] ?? null;

  useEffect(() => {
    if (!selectedCase) return;

    const controller = new AbortController();
    loadPersistedCommandHistory(role, selectedCase, controller.signal)
      .then((drafts) => {
        setPersistedCommandDrafts(drafts);
        setCommandHistoryState("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPersistedCommandDrafts([]);
        setCommandHistoryState("error");
      });

    return () => controller.abort();
  }, [commandHistoryRefreshKey, role, selectedCase]);

  useEffect(() => {
    if (!selectedCase) return;

    const controller = new AbortController();
    loadCaseActivityBackbone(role, selectedCase, controller.signal)
      .then((payload) => {
        setCaseActivityState({ state: "ready", data: payload.readModel ?? null });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCaseActivityState({ state: "error", data: null });
      });

    return () => controller.abort();
  }, [caseActivityRefreshKey, role, selectedCase]);

  const filteredCases = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (readModel?.cases ?? []).filter((item) => {
      const matchesStep = filterCaseForStep(item, activeStep);
      const searchable = [
        item.title,
        item.market,
        item.city,
        item.country,
        item.status,
        item.caseStatus,
        item.dealStage,
        item.nextAction,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStep && (!normalized || searchable.includes(normalized));
    });
  }, [activeStep, query, readModel?.cases]);

  const selectedCommandDrafts = useMemo(() => {
    const selectedSessionCommandDrafts = selectedCase ? commandDrafts.filter((draft) => draft.offerId === selectedCase.offerId) : [];
    const selectedPersistedCommandDrafts = selectedCase ? persistedCommandDrafts.filter((draft) => draft.offerId === selectedCase.offerId) : [];
    const seen = new Set<string>();
    return [...selectedSessionCommandDrafts, ...selectedPersistedCommandDrafts]
      .filter((draft) => {
        const key = draft.commandId ? `command:${draft.commandId}` : draft.localKey;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20);
  }, [commandDrafts, persistedCommandDrafts, selectedCase]);
  const selectedLocalActions = selectedCase
    ? localActions
        .filter((action) => action.startsWith(`${selectedCase.offerId}:`))
        .map((action) => action.replace(`${selectedCase.offerId}:`, ""))
    : [];
  const latestCommandDraft = selectedCommandDrafts[0] ?? null;
  const caseActivity = caseActivityState.data;
  const selectedCaseHref = selectedCase
    ? `/dashboard?role=${role}&view=case&case=${encodeURIComponent(selectedCase.offerId)}${selectedCase.dealId ? `&deal=${encodeURIComponent(selectedCase.dealId)}` : ""}${selectedCase.propertyCaseId ? `&propertyCase=${encodeURIComponent(selectedCase.propertyCaseId)}` : ""}`
    : `/dashboard?role=${role}&view=work-queue`;
  const commandQueueHref = `/dashboard?role=${role}&view=actions`;

  function stage(label: string, actionKey?: string) {
    if (selectedCase && actionKey) {
      const key = localActionKey(selectedCase, actionKey);
      setLocalActions((actions) => (actions.includes(key) ? actions : [key, ...actions]));
      const draft = commandDraftForAction(selectedCase, actionKey, label, role);
      const createdAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const stagingRecord: CommandDraftRecord = {
        localKey: draft.localKey,
        offerId: draft.offerId,
        actionKey: draft.actionKey,
        label: draft.label,
        moduleLabel: draft.moduleLabel,
        route: draft.route,
        status: "staging",
        message: "Checking guarded test-database command route.",
        commandId: null,
        applyGate: null,
        source: "session",
        createdAt,
      };
      setCommandDrafts((drafts) => [
        stagingRecord,
        ...drafts.filter((item) => item.localKey !== draft.localKey),
      ].slice(0, 16));
      void persistCommandDraft(draft).then((result) => {
        setCommandDrafts((drafts) => [
          { ...result, source: "session" as const, createdAt },
          ...drafts.filter((item) => item.localKey !== draft.localKey),
        ].slice(0, 16));
        if (result.commandId) {
          setCommandHistoryState("loading");
          setCommandHistoryRefreshKey((value) => value + 1);
          setCaseActivityRefreshKey((value) => value + 1);
        }
      });
    }
    setStagedEvents((events) => [eventLabel(label), ...events].slice(0, 8));
  }

  function updateUrlState(next: { step?: string; caseId?: string | null; tab?: WorkspaceView }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", role);
    params.set("step", next.step ?? activeStep);
    const nextCaseId = next.caseId ?? selectedId;
    if (nextCaseId) params.set("case", nextCaseId);
    params.set("tab", next.tab ?? workspaceView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function selectStep(step: string) {
    setActiveStep(step);
    updateUrlState({ step });
  }

  function selectCase(caseId: string) {
    setSelectedId(caseId);
    updateUrlState({ caseId });
  }

  function selectWorkspaceView(tab: WorkspaceView) {
    setWorkspaceView(tab);
    updateUrlState({ tab });
  }

  function runDashboardMetric(metricKey: string) {
    if (metricKey === "property-checks") {
      selectStep("owner-property-check");
      selectWorkspaceView("property");
      return;
    }

    if (metricKey === "evidence-records") {
      selectStep("candidate-evidence");
      selectWorkspaceView("files");
      return;
    }

    if (metricKey === "blocked-gates") {
      selectStep("controlled-release");
      selectWorkspaceView("gates");
      return;
    }

    if (metricKey === "tool-maps") {
      router.push(`/dashboard?role=${role}&view=process-suites`);
      return;
    }

    selectStep("all");
    selectWorkspaceView("overview");
  }

  function dashboardMetricAction(metricKey: string) {
    if (metricKey === "property-checks") return "Open property workflow";
    if (metricKey === "evidence-records") return "Open evidence workflow";
    if (metricKey === "blocked-gates") return "Open gate workflow";
    if (metricKey === "tool-maps") return "Open process suites";
    return "Filter deal queue";
  }

  if (loadState.state === "loading") {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading real product workbench
        </div>
      </div>
    );
  }

  if (loadState.state === "error" || !readModel) {
    return (
      <div className="mx-auto max-w-[1440px] rounded-[8px] border border-rose-200 bg-white p-6 text-sm text-rose-700">
        {loadState.error ?? "Real product workbench is not available."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 max-[720px]:p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-[var(--accent)]" />
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Deal operations</p>
              </div>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-normal max-[720px]:text-2xl">
                {readModel.roleFocus.title}
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--ink-muted)]">{readModel.roleFocus.summary}</p>
              {selectedCase ? (
                <div className="mt-4 grid gap-3 rounded-[8px] border border-[var(--line)] bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Link href={selectedCaseHref} className="group min-w-0">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Current decision</p>
                    <h2 className="mt-2 truncate text-lg font-semibold group-hover:text-[var(--accent)]">{selectedCase.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selectedCase.nextAction}</p>
                  </Link>
                  <div className="grid gap-2 rounded-[8px] bg-[var(--surface)] p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ink-muted)]">Deal stage</span>
                      <strong>{labelize(selectedCase.dealStage)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ink-muted)]">Command drafts</span>
                      <strong>{selectedCommandDrafts.length}</strong>
                    </div>
                    <Link href={commandQueueHref} className="mt-1 inline-flex items-center justify-center gap-1 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 font-semibold transition hover:border-[var(--accent)]">
                      Review commands
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 flex max-w-full flex-wrap gap-2">
                {[
                  { label: "Open work queue", href: `/dashboard?role=${role}&view=work-queue` },
                  { label: "Open active case", href: selectedCaseHref },
                  { label: "Review stakeholder rooms", href: `/dashboard?role=${role}&view=rooms` },
                  { label: "Review commands", href: commandQueueHref },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadState({ state: "loading", data: null, error: null });
                setRefreshKey((value) => value + 1);
              }}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {readModel.dashboards.map((metric) => (
              <button
                key={metric.key}
                type="button"
                onClick={() => runDashboardMetric(metric.key)}
                className={`rounded-[8px] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--accent)] ${toneClass[metric.tone]}`}
              >
                <p className="text-xs font-semibold uppercase opacity-70">{metric.label}</p>
                <strong className="mt-3 block text-2xl font-semibold tracking-normal">{metric.value}</strong>
                <span className="mt-2 block text-xs leading-5 opacity-75">{metric.context}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold opacity-90">
                  {dashboardMetricAction(metric.key)}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-[var(--rose)]" />
            <h2 className="font-semibold">Control state</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {[
              ["Live source calls", readModel.boundaries.liveSourceCallsEnabled, `/dashboard?role=${role}&view=signals`, "Open signal review"],
              ["Source writes", readModel.boundaries.sourceWritesEnabled, `/dashboard?role=${role}&view=actions`, "Review command policy"],
              ["Owner uploads", readModel.boundaries.ownerUploadsEnabled, `/dashboard?role=${role}&view=rooms`, "Review owner room"],
              ["Candidate release", readModel.boundaries.candidateReleaseEnabled, `/dashboard?role=${role}&view=rooms`, "Review candidate room"],
              ["Bank send", readModel.boundaries.bankSendEnabled, `/loans?role=${role}&view=package-readiness&record=packages`, "Open bank workflow"],
              ["Payment initiation", readModel.boundaries.paymentInitiationEnabled, `/erp?role=${role}&view=budget-review&record=budgets`, "Open finance workflow"],
            ].map(([label, enabled, href, action]) => (
              <Link key={label as string} href={href as string} className="flex items-center justify-between rounded-[8px] bg-white p-3 text-sm transition hover:ring-1 hover:ring-[var(--accent)]">
                <span>
                  {label as string}
                  <span className="mt-1 block text-[11px] font-semibold text-[var(--accent)]">{action as string}</span>
                </span>
                <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{enabled ? "Open" : "Closed"}</span>
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-2 rounded-[8px] border border-[var(--line)] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
            <Link href={`/dashboard?role=${role}&view=work-queue`} className="flex items-center justify-between gap-3 rounded-[6px] px-1 py-1 hover:bg-[var(--surface-muted)]">
              <span>Core deal records</span>
              <strong className="text-[var(--foreground)]">{readModel.summary.preparedDeals}</strong>
            </Link>
            <Link href={`/dashboard?role=${role}&view=process-suites`} className="flex items-center justify-between gap-3 rounded-[6px] px-1 py-1 hover:bg-[var(--surface-muted)]">
              <span>Module read maps</span>
              <strong className="text-[var(--foreground)]">{readModel.summary.toolReadMaps}</strong>
            </Link>
            <Link href={`/dashboard?role=${role}&view=actions`} className="flex items-center justify-between gap-3 rounded-[6px] px-1 py-1 hover:bg-[var(--surface-muted)]">
              <span>Selected-case drafts</span>
              <strong className="text-[var(--foreground)]">{selectedCommandDrafts.length}</strong>
            </Link>
          </div>
        </aside>
      </section>

      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-semibold">Process rail</h2>
          </div>
          <label className="flex min-w-[260px] items-center gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 max-[520px]:min-w-0 max-[520px]:w-full">
            <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search deals, cities, actions" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <button
            type="button"
            onClick={() => selectStep("all")}
            className={`rounded-[8px] border p-3 text-left transition ${activeStep === "all" ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"}`}
          >
            <span className="text-xs font-semibold uppercase opacity-70">All</span>
            <strong className="mt-2 block text-xl">{readModel.summary.preparedDeals}</strong>
            <span className="mt-1 block text-xs opacity-75">prepared deals</span>
          </button>
          {readModel.journey.map((step) => {
            const Icon = journeyIcons[step.key as keyof typeof journeyIcons] ?? CheckCircle2;
            const active = activeStep === step.key;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => selectStep(step.key)}
                className={`rounded-[8px] border p-3 text-left transition ${active ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{step.ready}/{step.ready + step.waiting}</span>
                </div>
                <strong className="mt-3 block text-sm leading-5">{step.label}</strong>
                <span className="mt-2 block text-xs opacity-75">{step.blocked ? `${step.blocked} blocked` : step.owner}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(520px,1.2fr)] 2xl:grid-cols-[minmax(340px,0.8fr)_minmax(560px,1.15fr)_320px]">
        <article className="min-w-0 overflow-hidden rounded-[8px] border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Prepared deal queue</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{filteredCases.length} visible records from CRAYS Core</p>
          </div>
          <div className="crays-scrollbar max-h-[620px] overflow-y-auto">
            {filteredCases.map((item) => {
              const readiness = caseReadiness(item);
              return (
                <button
                  key={item.offerId}
                  type="button"
                  onClick={() => selectCase(item.offerId)}
                  className={`grid w-full gap-3 border-b border-[var(--line)] px-5 py-4 text-left transition hover:bg-[var(--surface)] ${selectedCase?.offerId === item.offerId ? "bg-sky-50" : "bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">{item.title}</strong>
                      <span className="mt-1 block text-xs text-[var(--ink-muted)]">{item.market}</span>
                    </div>
                    <span className={`text-sm font-semibold ${readinessTone(readiness)}`}>{readiness}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-[var(--ink-muted)]">
                    <span>{formatScore(item.scores.location)} location</span>
                    <span>{formatScore(item.scores.bankability)} bank</span>
                    <span>{item.evidence.blockedReleaseGates} gates</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--ink-muted)]">{item.nextAction}</span>
                </button>
              );
            })}
            {!filteredCases.length ? <p className="px-5 py-8 text-sm text-[var(--ink-muted)]">No prepared deals match this filter.</p> : null}
          </div>
        </article>

        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          {selectedCase ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{selectedCase.market}</p>
                  <h2 className="mt-2 text-xl font-semibold">{selectedCase.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selectedCase.nextAction}</p>
                </div>
                <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                  {labelize(selectedCase.status)}
                </span>
              </div>

              <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Open case in</span>
                  {caseModuleLinks(role, selectedCase).map((link) => (
                    <a
                      key={link.moduleKey}
                      href={link.href}
                      className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                      title={link.purpose}
                    >
                      {link.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                {workspaceTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = workspaceView === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => selectWorkspaceView(tab.key)}
                      className={`flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-semibold transition ${
                        active ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {workspaceView === "overview" ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["Location", formatScore(selectedCase.scores.location), "property"],
                  ["Bankability", formatScore(selectedCase.scores.bankability), "bank"],
                  ["Opening", formatScore(selectedCase.scores.openingReadiness), "opening"],
                  ["Target MRR", formatMoney(selectedCase.scores.targetMRR), "economics"],
                  ["Investment", formatMoney(selectedCase.scores.targetRaise), "economics"],
                  ["Equity", formatMoney(selectedCase.scores.ownEquity), "candidate"],
                ].map(([label, value, tab]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => selectWorkspaceView(tab as WorkspaceView)}
                    className="rounded-[8px] border border-[var(--line)] bg-white p-3 text-left transition hover:border-[var(--accent)]"
                  >
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                    <strong className="mt-2 block text-lg">{value}</strong>
                    <span className="mt-2 block text-[11px] font-semibold text-[var(--accent)]">Open {tab as string} workflow</span>
                  </button>
                ))}
              </div>

                  <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-[var(--accent)]" />
                  <h3 className="font-semibold">Evidence stack</h3>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {[
                    ["Packages", selectedCase.evidence.packages, "files"],
                    ["Location runs", selectedCase.evidence.locationRuns, "property"],
                    ["Property records", selectedCase.evidence.propertySupplyRecords, "property"],
                    ["Rent models", selectedCase.evidence.rentModels, "economics"],
                    ["Deal economics", selectedCase.evidence.dealEconomicsModels, "economics"],
                    ["Bank snapshots", selectedCase.evidence.bankingSnapshots, "bank"],
                    ["Documents", `${selectedCase.evidence.approvedDocuments}/${selectedCase.evidence.documents}`, "files"],
                    ["Blocked gates", selectedCase.evidence.blockedReleaseGates, "gates"],
                  ].map(([label, value, tab]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => selectWorkspaceView(tab as WorkspaceView)}
                      className="flex items-center justify-between rounded-[8px] bg-[var(--surface)] px-3 py-2 text-left text-sm transition hover:ring-1 hover:ring-[var(--accent)]"
                    >
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </button>
                  ))}
                </div>
              </div>

                  <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-[var(--blue)]" />
                  <h3 className="font-semibold">Module signals</h3>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {Object.entries(selectedCase.toolSignals).map(([label, value]) => (
                    <button
                      key={label}
                      type="button"
                          onClick={() => stage(`${label.toUpperCase()} read signal opened for ${selectedCase.title}`, `signal-${label}`)}
                      className="flex items-center justify-between rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                    >
                      <span className="capitalize">{label}</span>
                      <span>{value}</span>
                    </button>
                  ))}
                </div>
              </div>
                </>
              ) : null}

              {workspaceView === "property" ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                    <Building2 className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-semibold">Property work</h3>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    {[
                      ["Property case", labelize(selectedCase.caseStatus)],
                      ["Owner handoff", labelize(selectedCase.handoffStatus)],
                      ["Location", formatScore(selectedCase.scores.location)],
                      ["Property records", selectedCase.evidence.propertySupplyRecords],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                        <strong className="mt-2 block text-lg">{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-[var(--line)]">
                    {caseTasks(selectedCase, localActions).slice(0, 2).map((task) => (
                      <div key={task.key} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_170px] md:items-center">
                        <div className="min-w-0">
                          <strong className="block text-sm">{task.label}</strong>
                          <span className="mt-1 block text-xs font-semibold uppercase text-[var(--ink-muted)]">{task.owner}</span>
                        </div>
                        <span className="w-fit rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold">{task.state}</span>
                        <button
                          type="button"
                          onClick={() => stage(`${task.action} command drafted for ${selectedCase.title}`, task.key)}
                          className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                        >
                          {task.action}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {workspaceView === "evidence" ? (
                <div className="space-y-3">
                  <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-[var(--accent)]" />
                      <h3 className="font-semibold">Evidence workbench</h3>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {[
                        ["Evidence packages", selectedCase.evidence.packages],
                        ["Location runs", selectedCase.evidence.locationRuns],
                        ["Rent models", selectedCase.evidence.rentModels],
                        ["Deal economics", selectedCase.evidence.dealEconomicsModels],
                        ["Bank snapshots", selectedCase.evidence.bankingSnapshots],
                        ["Ready gates", selectedCase.evidence.readyReleaseGates],
                      ].map(([label, value]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => stage(`${label} evidence opened for ${selectedCase.title}`, `evidence-${label}`)}
                          className="flex items-center justify-between rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm transition hover:border-[var(--accent)]"
                        >
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                    <h3 className="font-semibold">Module signals</h3>
                    <div className="mt-4 grid gap-2 md:grid-cols-3">
                      {Object.entries(selectedCase.toolSignals).map(([label, value]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => stage(`${label.toUpperCase()} signal command drafted for ${selectedCase.title}`, `signal-${label}`)}
                          className="flex items-center justify-between rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                        >
                          <span className="capitalize">{label}</span>
                          <span>{value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {workspaceView === "economics" ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                    <LineChart className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-semibold">Deal economics</h3>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-3">
                    {[
                      ["Target MRR", formatMoney(selectedCase.scores.targetMRR)],
                      ["Investment", formatMoney(selectedCase.scores.targetRaise)],
                      ["Own equity", formatMoney(selectedCase.scores.ownEquity)],
                      ["Bank debt", formatMoney(selectedCase.scores.bankDebt)],
                      ["Rent models", selectedCase.evidence.rentModels],
                      ["Economics models", selectedCase.evidence.dealEconomicsModels],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                        <strong className="mt-2 block text-lg">{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[var(--line)] p-4">
                    <button
                      type="button"
                      onClick={() => stage(`Economics review command drafted for ${selectedCase.title}`, "deal-economics")}
                      className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white"
                    >
                      Review economics
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {workspaceView === "candidate" ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                    <Users className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-semibold">Candidate path</h3>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    {[
                      ["Deal stage", labelize(selectedCase.dealStage)],
                      ["KYC / AML", labelize(selectedCase.kycAmlStatus)],
                      ["Equity", labelize(selectedCase.equityStatus)],
                      ["Candidate room", actionIsStaged(selectedCase, "candidate-room", localActions) ? "Preview staged" : "Ready for scoped approval"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                        <strong className="mt-2 block text-sm">{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 border-t border-[var(--line)] p-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => stage(`Candidate update command drafted for ${selectedCase.title}`, "candidate-intent")}
                      className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                    >
                      Draft candidate update
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stage(`Candidate room approval staged for ${selectedCase.title}`, "candidate-room")}
                      className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                    >
                      Stage room approval
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {workspaceView === "bank" ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                    <Landmark className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-semibold">Bank package</h3>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    {[
                      ["Bank handoff", labelize(selectedCase.bankHandoffStatus)],
                      ["Package", labelize(selectedCase.bankPackageStatus)],
                      ["Loan decision", labelize(selectedCase.loanDecisionState)],
                      ["Bank snapshots", selectedCase.evidence.bankingSnapshots],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                        <strong className="mt-2 block text-sm">{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 border-t border-[var(--line)] p-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => stage(`Bank checklist command drafted for ${selectedCase.title}`, "bank-readiness")}
                      className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                    >
                      Prepare bank checklist
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stage(`Bank release approval staged for ${selectedCase.title}`, "bank-release")}
                      className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                    >
                      Stage bank approval
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {workspaceView === "opening" ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                    <Handshake className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-semibold">Opening handoff</h3>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    {[
                      ["Opening readiness", formatScore(selectedCase.scores.openingReadiness)],
                      ["Project signals", selectedCase.toolSignals.project],
                      ["Files signals", selectedCase.toolSignals.files],
                      ["Next action", selectedCase.nextAction],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                        <strong className="mt-2 block text-sm">{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[var(--line)] p-4">
                    <button
                      type="button"
                      onClick={() => stage(`Opening handoff command drafted for ${selectedCase.title}`, "opening-handoff")}
                      className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white"
                    >
                      Prepare opening handoff
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {workspaceView === "files" ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                    <NotebookTabs className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-semibold">Files and package evidence</h3>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    {[
                      ["Approved documents", selectedCase.evidence.approvedDocuments],
                      ["Total documents", selectedCase.evidence.documents],
                      ["Evidence packages", selectedCase.evidence.packages],
                      ["Files signals", selectedCase.toolSignals.files],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                        <strong className="mt-2 block text-sm">{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[var(--line)] p-4">
                    <button
                      type="button"
                      onClick={() => stage(`Files package command drafted for ${selectedCase.title}`, "files-package")}
                      className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent)]"
                    >
                      Prepare files package
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {workspaceView === "rooms" ? (
                <div className="space-y-3">
                  <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <LockKeyhole className="h-4 w-4 text-[var(--accent)]" />
                          <h3 className="font-semibold">Stakeholder room preflight</h3>
                        </div>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
                          Review external visibility before any room can be opened. Preview commands are stored as CRAYS Core drafts only; release, send and upload gates stay closed.
                        </p>
                      </div>
                      <span className="rounded-[7px] border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold uppercase text-rose-950">
                        Release gates closed
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {stakeholderRooms(selectedCase, localActions).map((room) => (
                      <article key={room.key} className="rounded-[8px] border border-[var(--line)] bg-white">
                        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-4">
                          <div className="min-w-0">
                            <strong className="block text-sm">{room.audience}</strong>
                            <span className="mt-1 block text-xs font-semibold uppercase text-[var(--ink-muted)]">{room.state}</span>
                          </div>
                          <PanelRightOpen className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                        </div>
                        <div className="space-y-4 p-4">
                          <p className="text-xs leading-5 text-[var(--ink-muted)]">{room.scope}</p>
                          <dl className="grid gap-3 text-xs sm:grid-cols-2">
                            <div>
                              <dt className="font-semibold uppercase text-[var(--ink-muted)]">Visibility check</dt>
                              <dd className="mt-1 leading-5 text-[var(--foreground)]">{room.leakageCheck}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold uppercase text-[var(--ink-muted)]">Next step</dt>
                              <dd className="mt-1 leading-5 text-[var(--foreground)]">{room.nextStep}</dd>
                            </div>
                          </dl>
                          <div className="border-t border-[var(--line)] pt-3">
                            <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Visible sections</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                            {room.visibleSections.map((section) => (
                              <span key={section} className="rounded-[7px] border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-950">
                                {section}
                              </span>
                            ))}
                            </div>
                          </div>
                          <div className="border-t border-[var(--line)] pt-3">
                            <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Hidden sections</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                            {room.hiddenSections.map((section) => (
                              <span key={section} className="rounded-[7px] border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-950">
                                {section}
                              </span>
                            ))}
                            </div>
                          </div>
                          <div className="grid gap-4 border-t border-[var(--line)] pt-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Redactions</p>
                              <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--ink-muted)]">
                                {room.redactions.map((redaction) => (
                                  <li key={redaction}>{redaction}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Prerequisites</p>
                              <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--ink-muted)]">
                                {room.prerequisites.map((prerequisite) => (
                                  <li key={prerequisite}>{prerequisite}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-xs font-semibold uppercase text-rose-950">
                            {room.releaseGate} closed
                          </div>
                          <button
                            type="button"
                            onClick={() => stage(`${room.action} staged for ${selectedCase.title}`, room.key)}
                            className="inline-flex w-full items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                          >
                            {room.action}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {workspaceView === "gates" ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                    <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-semibold">Gate review</h3>
                  </div>
                  <div className="divide-y divide-[var(--line)]">
                    {releaseGates(selectedCase, localActions).map((gate) => (
                      <div key={gate.key} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_100px_150px] md:items-center">
                        <div className="min-w-0">
                          <strong className="block text-sm">{gate.label}</strong>
                          <span className="mt-1 block text-xs leading-5 text-[var(--ink-muted)]">{gate.detail}</span>
                        </div>
                        <span
                          className={`w-fit rounded-[7px] border px-2 py-1 text-xs font-semibold ${
                            gate.state === "Approval staged" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"
                          }`}
                        >
                          {gate.state}
                        </span>
                        <button
                          type="button"
                          onClick={() => stage(`${gate.action} prepared for ${selectedCase.title}; execution waits for exact target and preflight`, gate.key)}
                          className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                        >
                          {gate.action}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {workspaceView === "transitions" ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white">
                  <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="font-semibold">Case transitions</h3>
                  </div>
                  <div className="divide-y divide-[var(--line)]">
                    {caseTransitions(selectedCase, localActions, selectedCommandDrafts).map((transition) => (
                      <div key={transition.key} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_170px_180px] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm">{transition.label}</strong>
                            <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                              {transition.moduleLabel}
                            </span>
                            <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                              {transition.owner}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{transition.blocker}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                            <span>{transition.targetObject}</span>
                            {transition.state.commandId ? <span>Stored command draft</span> : null}
                            {transition.state.applyGate ? <span>Apply closed</span> : null}
                            <span>Rollback: supersede before apply</span>
                          </div>
                        </div>
                        <span
                          className={`w-fit rounded-[7px] border px-2 py-1 text-xs font-semibold ${
                            transition.state.label === "Command stored"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                              : transition.ready
                                ? "border-sky-200 bg-sky-50 text-sky-950"
                                : "border-amber-200 bg-amber-50 text-amber-950"
                          }`}
                        >
                          {transition.state.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => stage(`${transition.label} transition command drafted for ${selectedCase.title}`, transition.key)}
                          className="inline-flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                        >
                          {transition.nextAction}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {workspaceView === "activity" ? (
                <div className="grid gap-3">
                  <div className="rounded-[8px] border border-[var(--line)] bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-[var(--accent)]" />
                        <h3 className="font-semibold">Command drafts</h3>
                        <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                          {commandHistoryState === "loading" ? "Loading history" : `${selectedCommandDrafts.length} visible`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCommandHistoryState("loading");
                          setCommandHistoryRefreshKey((value) => value + 1);
                        }}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${commandHistoryState === "loading" ? "animate-spin" : ""}`} />
                        Refresh history
                      </button>
                    </div>
                    <div className="divide-y divide-[var(--line)]">
                      {selectedCommandDrafts.length ? (
                        selectedCommandDrafts.map((draft) => (
                          <div key={draft.localKey} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_140px] md:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-sm">{draft.label}</strong>
                                <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                                  {draft.moduleLabel}
                                </span>
                                {draft.source === "persisted" ? (
                                  <span className="rounded-[7px] border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase text-emerald-950">
                                    Persisted
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{draft.message}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                                <span>{draft.moduleLabel} review path</span>
                                {draft.commandId ? <span>Stored command</span> : null}
                                {draft.actorRole ? <span>{labelize(draft.actorRole)}</span> : null}
                                {draft.targetObject ? <span>{draft.targetObject}</span> : null}
                                {draft.applyGate ? <span>Apply closed</span> : null}
                                {draft.createdAt ? <span>{draft.createdAt}</span> : null}
                              </div>
                              {draft.preflight ? <p className="mt-2 text-[11px] leading-5 text-[var(--ink-muted)]">Preflight: {draft.preflight}</p> : null}
                            </div>
                            <span className={`w-fit rounded-[7px] border px-2 py-1 text-xs font-semibold ${commandDraftStatusClass(draft.status)}`}>
                              {commandDraftStatusLabel(draft.status)}
                            </span>
                          </div>
                        ))
                      ) : commandHistoryState === "loading" ? (
                        <p className="px-4 py-5 text-sm text-[var(--ink-muted)]">Loading persisted command history for this prepared deal.</p>
                      ) : commandHistoryState === "error" ? (
                        <p className="px-4 py-5 text-sm text-[var(--rose)]">Persisted command history is not available. Session actions still stay local or guarded.</p>
                      ) : (
                        <p className="px-4 py-5 text-sm text-[var(--ink-muted)]">No command drafts for this prepared deal yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[8px] border border-[var(--line)] bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 text-[var(--accent)]" />
                        <h3 className="font-semibold">Case activity backbone</h3>
                        <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                          {caseActivityState.state === "loading" ? "Loading" : `${caseActivity?.summary?.documents ?? 0} documents`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCaseActivityState((current) => ({ state: "loading", data: current.data }));
                          setCaseActivityRefreshKey((value) => value + 1);
                        }}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--accent)]"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${caseActivityState.state === "loading" ? "animate-spin" : ""}`} />
                        Refresh activity
                      </button>
                    </div>
                    {caseActivityState.state === "error" ? (
                      <p className="px-4 py-5 text-sm text-[var(--rose)]">Case activity backbone is not available for this prepared deal.</p>
                    ) : (
                      <div className="space-y-4 p-4">
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          {[
                            ["Documents", caseActivity?.summary?.documents ?? 0],
                            ["Approved", caseActivity?.summary?.approvedDocuments ?? 0],
                            ["Workflow events", caseActivity?.summary?.workflowEvents ?? 0],
                            ["Command events", caseActivity?.summary?.commandEvents ?? 0],
                            ["KPI snapshots", caseActivity?.summary?.kpis ?? 0],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
                              <strong className="mt-1 block text-sm">{value}</strong>
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                          <section className="min-w-0">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <h4 className="text-sm font-semibold">Document metadata</h4>
                              <span className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">No files returned</span>
                            </div>
                            <div className="overflow-x-auto rounded-[8px] border border-[var(--line)]">
                              <table className="min-w-[680px] text-left text-xs">
                                <thead className="bg-[var(--surface)] text-[11px] uppercase text-[var(--ink-muted)]">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Group</th>
                                    <th className="px-3 py-2 font-semibold">Status</th>
                                    <th className="px-3 py-2 font-semibold">Version</th>
                                    <th className="px-3 py-2 font-semibold">Required for</th>
                                    <th className="px-3 py-2 font-semibold">Visibility</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--line)]">
                                  {(caseActivity?.documents ?? []).length ? (
                                    caseActivity?.documents?.map((document) => (
                                      <tr key={document.linkId}>
                                        <td className="px-3 py-2 font-semibold">{labelize(document.documentGroup)}</td>
                                        <td className="px-3 py-2">{labelize(document.status)}</td>
                                        <td className="px-3 py-2">{document.versionLabel}</td>
                                        <td className="px-3 py-2">{document.requiredFor ?? "Review"}</td>
                                        <td className="px-3 py-2">{document.visibilityRoles.length ? document.visibilityRoles.map(labelize).join(", ") : "Internal"}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={5} className="px-3 py-5 text-[var(--ink-muted)]">
                                        {caseActivityState.state === "loading" ? "Loading document metadata." : "No document metadata is linked to this case."}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </section>

                          <section className="min-w-0">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <h4 className="text-sm font-semibold">Case event timeline</h4>
                              <span className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Workflow + command</span>
                            </div>
                            <div className="rounded-[8px] border border-[var(--line)]">
                              {(caseActivity?.events ?? []).length ? (
                                caseActivity?.events?.slice(0, 6).map((event) => (
                                  <div key={event.eventId} className="grid gap-2 border-b border-[var(--line)] px-3 py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px]">
                                    <div className="min-w-0">
                                      <strong className="block text-xs">{event.label}</strong>
                                      <span className="mt-1 block text-[11px] uppercase text-[var(--ink-muted)]">
                                        {labelize(event.eventType)} · {event.source}
                                      </span>
                                    </div>
                                    <span className="text-left text-[11px] font-semibold uppercase text-[var(--ink-muted)] sm:text-right">
                                      {formatCommandHistoryTime(event.occurredAt)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="px-3 py-5 text-sm text-[var(--ink-muted)]">
                                  {caseActivityState.state === "loading" ? "Loading case events." : "No case activity events are visible yet."}
                                </p>
                              )}
                            </div>
                          </section>
                        </div>

                        <section>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold">KPI snapshots</h4>
                            <span className="text-[11px] font-semibold uppercase text-[var(--ink-muted)]">Current case</span>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {(caseActivity?.kpis ?? []).map((kpi) => (
                              <div key={kpi.key} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-xs font-semibold">{kpi.label}</p>
                                  <span className="rounded-[7px] border border-[var(--line)] bg-white px-2 py-1 text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
                                    {kpi.dataStatus}
                                  </span>
                                </div>
                                <strong className="mt-2 block text-lg">{kpi.value} {kpi.unit}</strong>
                                <p className="mt-1 text-[11px] leading-5 text-[var(--ink-muted)]">{kpi.period}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[var(--blue)]" />
                        <h3 className="font-semibold">Session review state</h3>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedLocalActions.length ? (
                          selectedLocalActions.map((action) => (
                            <span key={action} className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                              {labelize(action)}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--ink-muted)]">No session review action has been staged for this prepared deal yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                        <h3 className="font-semibold">Execution preflight</h3>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm">
                        {[
                          ["Target scope", selectedCommandDrafts.length ? "Draft present" : "Waiting for action"],
                          ["Idempotency", selectedCommandDrafts.length ? "Stable per case/action" : "Not generated"],
                          ["Rollback", selectedCommandDrafts.length ? "Required before apply" : "Waiting for action"],
                          ["External side effect", "Not executed"],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-3 rounded-[8px] bg-[var(--surface)] px-3 py-2">
                            <span>{label}</span>
                            <strong className="text-right text-xs uppercase text-[var(--ink-muted)]">{value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">Select a prepared deal.</p>
          )}
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-semibold">Role task</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{readModel.roleFocus.primaryView}</p>
            <button
              type="button"
              onClick={() => stage(`${readModel.roleFocus.primaryAction} command drafted`, "role-primary")}
              className="mt-4 inline-flex w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white"
            >
              {readModel.roleFocus.primaryAction}
              <ArrowRight className="h-4 w-4" />
            </button>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Release review</h2>
            </div>
            <div className="mt-4 space-y-2">
              {readModel.journey.slice(-3).map((step) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => selectStep(step.key)}
                  className="w-full rounded-[8px] border border-[var(--line)] bg-white p-3 text-left transition hover:border-[var(--accent)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm">{step.label}</strong>
                    <span className="text-xs font-semibold text-[var(--ink-muted)]">{step.ready} ready</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{step.primaryAction}</p>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">Session actions</h2>
            </div>
            <div className="mt-4 space-y-2">
              {latestCommandDraft ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-xs">{latestCommandDraft.moduleLabel} command</strong>
                    <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold ${commandDraftStatusClass(latestCommandDraft.status)}`}>
                      {commandDraftStatusLabel(latestCommandDraft.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{latestCommandDraft.label}</p>
                </div>
              ) : null}
              {stagedEvents.length ? (
                stagedEvents.map((event) => (
                  <div key={event} className="rounded-[8px] bg-white p-3 text-xs leading-5 text-[var(--ink-muted)]">
                    {event}
                  </div>
                ))
              ) : (
                <Link href={commandQueueHref} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3 text-sm transition hover:ring-1 hover:ring-[var(--accent)]">
                  <span>
                    <span className="font-semibold">Review active command queue</span>
                    <span className="mt-1 block text-xs text-[var(--ink-muted)]">{selectedCase ? selectedCase.title : "Prepared deal workbench"}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--accent)]" />
                </Link>
              )}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
