import { getStakeholderPortalReadModel } from "@/db/stakeholder-portal-read-model-repository";
import { StakeholderPortalPage } from "@/components/stakeholder-portal-page";

export const metadata = {
  title: "Franchise Partner Portal | CRAYS",
  description: "Relationship-scoped CRAYS Franchise Partner workspace.",
};

export default async function FranchisePartnerPortalPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const readModel = await getStakeholderPortalReadModel("franchise-partner", "franchise-partner");
  return <StakeholderPortalPage readModel={readModel} tab={tab} />;
}
