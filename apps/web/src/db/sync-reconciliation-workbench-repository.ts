import { getSyncDataHealthReadModel } from "./sync-data-health-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export async function getSyncReconciliationWorkbenchReadModel(role: RoleKey) {
  const sync = await getSyncDataHealthReadModel(role);
  return {
    access: sync.access,
    status: sync.queryStatus === "schema_ready" ? "ready" : sync.queryStatus,
    summary: {
      records: sync.summary.records,
      sourceFamilies: sync.summary.sourceFamilies,
      sourceMaps: sync.summary.sourceMaps,
      syncJobs: sync.summary.syncJobs,
      conflicts: sync.summary.conflicts,
      failedJobs: sync.summary.failedJobs,
      blockedJobs: sync.summary.blockedJobs,
      staleRecords: sync.summary.staleRecords,
      missingIdentity: sync.summary.missingIdentity,
      crossSourceRecords: sync.summary.crossSourceRecords,
      freshnessMinutes: sync.summary.freshnessMinutes,
    },
    controls: sync.controls,
    records: sync.records.slice(0, 120),
    actions: sync.actions,
    boundaries: sync.boundaries,
    reconciliationPolicy: {
      automaticApplyEnabled: false,
      destructiveReconciliationEnabled: false,
      retryExecutionEnabled: false,
      mappingOverrideEnabled: false,
      allowedNextAction: "Stage a CRAYS review draft with evidence; do not mutate source mappings.",
    },
    note:
      "Block 101: Sync reconciliation exposes conflicts, stale projections and job health as review evidence. It does not retry, apply, override or destructively reconcile source data.",
  };
}
