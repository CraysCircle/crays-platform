import type { RoleKey } from "@/lib/roles";

export const dashboardDiagnosticViews = [
  "process-suites",
  "pilot-acceptance",
  "operating-dataset",
  "object-identity",
  "az-simulations",
  "role-scopes",
  "external-preflight",
  "apply-sandbox",
  "monitoring",
  "beta-readiness",
] as const;

export type DashboardDiagnosticView = (typeof dashboardDiagnosticViews)[number];

const dashboardDiagnosticViewSet = new Set<string>(dashboardDiagnosticViews);
const diagnosticRoles = new Set<RoleKey>(["admin", "crays-management", "reviewer"]);

export const dashboardDiagnosticLabels: Record<DashboardDiagnosticView, string> = {
  "process-suites": "Process Suites",
  "pilot-acceptance": "Pilot Acceptance",
  "operating-dataset": "Operating Dataset",
  "object-identity": "Object Identity",
  "az-simulations": "A-Z Simulations",
  "role-scopes": "Role Scopes",
  "external-preflight": "External Preflight",
  "apply-sandbox": "Apply Sandbox",
  monitoring: "Monitoring",
  "beta-readiness": "Beta Readiness",
};

export function isDashboardDiagnosticView(view: string | null | undefined): view is DashboardDiagnosticView {
  return Boolean(view && dashboardDiagnosticViewSet.has(view));
}

export function canSeeDashboardDiagnostics(role: string | null | undefined) {
  return diagnosticRoles.has(role as RoleKey);
}
