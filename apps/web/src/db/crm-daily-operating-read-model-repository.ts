import { getCrmOperationalReadModel, type CrmOperationalFamily, type CrmOperationalRow } from "./crm-operational-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type LaneKey = "inbox" | "calendar" | "tasks" | "pipeline";

export type CrmDailyOperatingLane = {
  key: LaneKey;
  label: string;
  family: CrmOperationalFamily;
  total: number;
  visibleRows: number;
  status: "ready" | "empty" | "blocked";
  nextAction: string;
  href: string;
  rows: CrmOperationalRow[];
};

export type CrmDailyOperatingReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    reason: string;
    canStageCrmActivity: boolean;
  };
  status: "ready" | "not_configured" | "release_blocked" | "forbidden";
  summary: {
    crmRecords: number;
    emails: number;
    calendarEvents: number;
    tasks: number;
    opportunities: number;
    visibleDailyRows: number;
    blockers: number;
    freshnessMinutes: number | null;
  };
  lanes: CrmDailyOperatingLane[];
  actions: {
    commandRoute: "/api/crays/core-command/crm-activity";
    applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY";
    externalSendingEnabled: false;
    calendarWritesEnabled: false;
    sourceWritesEnabled: false;
    targetApplyEnabled: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
  note: string;
};

const laneSpec: Array<{ key: LaneKey; label: string; family: CrmOperationalFamily; hrefView: string; nextAction: string }> = [
  { key: "inbox", label: "Inbox that needs action", family: "emails", hrefView: "inbox&record=emails", nextAction: "Open the CRM inbox lane and stage reply/follow-up drafts only." },
  { key: "calendar", label: "Today and upcoming meetings", family: "calendar-events", hrefView: "calendar&record=calendar-events", nextAction: "Review meetings and site visits; calendar writes stay closed." },
  { key: "tasks", label: "Due workflow tasks", family: "tasks", hrefView: "tasks&record=tasks", nextAction: "Resolve due tasks or stage a CRAYS follow-up draft." },
  { key: "pipeline", label: "Pipeline risks", family: "opportunities", hrefView: "pipeline&record=opportunities", nextAction: "Review opportunity blockers and next safe actions." },
];

export async function getCrmDailyOperatingReadModel(role: RoleKey): Promise<CrmDailyOperatingReadModel> {
  const models = await Promise.all(laneSpec.map((lane) => getCrmOperationalReadModel({ role, family: lane.family, limit: 12 })));
  const primary = models[0];
  const allowed = models.some((model) => model.access.allowed);
  const status: CrmDailyOperatingReadModel["status"] = !allowed
    ? primary.status
    : models.some((model) => model.status === "ready")
      ? "ready"
      : primary.status;
  const lanes: CrmDailyOperatingLane[] = laneSpec.map((lane, index) => {
    const model = models[index];
    const rows = model.rows;
    const total = model.pageInfo.total;
    return {
      key: lane.key,
      label: lane.label,
      family: lane.family,
      total,
      visibleRows: rows.length,
      status: !model.access.allowed ? "blocked" : rows.length ? "ready" : "empty",
      nextAction: lane.nextAction,
      href: `/crm?role=${role}&view=${lane.hrefView}`,
      rows,
    };
  });
  const newestFreshness = Math.min(...models.map((model) => model.summary.freshnessMinutes ?? Number.POSITIVE_INFINITY));

  return {
    access: {
      role,
      allowed,
      reason: allowed ? "Role can inspect the daily CRM operating lanes." : primary.access.reason,
      canStageCrmActivity: models.some((model) => model.access.canStageCrmActivity),
    },
    status,
    summary: {
      crmRecords: primary.summary.records,
      emails: primary.summary.emails,
      calendarEvents: primary.summary.calendarEvents,
      tasks: primary.summary.tasks,
      opportunities: primary.summary.opportunities,
      visibleDailyRows: lanes.reduce((sum, lane) => sum + lane.visibleRows, 0),
      blockers: Math.max(...models.map((model) => model.summary.blockers)),
      freshnessMinutes: Number.isFinite(newestFreshness) ? newestFreshness : null,
    },
    lanes,
    actions: {
      commandRoute: "/api/crays/core-command/crm-activity",
      applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY",
      externalSendingEnabled: false,
      calendarWritesEnabled: false,
      sourceWritesEnabled: false,
      targetApplyEnabled: false,
    },
    queryStatus: status === "ready" ? "schema_ready" : status === "not_configured" ? "not_configured" : "forbidden",
    note:
      "Block 95: Daily operating workspace separates inbox, calendar, tasks and pipeline into real CRM lanes. Each lane uses CRAYS Core/BFF rows and only stages guarded drafts.",
  };
}
