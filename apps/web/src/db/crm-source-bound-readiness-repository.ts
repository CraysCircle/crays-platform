import { getCrmOperationalReadModel } from "./crm-operational-read-model-repository";
import { getSourceMetadataDiscoveryReadModel } from "./source-metadata-discovery-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export type CrmSourceBoundReadinessReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    reason: string;
  };
  status: "ready" | "discovery_required" | "not_configured" | "forbidden";
  summary: {
    crmRecords: number;
    companies: number;
    people: number;
    leads: number;
    opportunities: number;
    crmSourceFamilies: number;
    crmMappedProjectionRecords: number;
    crmEnvNamesTracked: number;
    crmEnvNamesPresent: number;
    resourcesRequiringDiscovery: number;
  };
  checks: {
    craysCoreProjectionReady: boolean;
    sourceDiscoveryRegistryPresent: boolean;
    twentyMetadataStillRequired: boolean;
    sourceApiCalledFromBrowser: false;
    nativeTwentyWritesEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
  };
  adapter: {
    systemKey: "twenty";
    sourceSystem: "twenty";
    moduleKey: "crm";
    adapterBoundary: "crays-bff-only";
    schemaStatus: "requires-discovery";
    resources: string[];
    envPresence: Array<{ name: string; present: boolean; secret: boolean }>;
    readOnlyProbePlan: string[];
  } | null;
  note: string;
};

export async function getCrmSourceBoundReadiness(role: RoleKey): Promise<CrmSourceBoundReadinessReadModel> {
  const [crm, discovery] = await Promise.all([
    getCrmOperationalReadModel({ role, family: "opportunities", limit: 1 }),
    getSourceMetadataDiscoveryReadModel(role),
  ]);
  const accessAllowed = crm.access.allowed && discovery.access.allowed;
  const twenty = discovery.systems.find((system) => system.systemKey === "twenty") ?? null;
  const projectionReady = crm.status === "ready" && crm.summary.records > 0;
  const discoveryPresent = Boolean(twenty);
  const status: CrmSourceBoundReadinessReadModel["status"] = !accessAllowed
    ? "forbidden"
    : !projectionReady
      ? "not_configured"
      : twenty?.status === "adapter_configuration_required"
        ? "discovery_required"
        : "ready";

  return {
    access: {
      role,
      allowed: accessAllowed,
      reason: accessAllowed
        ? "Role can inspect the CRM source-bound readiness contract and CRAYS Core projection."
        : crm.access.reason || discovery.access.reason,
    },
    status,
    summary: {
      crmRecords: crm.summary.records,
      companies: crm.summary.companies,
      people: crm.summary.people,
      leads: crm.summary.leads,
      opportunities: crm.summary.opportunities,
      crmSourceFamilies: twenty?.observedCoreProjection.sourceFamilies ?? 0,
      crmMappedProjectionRecords: twenty?.observedCoreProjection.mappedRecords ?? 0,
      crmEnvNamesTracked: twenty?.requiredEnvironment.length ?? 0,
      crmEnvNamesPresent: twenty?.requiredEnvironment.filter((item) => item.present).length ?? 0,
      resourcesRequiringDiscovery: twenty?.resources.filter((resource) => resource.schemaStatus === "requires-discovery").length ?? 0,
    },
    checks: {
      craysCoreProjectionReady: projectionReady,
      sourceDiscoveryRegistryPresent: discoveryPresent,
      twentyMetadataStillRequired: true,
      sourceApiCalledFromBrowser: false,
      nativeTwentyWritesEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
    },
    adapter: twenty
      ? {
          systemKey: "twenty",
          sourceSystem: "twenty",
          moduleKey: "crm",
          adapterBoundary: "crays-bff-only",
          schemaStatus: "requires-discovery",
          resources: twenty.resources.map((resource) => resource.key),
          envPresence: twenty.requiredEnvironment.map((env) => ({ name: env.name, present: env.present, secret: env.secret })),
          readOnlyProbePlan: twenty.readOnlyProbePlan,
        }
      : null,
    note:
      "Block 94: CRM workspace reads are source-bound through CRAYS Core/BFF. Twenty metadata remains discovery-required; the browser never receives Twenty credentials, native IDs or direct API routes.",
  };
}
