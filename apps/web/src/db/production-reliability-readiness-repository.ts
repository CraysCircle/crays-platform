import { getCrmOperationalReadModel } from "@/db/crm-operational-read-model-repository";
import { getCoreDatabaseRuntimeState } from "@/db/client";
import { getOpeningProjectReadModel } from "@/db/opening-project-read-model-repository";
import { productionReliabilityThresholds, productionRequiredEnvironmentNames, thresholdStatus } from "@/lib/phase3/production-reliability";
import type { RoleKey } from "@/lib/roles";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

function envPresence() {
  return Object.fromEntries(
    productionRequiredEnvironmentNames.map((name) => [name, Boolean(process.env[name]?.trim())]),
  );
}

function allReady(checks: Record<string, { ready: boolean }>) {
  return Object.values(checks).every((check) => check.ready);
}

export async function getProductionReliabilityReadiness(role: RoleKey) {
  const accessAllowed = allowedRoles.includes(role);
  if (!accessAllowed) {
    return {
      status: "release_blocked" as const,
      access: {
        allowed: false,
        reason: "Production readiness is available only to Admin, Reviewer or CRAYS Management.",
      },
      checks: null,
      observed: null,
      gates: {
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
        externalSendingEnabled: false,
        paymentInitiationEnabled: false,
        financePostingEnabled: false,
        bankSendEnabled: false,
        productionDeployEnabled: false,
      },
    };
  }

  const runtime = getCoreDatabaseRuntimeState();
  const [crm, project] = await Promise.all([
    getCrmOperationalReadModel({ role, family: "opportunities", limit: 1 }),
    getOpeningProjectReadModel(role),
  ]);
  const crmChecks = {
    records: thresholdStatus(crm.summary.records, productionReliabilityThresholds.crm.records),
    companies: thresholdStatus(crm.summary.companies, productionReliabilityThresholds.crm.companies),
    people: thresholdStatus(crm.summary.people, productionReliabilityThresholds.crm.people),
    leads: thresholdStatus(crm.summary.leads, productionReliabilityThresholds.crm.leads),
    opportunities: thresholdStatus(crm.summary.opportunities, productionReliabilityThresholds.crm.opportunities),
    emails: thresholdStatus(crm.summary.emails, productionReliabilityThresholds.crm.emails),
    calendarEvents: thresholdStatus(crm.summary.calendarEvents, productionReliabilityThresholds.crm.calendarEvents),
    tasks: thresholdStatus(crm.summary.tasks, productionReliabilityThresholds.crm.tasks),
    notes: thresholdStatus(crm.summary.notes, productionReliabilityThresholds.crm.notes),
  };
  const projectChecks = {
    rows: thresholdStatus(project.summary.records, productionReliabilityThresholds.project.rows),
    activeProjects: thresholdStatus(project.summary.activeProjects, productionReliabilityThresholds.project.activeProjects),
  };
  const environment = envPresence();
  const environmentReady = productionRequiredEnvironmentNames.every((name) => environment[name]);
  const dataReady = runtime.configured && crm.status === "ready" && project.queryStatus === "schema_ready" && allReady(crmChecks) && allReady(projectChecks);
  const ready = environmentReady && dataReady;

  return {
    status: ready ? "ready" as const : "not_ready" as const,
    access: {
      allowed: true,
      reason: "Role can inspect production data and environment readiness.",
    },
    runtime,
    environment,
    checks: {
      environmentReady,
      dataReady,
      crm: crmChecks,
      project: projectChecks,
    },
    observed: {
      crm: crm.summary,
      project: project.summary,
    },
    gates: {
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      externalSendingEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      bankSendEnabled: false,
      productionDeployEnabled: false,
    },
  };
}
