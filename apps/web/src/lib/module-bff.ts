import { createDevelopmentSession, evaluateSessionPermission } from "./auth-boundary";
import { moduleByKey, modules, type ModuleKey } from "./modules";
import type { PermissionKey, PermissionScope } from "./permissions";
import { defaultRole, roleByKey, type RoleKey } from "./roles";
import { adapterGuardrails, type AdapterCapability, type ModuleAdapterContract } from "@/modules/common/adapter";
import { integrationProfileForModule } from "@/modules/common/integration-modes";
import { adapterContractForModule, moduleAdapterContracts } from "@/modules/common/registry";

export type BffReadiness = "contract_ready" | "blocked_until_identity" | "blocked_until_adapter" | "live_ready";

export type BffOperationKind = "query" | "command" | "event" | "file" | "communication";

export type BffOperation = {
  key: string;
  kind: BffOperationKind;
  label: string;
  capability: AdapterCapability;
  requiredPermission: PermissionKey;
  scope: PermissionScope;
  status: "contract" | "blocked" | "ready";
};

export type ModuleBffContract = {
  module: ModuleKey;
  label: string;
  readiness: BffReadiness;
  route: `/api/crays/modules/${string}`;
  liveDataReturned: false;
  sourceEngine: ModuleAdapterContract["sourceEngine"];
  integrationBoundary: string;
  profileRule: string;
  entities: ModuleAdapterContract["entities"];
  operations: BffOperation[];
  guardrails: string[];
};

const capabilityOperationMap: Record<AdapterCapability, Omit<BffOperation, "status">> = {
  read: {
    key: "query",
    kind: "query",
    label: "Query records",
    capability: "read",
    requiredPermission: "data-sync:configure",
    scope: "global",
  },
  write: {
    key: "command",
    kind: "command",
    label: "Submit command",
    capability: "write",
    requiredPermission: "modules:configure",
    scope: "global",
  },
  event: {
    key: "event",
    kind: "event",
    label: "Ingest event",
    capability: "event",
    requiredPermission: "data-sync:configure",
    scope: "global",
  },
  file: {
    key: "file",
    kind: "file",
    label: "Resolve file access",
    capability: "file",
    requiredPermission: "documents:approve",
    scope: "document",
  },
  communication: {
    key: "communication",
    kind: "communication",
    label: "Route communication",
    capability: "communication",
    requiredPermission: "communication:create",
    scope: "organization",
  },
};

export function moduleBffContractForModule(module: ModuleKey, role: RoleKey = defaultRole): ModuleBffContract {
  const moduleDefinition = moduleByKey(module);
  const adapter = adapterContractForModule(module);
  const integrationProfile = integrationProfileForModule(module);

  if (!moduleDefinition || !adapter || !integrationProfile) {
    throw new Error(`Unknown CRAYS module contract: ${module}`);
  }

  const session = createDevelopmentSession(role);
  const operations: BffOperation[] = adapter.capabilities.map((capability) => {
    const base = capabilityOperationMap[capability];
    const decision = evaluateSessionPermission(session, {
      permission: base.requiredPermission,
      scope: base.scope,
      module,
    });
    const status: BffOperation["status"] = decision.allowed ? "contract" : "blocked";

    return {
      ...base,
      key: `${module}:${base.key}`,
      status,
    };
  });

  return {
    module,
    label: moduleDefinition.label,
    readiness: operations.some((operation) => operation.status === "blocked") ? "blocked_until_identity" : "contract_ready",
    route: `/api/crays/modules/${module}`,
    liveDataReturned: false,
    sourceEngine: adapter.sourceEngine,
    integrationBoundary: adapter.integrationBoundary,
    profileRule: integrationProfile.uiRule,
    entities: adapter.entities,
    operations,
    guardrails: [
      "BFF routes expose CRAYS-native contracts only.",
      "Live module reads require CRAYS account mapping, active role, Nostr binding and scope checks.",
      "Live module writes require audit events and idempotency keys.",
      ...adapterGuardrails,
    ],
  };
}

export function allModuleBffContracts(role: RoleKey = defaultRole) {
  return moduleAdapterContracts.map((adapter) => moduleBffContractForModule(adapter.module, role));
}

export function resolveBffRole(roleParam: string | null | undefined) {
  return roleByKey(roleParam ?? defaultRole).key;
}

export function isKnownModuleKey(value: string | null | undefined): value is ModuleKey {
  return modules.some((module) => module.key === value);
}
