import type { RoleKey } from "./roles";

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

export type SeedCleanupContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_seed_cleanup_contract" | "forbidden";
    reason: string;
  };
  cleanup: {
    strategyReady: true;
    seedImportEnabled: false;
    cleanupExecutionEnabled: false;
    deleteAllDevDataEnabled: false;
    requiresSeedBatchId: true;
    zeroRowVerificationRequired: true;
    requiredMetadata: string[];
  };
  boundaries: {
    readOnly: true;
    contractOnly: true;
    databaseWritesEnabled: false;
    cleanupExecutionEnabled: false;
    broadDeleteEnabled: false;
    seedImportEnabled: false;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

export function getSeedCleanupContract(role: RoleKey): SeedCleanupContract {
  const allowed = internalRoles.includes(role);

  return {
    role,
    access: allowed
      ? {
          allowed: true,
          level: "internal_seed_cleanup_contract",
          reason: "Role can read seed cleanup controls. No seed import or cleanup execution is enabled.",
        }
      : {
          allowed: false,
          level: "forbidden",
          reason: "Seed cleanup controls require internal platform or review access.",
        },
    cleanup: {
      strategyReady: true,
      seedImportEnabled: false,
      cleanupExecutionEnabled: false,
      deleteAllDevDataEnabled: false,
      requiresSeedBatchId: true,
      zeroRowVerificationRequired: true,
      requiredMetadata: allowed
        ? ["seed_batch_id", "data_origin", "seed_version", "test_data", "created_for_environment", "source_file", "source_record_id", "cleanup_policy"]
        : [],
    },
    boundaries: {
      readOnly: true,
      contractOnly: true,
      databaseWritesEnabled: false,
      cleanupExecutionEnabled: false,
      broadDeleteEnabled: false,
      seedImportEnabled: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
