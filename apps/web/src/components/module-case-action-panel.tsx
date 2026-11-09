"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LockKeyhole, RefreshCw } from "lucide-react";

type ModuleKey = "crm" | "project" | "erp" | "files" | "analytics" | "loans";

type DraftState = {
  status: "idle" | "staging" | "created" | "idempotent_existing" | "invalid" | "network_error";
  commandId: string | null;
  applyGate: string | null;
  message: string;
};

type ActionSpec = {
  label: string;
  route: string;
  confirmation: string;
  allowedRoles: string[];
  body: (input: { role: string; caseId: string; dealId: string | null; propertyCaseId: string | null }) => Record<string, string | null>;
};

const actionSpecs: Record<ModuleKey, ActionSpec> = {
  project: {
    label: "Stage opening work command",
    route: "/api/crays/core-command/project-work-item",
    confirmation: "stage-project-work-item-command",
    allowedRoles: ["deal-manager", "franchise-partner", "studio-manager", "reviewer", "admin", "crays-management"],
    body: ({ role, caseId, dealId, propertyCaseId }) => ({
      idempotencyKey: `module-case:project:${caseId}:${role}:v1`,
      actorRole: role,
      preparedOfferId: caseId,
      dealId,
      propertyCaseId,
      action: "update",
      title: "Project case handoff review",
      status: "drafted",
      priority: "high",
      ownerRole: role,
      notes: "Module case action staged from the active CRAYS case context. Target apply remains blocked.",
    }),
  },
  crm: {
    label: "Stage relationship task",
    route: "/api/crays/core-command/crm-activity",
    confirmation: "stage-crm-activity-command",
    allowedRoles: ["deal-manager", "expansion-manager", "reviewer", "admin", "crays-management"],
    body: ({ role, caseId, dealId, propertyCaseId }) => ({
      idempotencyKey: `module-case:crm:${caseId}:${role}:v1`,
      actorRole: role,
      preparedOfferId: caseId,
      dealId,
      propertyCaseId,
      commandType: "task",
      action: "create_task",
      subject: "Review active case relationship next action",
      body: "CRM case action staged from the active CRAYS case context. CRM apply and external sending remain blocked.",
      status: "drafted",
      priority: "normal",
      assigneeRole: role,
    }),
  },
  files: {
    label: "Stage package review",
    route: "/api/crays/core-command/files-package",
    confirmation: "stage-files-package-command",
    allowedRoles: ["deal-manager", "finance", "reviewer", "admin", "crays-management"],
    body: ({ role, caseId, dealId, propertyCaseId }) => ({
      idempotencyKey: `module-case:files:${caseId}:${role}:v1`,
      actorRole: role,
      preparedOfferId: caseId,
      dealId,
      propertyCaseId,
      commandType: "visibility_review",
      action: "request_visibility_review",
      title: "Review active case package visibility",
      notes: "Files case action staged from the active CRAYS case context. Uploads and releases remain blocked.",
      status: "drafted",
      sectionKey: "active-case",
      visibilityScope: "internal_review",
    }),
  },
  erp: {
    label: "Stage finance review",
    route: "/api/crays/core-command/erp-finance",
    confirmation: "stage-erp-finance-command",
    allowedRoles: ["finance", "deal-manager", "reviewer", "admin", "crays-management", "franchise-partner"],
    body: ({ role, caseId, dealId, propertyCaseId }) => ({
      idempotencyKey: `module-case:erp:${caseId}:${role}:v1`,
      actorRole: role,
      preparedOfferId: caseId,
      dealId,
      propertyCaseId,
      commandType: "finance_summary",
      action: "request_finance_review",
      title: "Review active case finance summary",
      notes: "ERP case action staged from the active CRAYS case context. Finance writes and exports remain blocked.",
      status: "drafted",
    }),
  },
  analytics: {
    label: "Stage score review",
    route: "/api/crays/core-command/sync-preview",
    confirmation: "stage-sync-preview-command",
    allowedRoles: ["admin", "crays-management", "finance", "deal-manager", "reviewer"],
    body: ({ role, caseId }) => ({
      idempotencyKey: `module-case:analytics:${caseId}:${role}:v1`,
      actorRole: role,
      commandType: "mapping_preview",
      action: "refresh_preview",
      title: "Review active case analytics snapshot",
      notes: "Analytics case action staged as a CRAYS Core preview command. Source writes and apply remain blocked.",
      status: "drafted",
      sourceModule: "analytics",
      targetModule: "case-workspace",
      entityTypeKey: "prepared-offer",
      syncMappingId: caseId,
    }),
  },
  loans: {
    label: "Stage bank checklist",
    route: "/api/crays/core-command/loans-checklist",
    confirmation: "stage-loans-checklist-command",
    allowedRoles: ["finance", "deal-manager", "reviewer", "admin", "crays-management"],
    body: ({ role, caseId, dealId, propertyCaseId }) => ({
      idempotencyKey: `module-case:loans:${caseId}:${role}:v1`,
      actorRole: role,
      preparedOfferId: caseId,
      dealId,
      propertyCaseId,
      commandType: "bank_package_checklist",
      action: "request_bank_review",
      title: "Review active case bank package checklist",
      notes: "Loans case action staged from the active CRAYS case context. Bank send, payment and release remain blocked.",
      status: "drafted",
      checklistItemKey: "active-case-readiness",
    }),
  },
};

async function stageModuleCaseAction(spec: ActionSpec, input: { role: string; caseId: string; dealId: string | null; propertyCaseId: string | null }) {
  const response = await fetch(spec.route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-crays-dev-confirm": spec.confirmation,
    },
    body: JSON.stringify(spec.body(input)),
  });
  return (await response.json()) as { status?: DraftState["status"]; error?: string; result?: { commandId?: string; applyGate?: string; targetApplyStatus?: string } };
}

export function ModuleCaseActionPanel({ moduleKey }: { moduleKey: ModuleKey }) {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "deal-manager";
  const caseId = searchParams.get("case") ?? searchParams.get("preparedOfferId");
  const dealId = searchParams.get("deal") ?? searchParams.get("dealId");
  const propertyCaseId = searchParams.get("propertyCase") ?? searchParams.get("propertyCaseId");
  const [draftState, setDraftState] = useState<DraftState>({
    status: "idle",
    commandId: null,
    applyGate: null,
    message: "No module case action has been staged for review yet.",
  });

  if (!caseId) return null;

  const spec = actionSpecs[moduleKey];
  const roleAllowed = spec.allowedRoles.includes(role);

  async function onStage() {
    if (!roleAllowed || !caseId) return;
    setDraftState({ status: "staging", commandId: null, applyGate: null, message: "Checking the guarded command workflow." });
    try {
      const result = await stageModuleCaseAction(spec, { role, caseId, dealId, propertyCaseId });
      setDraftState({
        status: result.status ?? "invalid",
        commandId: result.result?.commandId ?? null,
        applyGate: result.result?.applyGate ?? null,
        message: result.error ?? `${result.status ?? "invalid"}; target apply remains ${result.result?.targetApplyStatus ?? "blocked"}.`,
      });
    } catch (error) {
      setDraftState({
        status: "network_error",
        commandId: null,
        applyGate: null,
        message: error instanceof Error ? error.message : "Network error while staging command draft.",
      });
    }
  }

  return (
    <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Case action</p>
          <h2 className="mt-2 text-lg font-semibold">{spec.label}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Creates a guarded CRAYS Core command draft for the active case only.</p>
        </div>
        <button
          type="button"
          onClick={onStage}
          disabled={!roleAllowed || draftState.status === "staging"}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--ink-muted)]"
        >
          {draftState.status === "staging" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : roleAllowed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
          {roleAllowed ? "Stage draft" : "Role locked"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Status</p>
          <strong className="mt-2 block text-sm">{draftState.status.replaceAll("_", " ")}</strong>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Review record</p>
          <strong className="mt-2 block text-sm">{draftState.commandId ? "Stored command draft" : "Not staged"}</strong>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Workflow state</p>
          <strong className="mt-2 block text-sm">{draftState.applyGate ? "Apply closed" : "Closed"}</strong>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">{roleAllowed ? draftState.message : "This role can read the active case, but cannot stage this module command."}</p>
    </article>
  );
}
