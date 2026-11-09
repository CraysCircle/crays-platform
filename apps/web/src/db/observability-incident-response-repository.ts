import { getMonitoringReadModel } from "./monitoring-read-model-repository";
import { getProductionReliabilityReadiness } from "./production-reliability-readiness-repository";
import type { RoleKey } from "@/lib/roles";

export async function getObservabilityIncidentResponseReadModel(role: RoleKey) {
  const [monitoring, production] = await Promise.all([
    getMonitoringReadModel(role),
    getProductionReliabilityReadiness(role).catch(() => null),
  ]);

  return {
    access: monitoring.access,
    status: monitoring.queryStatus === "schema_ready" ? (monitoring.summary.blocked > 0 ? "attention" : "ready") : monitoring.queryStatus,
    summary: {
      monitoringRecords: monitoring.summary.records,
      blocked: monitoring.summary.blocked,
      attention: monitoring.summary.attention,
      stale: monitoring.summary.stale,
      conflicts: monitoring.summary.conflicts,
      failedJobs: monitoring.summary.failedJobs,
      commandGateBlocked: monitoring.summary.commandGateBlocked,
      productionReady: production?.status === "ready",
    },
    incidentRunbooks: [
      { key: "production-data-zero", label: "Production data reads zero", trigger: "CRM/project production readiness fails data thresholds.", firstAction: "Check Vercel env presence and CRAYS_DATABASE_URL deployment binding, then redeploy." },
      { key: "source-conflict", label: "Source mapping conflict", trigger: "Sync health reports conflicts or missing identity.", firstAction: "Stage sync review draft; do not apply mapping overrides." },
      { key: "command-gate", label: "Command gate blocked", trigger: "Command Center records blocked target apply.", firstAction: "Review command receipt, preflight and rollback policy before any release decision." },
      { key: "public-payload", label: "Public payload leak risk", trigger: "Public DTO or field-scope scan fails.", firstAction: "Block publication and inspect DTO allowlist before cache revalidation." },
    ],
    records: monitoring.records.slice(0, 80),
    actions: monitoring.actions,
    operationBoundary: {
      retryExecutionEnabled: monitoring.boundaries.retryExecutionEnabled,
      productionDeployEnabled: monitoring.boundaries.productionDeployEnabled,
      sourceWritesEnabled: monitoring.boundaries.sourceWritesEnabled,
      syncApplyEnabled: monitoring.boundaries.syncApplyEnabled,
      externalSendingEnabled: monitoring.boundaries.externalSendingEnabled,
    },
    boundaries: monitoring.boundaries,
    note:
      "Block 108: Observability and incident response connect monitoring signals with runbooks. It reads health and gates only; retries, deploys and external sends are not opened.",
  };
}
