import { redirect } from "next/navigation";

import { InvestorWorkspacePage as InvestorWorkspace } from "@/components/investor-workspace-page";
import { getAnalyticsManagementKpiReadModel } from "@/db/analytics-management-kpi-read-model-repository";
import { resolveContextualWorkspaceAccess } from "@/lib/contextual-workspace-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Investor Workspace | CRAYS",
  description: "Authenticated relationship-scoped CRAYS Investor workspace.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function InvestorWorkspacePage() {
  const access = await resolveContextualWorkspaceAccess("investor", ["investor", "admin", "reviewer", "crays-management"]);
  if (!access.allowed) redirect(access.redirectHref ?? "/account/status?relationship=investor");
  const readModel = await getAnalyticsManagementKpiReadModel("investor");
  return <InvestorWorkspace readModel={readModel} />;
}
