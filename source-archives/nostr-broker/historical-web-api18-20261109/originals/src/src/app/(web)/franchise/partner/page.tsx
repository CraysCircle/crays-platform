import { redirect } from "next/navigation";

import { getStakeholderPortalReadModel } from "@/db/stakeholder-portal-read-model-repository";
import { StakeholderPortalPage } from "@/components/stakeholder-portal-page";
import { resolveContextualWorkspaceAccess } from "@/lib/contextual-workspace-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Franchise Partner Portal | CRAYS",
  description: "Relationship-scoped CRAYS Franchise Partner workspace.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function FranchisePartnerPortalPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const access = await resolveContextualWorkspaceAccess("franchise-partner", ["franchise-partner", "admin", "reviewer", "crays-management"]);
  if (!access.allowed) redirect(access.redirectHref ?? "/account/status?relationship=franchise-partner");
  const { tab } = await searchParams;
  const readModel = await getStakeholderPortalReadModel("franchise-partner", "franchise-partner");
  return <StakeholderPortalPage readModel={readModel} tab={tab} />;
}
