import { getCoreCommandHistoryReadModel } from "./core-command-history-read-model-repository";
import type { RoleKey } from "@/lib/roles";

function countBy<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, rows }));
}

export async function getCommandCenterV2ReadModel(role: RoleKey) {
  const history = await getCoreCommandHistoryReadModel({ role, limit: 50 });
  return {
    access: history.access,
    status: history.queryStatus === "schema_ready" ? "ready" : history.queryStatus,
    summary: {
      commands: history.summary.total,
      returned: history.summary.returned,
      modules: history.summary.modules,
      latestCommandId: history.summary.latestCommandId,
      latestCreatedAt: history.summary.latestCreatedAt,
      blockedTargetApply: history.records.filter((record) => record.targetApplyStatus === "blocked").length,
      openApplyGates: 0,
    },
    queues: {
      byModule: countBy(history.records, (record) => record.moduleKey),
      byCommandStatus: countBy(history.records, (record) => record.commandStatus),
      byValidationStatus: countBy(history.records, (record) => record.validationStatus),
      byApplyGate: countBy(history.records, (record) => record.applyGate),
    },
    records: history.records,
    boundaries: {
      sourceWritesEnabled: history.sourceWritesEnabled,
      syncWritesEnabled: history.syncWritesEnabled,
      toolApplyEnabled: history.toolApplyEnabled,
      uploadsEnabled: history.uploadsEnabled,
      externalSendingEnabled: history.externalSendingEnabled,
      financeActionsEnabled: history.financeActionsEnabled,
      bankActionsEnabled: history.bankActionsEnabled,
      releaseActionsEnabled: history.releaseActionsEnabled,
      secretsReturned: history.secretsReturned,
      privateKeysReturned: history.privateKeysReturned,
    },
    note:
      "Block 100: Command Center v2 unifies guarded CRAYS command drafts. It reports gate state and audit summaries only; all target apply and external side-effect gates remain closed.",
  };
}
