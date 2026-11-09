import { getStakeholderPortalReadModel } from "@/db/stakeholder-portal-read-model-repository";
import { StakeholderPortalPage } from "@/components/stakeholder-portal-page";

export const metadata = {
  title: "Landlord Portal | CRAYS",
  description: "Relationship-scoped CRAYS Landlord and property-owner workspace.",
};

export default async function LandlordPortalPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const readModel = await getStakeholderPortalReadModel("landlord", "landlord");
  return <StakeholderPortalPage readModel={readModel} tab={tab} />;
}
