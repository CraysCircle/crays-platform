import { getOpeningProjectReadModel } from "./opening-project-read-model-repository";
import { getSourceMetadataDiscoveryReadModel } from "./source-metadata-discovery-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export type PlaneNativeDiscoveryReadiness = {
  access: {
    role: RoleKey;
    allowed: boolean;
    reason: string;
  };
  status: "ready_for_read_only_probe" | "discovery_required" | "not_configured" | "forbidden";
  summary: {
    projectRecords: number;
    activeProjects: number;
    workItems: number;
    blockers: number;
    planeResources: number;
    planeEnvNamesTracked: number;
    planeEnvNamesPresent: number;
  };
  checks: {
    openingProjectProjectionReady: boolean;
    planeMetadataRequired: true;
    workItemResourceRegistered: boolean;
    stateResourceRegistered: boolean;
    commentsResourceRegistered: boolean;
    cursorPaginationRequired: true;
    planeNativeWritesEnabled: false;
    sourceWritesEnabled: false;
    targetApplyEnabled: false;
  };
  adapter: {
    systemKey: "plane";
    schemaStatus: "requires-discovery";
    resources: string[];
    readOnlyProbePlan: string[];
    envPresence: Array<{ name: string; present: boolean; secret: boolean }>;
  } | null;
  note: string;
};

export async function getPlaneNativeDiscoveryReadiness(role: RoleKey): Promise<PlaneNativeDiscoveryReadiness> {
  const [project, discovery] = await Promise.all([getOpeningProjectReadModel(role), getSourceMetadataDiscoveryReadModel(role)]);
  const plane = discovery.systems.find((system) => system.systemKey === "plane") ?? null;
  const allowed = project.access.allowed && discovery.access.allowed;
  const projectionReady = project.queryStatus === "schema_ready" && project.summary.records > 0;
  const envReady = plane ? plane.status !== "adapter_configuration_required" : false;
  const status: PlaneNativeDiscoveryReadiness["status"] = !allowed
    ? "forbidden"
    : !projectionReady
      ? "not_configured"
      : envReady
        ? "ready_for_read_only_probe"
        : "discovery_required";
  const resourceKeys = plane?.resources.map((resource) => resource.key) ?? [];

  return {
    access: {
      role,
      allowed,
      reason: allowed ? "Role can inspect Plane discovery readiness and Opening Project CRAYS projections." : project.access.reason || discovery.access.reason,
    },
    status,
    summary: {
      projectRecords: project.summary.records,
      activeProjects: project.summary.activeProjects,
      workItems: project.summary.workItems,
      blockers: project.summary.blockers,
      planeResources: resourceKeys.length,
      planeEnvNamesTracked: plane?.requiredEnvironment.length ?? 0,
      planeEnvNamesPresent: plane?.requiredEnvironment.filter((item) => item.present).length ?? 0,
    },
    checks: {
      openingProjectProjectionReady: projectionReady,
      planeMetadataRequired: true,
      workItemResourceRegistered: resourceKeys.includes("project-work-items"),
      stateResourceRegistered: resourceKeys.includes("project-states"),
      commentsResourceRegistered: resourceKeys.includes("project-comments"),
      cursorPaginationRequired: true,
      planeNativeWritesEnabled: false,
      sourceWritesEnabled: false,
      targetApplyEnabled: false,
    },
    adapter: plane
      ? {
          systemKey: "plane",
          schemaStatus: "requires-discovery",
          resources: resourceKeys,
          readOnlyProbePlan: plane.readOnlyProbePlan,
          envPresence: plane.requiredEnvironment.map((env) => ({ name: env.name, present: env.present, secret: env.secret })),
        }
      : null,
    note:
      "Block 96: Plane work items, states and comments are represented as CRAYS resources, but native Plane writes remain disabled until metadata discovery proves states, properties, comments and cursor pagination.",
  };
}
