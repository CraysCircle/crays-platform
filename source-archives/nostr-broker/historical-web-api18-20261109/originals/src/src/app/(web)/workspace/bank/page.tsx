import { redirect } from "next/navigation";

import { StakeholderPortalPage } from "@/components/stakeholder-portal-page";
import { getStakeholderPortalReadModel } from "@/db/stakeholder-portal-read-model-repository";
import { resolveContextualWorkspaceAccess } from "@/lib/contextual-workspace-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Bank Partner Workspace | CRAYS",
  description: "Authenticated relationship-scoped CRAYS Bank Partner workspace.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BankWorkspacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await resolveContextualWorkspaceAccess("funding-partner", ["bank-partner", "admin", "reviewer", "crays-management"]);
  if (!access.allowed) redirect(access.redirectHref ?? "/account/status?relationship=funding-partner");
  const params = await searchParams;
  const readModel = await getStakeholderPortalReadModel("bank-partner", "bank-partner");
  return <StakeholderPortalPage readModel={readModel} tab={getParam(params.tab)} />;
}
