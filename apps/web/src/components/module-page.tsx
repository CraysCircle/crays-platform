import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { canSeeDashboardDiagnostics, dashboardDiagnosticLabels, isDashboardDiagnosticView } from "@/lib/diagnostic-surfaces";
import type { ModuleDefinition } from "@/lib/modules";
import { roleByKey } from "@/lib/roles";
import { AdapterBidirectionalPolicyPanel } from "./adapter-bidirectional-policy-panel";
import { AnalyticsManagementKpiPanel } from "./analytics-management-kpi-panel";
import { ApplySandboxPanel } from "./apply-sandbox-panel";
import { AzSimulationsPanel } from "./az-simulations-panel";
import { B2cMemberDatabasePanel } from "./b2c-member-database-panel";
import { BankReadinessLoansPage } from "./bank-readiness-loans-page";
import { CaseCommunicationWorkbenchPanel } from "./case-communication-workbench-panel";
import { CaseBoundModuleWorkbenchPanel } from "./case-bound-module-workbench-panel";
import { CaseObjectPage } from "./case-object-page";
import { CaseWorkspaceContextPanel } from "./case-workspace-context-panel";
import { CrmDealCollectionPage } from "./crm-deal-collection-page";
import { CrmOperationalWorkspacePage, type CrmPayload } from "./crm-operational-workspace-page";
import { CrossToolObjectIdentityPanel } from "./cross-tool-object-identity-panel";
import { ControlledBetaCurrentPanel } from "./controlled-beta-current-panel";
import { DeskNativeWorkbenchPage } from "./desk-native-workbench-page";
import { DocumentsLifecyclePanel } from "./documents-lifecycle-panel";
import { EvidencePackagesWorkflowPanel } from "./evidence-packages-workflow-panel";
import { ErpFinanceLedgerPanel } from "./erp-finance-ledger-panel";
import { ExternalPreflightPanel } from "./external-preflight-panel";
import { FinancialForecastPanel } from "./financial-forecast-panel";
import { FinancialWorkbookPanel } from "./financial-workbook-panel";
import { FranchisePartnerDecisionPanel } from "./franchise-partner-decision-panel";
import { FranchisePartnerPerformancePanel } from "./franchise-partner-performance-panel";
import { GoldenOperatingDatasetPanel } from "./golden-operating-dataset-panel";
import { LocationIntelligencePanel } from "./location-intelligence-panel";
import { ManagementGateReviewPanel } from "./management-gate-review-panel";
import { ManagementPortfolioPanel } from "./management-portfolio-panel";
import { MemberPaymentRecoveryPanel } from "./member-payment-recovery-panel";
import { MonitoringPanel } from "./monitoring-panel";
import { OperationalSignalsPanel } from "./operational-signals-panel";
import { PilotAcceptanceCloseoutPanel } from "./pilot-acceptance-closeout-panel";
import { ProcessSuitePanel } from "./process-suite-panel";
import { ProjectWorkItemSlicePage, type ProjectWorkItemsPayload } from "./project-work-item-slice-page";
import { RealProductWorkbench } from "./real-product-workbench";
import { RealEstateDecisionPanel } from "./real-estate-decision-panel";
import { ResilienceRecoveryPanel } from "./resilience-recovery-panel";
import { RoleMetricAccessPanel } from "./role-metric-access-panel";
import { RoleScopeAuditPanel } from "./role-scope-audit-panel";
import { RoleHomeQueuesPanel } from "./role-home-queues-panel";
import { SourceFaithfulWorkbenchPanel } from "./source-faithful-workbench-panel";
import { StakeholderRoomControlPanel } from "./stakeholder-room-control-panel";
import { StudioOperationsRecoveryPanel } from "./studio-operations-recovery-panel";
import { StudioOperationsWorkbenchPanel } from "./studio-operations-workbench-panel";
import { SupportRecoveryWorkflowPanel } from "./support-recovery-workflow-panel";
import { SyncHealthWorkbenchPanel } from "./sync-health-workbench-panel";
import { SyncDataHealthWorkflowPanel } from "./sync-data-health-workflow-panel";
import { ToolNativeWorkbenchPage } from "./tool-native-workbench-page";
import { WorkbenchViewControls, type WorkbenchViewControlsPayload } from "./workbench-view-controls";

const toneClass = {
  green: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  amber: "border-amber-700/20 bg-amber-50 text-amber-950",
  rose: "border-rose-700/20 bg-rose-50 text-rose-950",
  blue: "border-sky-700/20 bg-sky-50 text-sky-950",
  ink: "border-black/10 bg-white text-[var(--foreground)]",
};

function DiagnosticSurfaceBoundary({ role, view }: { role?: string; view: string }) {
  const safeRole = roleByKey(role).key;
  const label = isDashboardDiagnosticView(view) ? dashboardDiagnosticLabels[view] : "Diagnostic surface";
  const actions = [
    { label: "Open work queue", href: `/dashboard?role=${safeRole}&view=work-queue` },
    { label: "Open case workspace", href: `/dashboard?role=${safeRole}&view=case` },
    { label: "Return to overview", href: `/dashboard?role=${safeRole}&view=overview` },
  ];

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <section className="rounded-[16px] border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase">
          <ShieldCheck className="h-4 w-4" />
          Diagnostic surface moved out of normal work
        </p>
        <h2 className="mt-3 text-2xl font-semibold">{label} is available only in Admin, Reviewer or CRAYS Management diagnostics.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6">
          Normal role workspaces now stay object/action-led: queues, cases, rooms, decisions and safe next steps. This prevents audit matrices and readiness walls from becoming the product experience.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="inline-flex items-center justify-between rounded-[10px] border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-950 transition hover:border-amber-500">
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ModulePage({
  module,
  view,
  record,
  role,
  initialViews = null,
  initialCrm = null,
  initialProject = null,
}: {
  module: ModuleDefinition;
  view?: string;
  record?: string;
  role?: string;
  initialViews?: WorkbenchViewControlsPayload | null;
  initialCrm?: CrmPayload | null;
  initialProject?: ProjectWorkItemsPayload | null;
}) {
  if (module.key === "dashboard") {
    const dashboardView = view ?? "overview";

    if (isDashboardDiagnosticView(dashboardView) && !canSeeDashboardDiagnostics(role)) {
      return <DiagnosticSurfaceBoundary role={role} view={dashboardView} />;
    }

    if (dashboardView === "work-queue") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <RoleHomeQueuesPanel />
        </div>
      );
    }

    if (dashboardView === "case") {
      return <CaseObjectPage />;
    }

    if (dashboardView === "signals") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <ManagementPortfolioPanel />
          <OperationalSignalsPanel />
          <ManagementGateReviewPanel />
        </div>
      );
    }

    if (dashboardView === "rooms") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <StakeholderRoomControlPanel />
          <DocumentsLifecyclePanel />
        </div>
      );
    }

    if (dashboardView === "process-suites") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <ProcessSuitePanel />
        </div>
      );
    }

    if (dashboardView === "pilot-acceptance") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <PilotAcceptanceCloseoutPanel />
        </div>
      );
    }

    if (dashboardView === "operating-dataset") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <GoldenOperatingDatasetPanel />
        </div>
      );
    }

    if (dashboardView === "object-identity") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <CrossToolObjectIdentityPanel />
        </div>
      );
    }

    if (dashboardView === "az-simulations") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <AzSimulationsPanel />
        </div>
      );
    }

    if (dashboardView === "role-scopes") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <RoleScopeAuditPanel />
        </div>
      );
    }

    if (dashboardView === "external-preflight") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <ExternalPreflightPanel />
        </div>
      );
    }

    if (dashboardView === "apply-sandbox") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <ApplySandboxPanel />
        </div>
      );
    }

    if (dashboardView === "monitoring") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <MonitoringPanel />
        </div>
      );
    }

    if (dashboardView === "beta-readiness") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <ControlledBetaCurrentPanel />
        </div>
      );
    }

    if (dashboardView === "actions") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <ManagementGateReviewPanel />
        </div>
      );
    }

    if (dashboardView === "messages") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <CaseCommunicationWorkbenchPanel />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
        <RealProductWorkbench />
      </div>
    );
  }

  if (module.key === "project") {
    if (view === "real-estate-decision") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <RealEstateDecisionPanel />
        </div>
      );
    }

    return <ProjectWorkItemSlicePage role={role} view={view} initialPayload={initialProject} />;
  }

  if (module.key === "crm") {
    if (view === "deals" || record === "deals" || view === "candidate-offer") {
      return <CrmDealCollectionPage role={role} />;
    }

    return <CrmOperationalWorkspacePage role={role} view={view} record={record} initialPayload={initialCrm} />;
  }

  if (module.key === "loans") {
    const loansView = view ?? "package-readiness";
    return (
      <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
        <WorkbenchViewControls moduleKey="loans" role={role} initialPayload={initialViews} />
        {loansView === "settings" ? <ToolNativeWorkbenchPage moduleKey="loans" role={role} /> : <BankReadinessLoansPage role={role} />}
      </div>
    );
  }

  if (module.key === "analytics") {
    const analyticsView = view ?? "scorecards";
    const partnerDecisionRoles = new Set(["deal-manager", "finance", "reviewer", "expansion-manager", "franchise-partner", "bank-partner"]);
    const partnerDecisionViews = new Set(["scorecards", "partner-decision"]);
    const showPartnerDecision = partnerDecisionViews.has(analyticsView) && (partnerDecisionRoles.has(role ?? "") || role === "guest");

    if (analyticsView === "portfolio") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <WorkbenchViewControls moduleKey="analytics" role={role} initialPayload={initialViews} />
          <FranchisePartnerPerformancePanel role={role} />
        </div>
      );
    }

    if (analyticsView === "reports" || analyticsView === "financial-model") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <WorkbenchViewControls moduleKey="analytics" role={role} initialPayload={initialViews} />
          <FinancialWorkbookPanel role={role} />
          <FinancialForecastPanel role={role} />
        </div>
      );
    }

    if (analyticsView === "risk" || analyticsView === "alerts") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <WorkbenchViewControls moduleKey="analytics" role={role} initialPayload={initialViews} />
          <LocationIntelligencePanel role={role} />
          <RoleMetricAccessPanel role={role} />
        </div>
      );
    }

    if (analyticsView === "settings") {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <WorkbenchViewControls moduleKey="analytics" role={role} initialPayload={initialViews} />
          <RoleMetricAccessPanel role={role} />
        </div>
      );
    }

    if (showPartnerDecision) {
      return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
          <WorkbenchViewControls moduleKey="analytics" role={role} initialPayload={initialViews} />
          <FranchisePartnerDecisionPanel role={role} />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
        <WorkbenchViewControls moduleKey="analytics" role={role} initialPayload={initialViews} />
        <AnalyticsManagementKpiPanel role={role} />
      </div>
    );
  }

  if (module.key === "files") {
    return (
      <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
        <WorkbenchViewControls moduleKey="files" role={role} initialPayload={initialViews} />
        <CaseWorkspaceContextPanel moduleKey="files" role={role} />
        <EvidencePackagesWorkflowPanel role={role} />
        {view === "document-lifecycle" ? <DocumentsLifecyclePanel /> : null}
        {view === "settings" ? <ToolNativeWorkbenchPage moduleKey="files" role={role} /> : null}
      </div>
    );
  }

  if (module.key === "erp") {
    const erpView = view ?? "finance-summary";
    return (
      <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
        <WorkbenchViewControls moduleKey={module.key} role={role} initialPayload={initialViews} />
        {erpView === "finance-summary" || record === "accounts" ? <ErpFinanceLedgerPanel role={role} /> : null}
        {erpView === "finance-summary" || record === "payment-exceptions" ? <MemberPaymentRecoveryPanel role={role} /> : null}
        {erpView === "invoice-status" || erpView === "budget-review" || erpView === "procurement" || erpView === "staff" || erpView === "facilities" || erpView === "settings" ? <ToolNativeWorkbenchPage moduleKey={module.key} role={role} /> : null}
        {erpView === "case" ? <CaseWorkspaceContextPanel moduleKey={module.key} role={role} /> : null}
        {erpView === "case" ? <CaseBoundModuleWorkbenchPanel moduleKey={module.key} role={role} /> : null}
      </div>
    );
  }

  if (module.key === "operations") {
    const operationsView = view ?? "studio-queue";
    return (
      <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
        <WorkbenchViewControls moduleKey="operations" role={role} initialPayload={initialViews} />
        {operationsView === "studio-queue" || operationsView === "settings" ? <StudioOperationsWorkbenchPanel role={role} /> : null}
        {operationsView === "recovery" ? <StudioOperationsRecoveryPanel role={role} /> : null}
        {operationsView === "members" ? <B2cMemberDatabasePanel role={role} /> : null}
        {operationsView === "case" ? <CaseWorkspaceContextPanel moduleKey="operations" role={role} /> : null}
        {operationsView === "case" ? <CaseBoundModuleWorkbenchPanel moduleKey="operations" role={role} /> : null}
      </div>
    );
  }

  if (module.key === "chat") {
    return (
      <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
        <CaseCommunicationWorkbenchPanel />
      </div>
    );
  }

  if (module.key === "sync") {
    return (
      <div className="mx-auto max-w-[1440px] min-w-0 space-y-6">
        <SyncDataHealthWorkflowPanel />
        {view === "queue" ? <ResilienceRecoveryPanel /> : null}
        {view === "settings" ? <AdapterBidirectionalPolicyPanel /> : null}
        {view === "performance" ? <SyncHealthWorkbenchPanel /> : null}
      </div>
    );
  }

  if (module.key === "support") {
    return <div className="mx-auto max-w-[1440px] min-w-0 space-y-6"><SupportRecoveryWorkflowPanel /></div>;
  }

  if (module.key === "hr" || module.key === "learning" || module.key === "sites") {
    return <DeskNativeWorkbenchPage module={module} />;
  }

  return (
    <div className="mx-auto max-w-[1440px] min-w-0 space-y-7">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="min-w-0 overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 max-[720px]:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[7px] bg-[var(--foreground)] px-3 py-1 text-xs font-semibold uppercase text-white">
              {module.group}
            </span>
            <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
              Role scoped
            </span>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal max-[720px]:text-3xl">{module.label}</h1>
          <p className="mt-4 max-w-3xl break-words text-base leading-7 text-[var(--ink-muted)]">{module.purpose}</p>
          <div className="mt-6 flex max-w-full flex-wrap gap-2 max-[420px]:gap-1.5">
            {module.primaryRecords.map((record) => (
              <span
                key={record}
                className="max-w-full break-words rounded-[7px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium max-[420px]:px-2.5 max-[420px]:text-xs"
              >
                {record}
              </span>
            ))}
          </div>
        </div>

        <aside className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold">Access posture</h2>
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["Identity", "Account and workspace access"],
              ["Permissions", "Role, organization and entity scope"],
              ["Documents", "Vault grants before attachment access"],
              ["Events", "Workflow and audit trail required"],
            ].map(([title, copy]) => (
              <div key={title} className="flex gap-3 rounded-[8px] bg-white p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                <div>
                  <strong className="text-sm">{title}</strong>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {module.metrics.map((metric) => (
          <article key={metric.label} className={`rounded-[8px] border p-4 ${toneClass[metric.tone]}`}>
            <p className="text-xs font-semibold uppercase opacity-70">{metric.label}</p>
            <strong className="mt-3 block text-3xl font-semibold tracking-normal">{metric.value}</strong>
            <span className="mt-2 block text-sm opacity-75">{metric.context}</span>
          </article>
        ))}
      </section>

      <SourceFaithfulWorkbenchPanel moduleKey={module.key} />

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="font-semibold">Operating queue</h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">Role-visible workstreams with owner and next action.</p>
            </div>
            <Activity className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="divide-y divide-[var(--line)]">
            {module.workstreams.map((item) => (
              <div key={item.title} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_140px_160px_28px] md:items-center">
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{item.title}</strong>
                  <span className="mt-1 block text-sm text-[var(--ink-muted)]">{item.next}</span>
                </div>
                <span className="text-sm text-[var(--ink-muted)]">{item.owner}</span>
                <span className="w-fit rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold">{item.state}</span>
                <ArrowRight className="h-4 w-4 text-[var(--ink-muted)]" />
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">Communication</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Internal notes, shared comments and external messages stay separated by scope, participant and channel.
            </p>
          </article>
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Documents</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Files, versions, approvals and message attachments must pass the same document access matrix.
            </p>
          </article>
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-[var(--rose)]" />
              <h2 className="font-semibold">Due next</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Open the highest-priority item, confirm its owner and complete the next available workflow action.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
