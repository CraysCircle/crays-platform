import { getOpeningProjectReadModel } from "./opening-project-read-model-repository";
import type { OpeningProjectRecord } from "./opening-project-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type PortfolioProject = {
  id: string;
  label: string;
  records: number;
  workItems: number;
  milestones: number;
  blockers: number;
  criticalPathItems: number;
  owners: string[];
  nextAction: string;
  status: "ready" | "attention" | "blocked";
};

export type OpeningPortfolioExecutionRoomReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    reason: string;
    canStageWorkItem: boolean;
  };
  status: "ready" | "not_configured" | "forbidden";
  summary: {
    activeProjects: number;
    representedProjects: number;
    records: number;
    workItems: number;
    milestones: number;
    blockers: number;
    criticalPathItems: number;
    overdue: number;
    freshnessMinutes: number | null;
  };
  projects: PortfolioProject[];
  actions: {
    commandRoute: "/api/crays/core-command/project-work-item";
    applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY";
    planeNativeWritesEnabled: false;
    sourceWritesEnabled: false;
    targetApplyEnabled: false;
  };
  note: string;
};

const text = (value: unknown, fallback = "") => (typeof value === "string" && value.trim() ? value.trim() : fallback);

function projectKey(record: OpeningProjectRecord) {
  return (
    text(record.fields.projectId) ||
    text(record.fields.openingProjectId) ||
    text(record.fields.studioId) ||
    text(record.fields.linkedProjectId) ||
    record.linkedObjectId ||
    "opening-portfolio"
  );
}

function projectLabel(id: string, record: OpeningProjectRecord) {
  return text(record.fields.projectLabel) || text(record.fields.studioName) || text(record.fields.siteName) || text(record.fields.company) || id.replaceAll("-", " ");
}

function statusFor(records: OpeningProjectRecord[]): PortfolioProject["status"] {
  if (records.some((record) => record.status === "blocked" || record.priority === "critical")) return "blocked";
  if (records.some((record) => record.priority === "high" || record.status === "attention")) return "attention";
  return "ready";
}

export async function getOpeningPortfolioExecutionRoomReadModel(role: RoleKey): Promise<OpeningPortfolioExecutionRoomReadModel> {
  const project = await getOpeningProjectReadModel(role);
  if (!project.access.allowed) {
    return {
      access: {
        role,
        allowed: false,
        reason: project.access.reason,
        canStageWorkItem: false,
      },
      status: project.queryStatus === "not_configured" ? "not_configured" : "forbidden",
      summary: {
        activeProjects: 0,
        representedProjects: 0,
        records: 0,
        workItems: 0,
        milestones: 0,
        blockers: 0,
        criticalPathItems: 0,
        overdue: 0,
        freshnessMinutes: null,
      },
      projects: [],
      actions: {
        commandRoute: "/api/crays/core-command/project-work-item",
        applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY",
        planeNativeWritesEnabled: false,
        sourceWritesEnabled: false,
        targetApplyEnabled: false,
      },
      note: "Opening portfolio execution is role-scoped and requires the Opening Project CRAYS projection.",
    };
  }

  const byProject = new Map<string, OpeningProjectRecord[]>();
  for (const record of project.records) {
    const key = projectKey(record);
    byProject.set(key, [...(byProject.get(key) ?? []), record]);
  }

  const projects = [...byProject].map(([id, records]) => {
    const workItems = records.filter((record) => record.family === "work-item");
    const blockers = records.filter((record) => record.status === "blocked" || record.priority === "critical");
    const criticalPathItems = records.filter((record) => record.priority === "critical" || String(record.fields.criticalPath ?? "") === "true");
    return {
      id,
      label: projectLabel(id, records[0]),
      records: records.length,
      workItems: workItems.length,
      milestones: records.filter((record) => record.family === "milestone").length,
      blockers: blockers.length,
      criticalPathItems: criticalPathItems.length,
      owners: [...new Set(records.map((record) => record.owner).filter(Boolean))].slice(0, 8),
      nextAction: blockers[0]?.nextAction ?? records[0]?.nextAction ?? "Review portfolio execution state.",
      status: statusFor(records),
    };
  });

  return {
    access: {
      role,
      allowed: true,
      reason: project.access.reason,
      canStageWorkItem: project.access.canStageWorkItem,
    },
    status: project.queryStatus === "schema_ready" ? "ready" : "not_configured",
    summary: {
      activeProjects: project.summary.activeProjects,
      representedProjects: Math.max(project.summary.activeProjects, projects.length),
      records: project.summary.records,
      workItems: project.summary.workItems,
      milestones: project.summary.milestones,
      blockers: project.summary.blockers,
      criticalPathItems: project.summary.criticalPathItems,
      overdue: project.summary.overdue,
      freshnessMinutes: project.summary.freshnessMinutes,
    },
    projects: projects.sort((a, b) => b.blockers - a.blockers || b.criticalPathItems - a.criticalPathItems || b.records - a.records).slice(0, 60),
    actions: {
      commandRoute: "/api/crays/core-command/project-work-item",
      applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY",
      planeNativeWritesEnabled: false,
      sourceWritesEnabled: false,
      targetApplyEnabled: false,
    },
    note:
      "Block 97: Opening Portfolio Execution Room represents many concurrent openings from CRAYS Core. It stages only guarded project review drafts; Plane native writes remain closed.",
  };
}
