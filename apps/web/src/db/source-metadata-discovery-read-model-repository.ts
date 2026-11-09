import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { getResourceDescriptor } from "@/lib/resources";
import { sourceDiscoveryContracts, type SourceDiscoveryContract, type SourceDiscoverySystemKey } from "@/lib/phase3/source-discovery-contract";
import type { RoleKey } from "@/lib/roles";

type ConnectionRow = {
  module_key: string;
  system_key: string;
  status: string;
  connection_mode: string;
  secret_reference_status: string;
  connection_health: string;
  updated_at: Date | null;
};

type SourceFamilyRow = {
  external_system: string;
  external_entity_type: string;
  module_key: string | null;
  records: string;
  conflicts: string;
  latest_at: Date | null;
};

export type SourceDiscoverySystemReadModel = {
  systemKey: SourceDiscoverySystemKey;
  label: string;
  moduleKey: SourceDiscoveryContract["moduleKey"];
  sourceSystem: SourceDiscoveryContract["sourceSystem"];
  status: "adapter_configuration_required" | "discovery_required" | "metadata_verified";
  adapterBoundary: "crays-bff-only";
  browserNativeApiAccess: false;
  browserSecretAccess: false;
  nativeWritesEnabled: false;
  liveSourceProbePerformed: false;
  sourceApiCalled: false;
  requiredEnvironment: Array<{
    name: string;
    label: string;
    present: boolean;
    secret: boolean;
    requiredFor: string;
  }>;
  resources: Array<{
    key: string;
    label: string;
    schemaStatus: string;
    paginationMode: string;
    fieldCount: number;
    fieldsRequiringDiscovery: number;
    exposesNativeIdsToClient: boolean;
  }>;
  metadataRequirements: Array<{
    key: string;
    label: string;
    verified: false;
    reason: string;
  }>;
  observedCoreProjection: {
    sourceFamilies: number;
    mappedRecords: number;
    conflicts: number;
    latestObservedAt: string | null;
  };
  connectionEvidence: Array<{
    moduleKey: string;
    systemKey: string;
    status: string;
    connectionMode: string;
    secretReferenceStatus: string;
    connectionHealth: string;
    updatedAt: string | null;
  }>;
  readOnlyProbePlan: string[];
  documentationBasis: string[];
};

export type SourceMetadataDiscoveryReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "global_source_discovery" | "module_source_discovery" | "forbidden";
    reason: string;
    modules: string[] | null;
  };
  summary: {
    systems: number;
    discoveryRequired: number;
    adapterConfigurationRequired: number;
    metadataVerified: number;
    registeredResources: number;
    resourcesRequiringDiscovery: number;
    envNamesTracked: number;
    envNamesPresent: number;
    mappedCoreProjectionRecords: number;
    sourceFamilies: number;
    conflicts: number;
  };
  systems: SourceDiscoverySystemReadModel[];
  boundaries: {
    sourceApiCalled: false;
    liveSourceProbePerformed: false;
    browserNativeApiAccess: false;
    browserSecretAccess: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    targetApplyEnabled: false;
    externalSendingEnabled: false;
    financePostingEnabled: false;
    paymentInitiationEnabled: false;
    bankSendEnabled: false;
    productionReleaseEnabled: false;
  };
  runtime: ReturnType<typeof getCoreDatabaseRuntimeState>;
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
  note: string;
};

const globalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const moduleRoles: Partial<Record<RoleKey, string[]>> = {
  "deal-manager": ["crm", "project"],
  "expansion-manager": ["crm", "project"],
  finance: ["erp"],
};

function accessFor(role: RoleKey): SourceMetadataDiscoveryReadModel["access"] {
  if (globalRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "global_source_discovery",
      reason: "Role can inspect source metadata discovery status for all server-side adapters.",
      modules: null,
    };
  }

  const modules = moduleRoles[role];
  if (modules) {
    return {
      role,
      allowed: true,
      level: "module_source_discovery",
      reason: "Role can inspect source metadata discovery status for the modules it operates.",
      modules,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Source metadata discovery is an internal adapter-control surface.",
    modules: [],
  };
}

function boundaries(): SourceMetadataDiscoveryReadModel["boundaries"] {
  return {
    sourceApiCalled: false,
    liveSourceProbePerformed: false,
    browserNativeApiAccess: false,
    browserSecretAccess: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    targetApplyEnabled: false,
    externalSendingEnabled: false,
    financePostingEnabled: false,
    paymentInitiationEnabled: false,
    bankSendEnabled: false,
    productionReleaseEnabled: false,
  };
}

function empty(role: RoleKey, access: SourceMetadataDiscoveryReadModel["access"], queryStatus: SourceMetadataDiscoveryReadModel["queryStatus"]): SourceMetadataDiscoveryReadModel {
  return {
    access,
    summary: {
      systems: 0,
      discoveryRequired: 0,
      adapterConfigurationRequired: 0,
      metadataVerified: 0,
      registeredResources: 0,
      resourcesRequiringDiscovery: 0,
      envNamesTracked: 0,
      envNamesPresent: 0,
      mappedCoreProjectionRecords: 0,
      sourceFamilies: 0,
      conflicts: 0,
    },
    systems: [],
    boundaries: boundaries(),
    runtime: getCoreDatabaseRuntimeState(),
    queryStatus,
    note: "Source metadata discovery is server-side only. It returns env-name presence and canonical CRAYS adapter state, never secrets or native source payloads.",
  };
}

function systemFamilyMatch(systemKey: SourceDiscoverySystemKey, row: SourceFamilyRow) {
  const external = row.external_system.toLowerCase();
  const moduleKey = row.module_key?.toLowerCase() ?? "";
  if (systemKey === "twenty") return moduleKey === "crm" || external.includes("crm") || external.includes("twenty");
  if (systemKey === "plane") return moduleKey === "project" || external.includes("project") || external.includes("plane") || external.includes("opening");
  return moduleKey === "erp" || external.includes("erp") || external.includes("frappe");
}

function systemConnectionMatch(systemKey: SourceDiscoverySystemKey, row: ConnectionRow) {
  const system = row.system_key.toLowerCase();
  const moduleKey = row.module_key.toLowerCase();
  if (systemKey === "twenty") return moduleKey === "crm" || system.includes("twenty") || system.includes("crm");
  if (systemKey === "plane") return moduleKey === "project" || system.includes("plane") || system.includes("project");
  return moduleKey === "erp" || system.includes("frappe") || system.includes("erp");
}

async function readConnections(): Promise<ConnectionRow[]> {
  try {
    return (
      await getCorePgPool().query<ConnectionRow>(
        "select module_key,system_key,status,connection_mode,secret_reference_status,connection_health,updated_at from crays_core.integration_connections order by module_key,system_key",
      )
    ).rows;
  } catch {
    return [];
  }
}

async function readSourceFamilies(): Promise<SourceFamilyRow[]> {
  try {
    return (
      await getCorePgPool().query<SourceFamilyRow>(
        `
          select
            external_system,
            external_entity_type,
            coalesce(metadata->>'moduleKey', metadata->'fields'->>'moduleKey') as module_key,
            count(*)::text as records,
            count(*) filter(where sync_status='conflict')::text as conflicts,
            max(last_synced_at) as latest_at
          from crays_core.external_record_maps
          group by 1,2,3
          order by 1,2
        `,
      )
    ).rows;
  } catch {
    return [];
  }
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

function latestIso(rows: SourceFamilyRow[]) {
  const latest = Math.max(...rows.map((row) => (row.latest_at ? row.latest_at.getTime() : 0)), 0);
  return latest ? new Date(latest).toISOString() : null;
}

function buildSystem(contract: SourceDiscoveryContract, sourceRows: SourceFamilyRow[], connectionRows: ConnectionRow[]): SourceDiscoverySystemReadModel {
  const requiredEnvironment = contract.requiredEnvironment.map((requirement) => ({
    name: requirement.name,
    label: requirement.label,
    present: Boolean(process.env[requirement.name]?.trim()),
    secret: requirement.secret,
    requiredFor: requirement.requiredFor,
  }));
  const blockingEnv = requiredEnvironment.filter((item) => item.requiredFor !== "optional-timeout");
  const environmentReady = blockingEnv.every((item) => item.present);
  const resources = contract.resources.map((resourceKey) => {
    const descriptor = getResourceDescriptor(resourceKey);
    const fields = descriptor?.fields ?? [];
    return {
      key: resourceKey,
      label: descriptor?.label ?? resourceKey,
      schemaStatus: descriptor?.schemaStatus ?? "missing",
      paginationMode: descriptor?.pagination.mode ?? "unknown",
      fieldCount: fields.length,
      fieldsRequiringDiscovery: fields.filter((field) => field.source.requiresDiscovery).length,
      exposesNativeIdsToClient: Boolean(descriptor?.provenance.exposesNativeIdsToClient),
    };
  });
  const scopedSourceRows = sourceRows.filter((row) => systemFamilyMatch(contract.systemKey, row));
  const scopedConnectionRows = connectionRows.filter((row) => systemConnectionMatch(contract.systemKey, row));
  const metadataRequirements = contract.metadataRequirements.map((requirement) => ({
    key: requirement.key,
    label: requirement.label,
    verified: false as const,
    reason: requirement.reason,
  }));
  const mappedRecords = scopedSourceRows.reduce((sum, row) => sum + asNumber(row.records), 0);
  const conflicts = scopedSourceRows.reduce((sum, row) => sum + asNumber(row.conflicts), 0);
  const status: SourceDiscoverySystemReadModel["status"] = environmentReady ? "discovery_required" : "adapter_configuration_required";

  return {
    systemKey: contract.systemKey,
    label: contract.label,
    moduleKey: contract.moduleKey,
    sourceSystem: contract.sourceSystem,
    status,
    adapterBoundary: contract.adapterBoundary,
    browserNativeApiAccess: false,
    browserSecretAccess: false,
    nativeWritesEnabled: false,
    liveSourceProbePerformed: false,
    sourceApiCalled: false,
    requiredEnvironment,
    resources,
    metadataRequirements,
    observedCoreProjection: {
      sourceFamilies: scopedSourceRows.length,
      mappedRecords,
      conflicts,
      latestObservedAt: latestIso(scopedSourceRows),
    },
    connectionEvidence: scopedConnectionRows.map((row) => ({
      moduleKey: row.module_key,
      systemKey: row.system_key,
      status: row.status,
      connectionMode: row.connection_mode,
      secretReferenceStatus: row.secret_reference_status,
      connectionHealth: row.connection_health,
      updatedAt: row.updated_at?.toISOString() ?? null,
    })),
    readOnlyProbePlan: contract.readOnlyProbePlan,
    documentationBasis: contract.documentationBasis,
  };
}

export async function getSourceMetadataDiscoveryReadModel(role: RoleKey): Promise<SourceMetadataDiscoveryReadModel> {
  const access = accessFor(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const [connections, sourceFamilies] = runtime.configured ? await Promise.all([readConnections(), readSourceFamilies()]) : [[], []];
  const allSystems = sourceDiscoveryContracts.map((contract) => buildSystem(contract, sourceFamilies, connections));
  const systems = access.modules ? allSystems.filter((system) => access.modules?.includes(system.moduleKey)) : allSystems;
  const summary = {
    systems: systems.length,
    discoveryRequired: systems.filter((system) => system.status === "discovery_required").length,
    adapterConfigurationRequired: systems.filter((system) => system.status === "adapter_configuration_required").length,
    metadataVerified: systems.filter((system) => system.status === "metadata_verified").length,
    registeredResources: systems.reduce((sum, system) => sum + system.resources.length, 0),
    resourcesRequiringDiscovery: systems.reduce((sum, system) => sum + system.resources.filter((resource) => resource.schemaStatus === "requires-discovery").length, 0),
    envNamesTracked: systems.reduce((sum, system) => sum + system.requiredEnvironment.length, 0),
    envNamesPresent: systems.reduce((sum, system) => sum + system.requiredEnvironment.filter((item) => item.present).length, 0),
    mappedCoreProjectionRecords: systems.reduce((sum, system) => sum + system.observedCoreProjection.mappedRecords, 0),
    sourceFamilies: systems.reduce((sum, system) => sum + system.observedCoreProjection.sourceFamilies, 0),
    conflicts: systems.reduce((sum, system) => sum + system.observedCoreProjection.conflicts, 0),
  };

  return {
    access,
    summary,
    systems,
    boundaries: boundaries(),
    runtime,
    queryStatus: runtime.configured ? "schema_ready" : "not_configured",
    note:
      "Blocks 92/96/98: Twenty, Plane and Frappe stay discovery-required until source metadata is read and persisted server-side. This read model uses CRAYS Core projections and env-name presence only; it does not call source APIs.",
  };
}
