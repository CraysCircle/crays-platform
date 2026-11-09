import { getStakeholderPortalReadModel } from "@/db/stakeholder-portal-read-model-repository";
import { StakeholderPortalPage } from "@/components/stakeholder-portal-page";

export const metadata = {
  title: "Bank Partner Portal | CRAYS",
  description: "Relationship-scoped CRAYS Bank Partner workspace.",
};

export default async function BankPartnerPortalPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const readModel = await getStakeholderPortalReadModel("bank-partner", "bank-partner");
  return <StakeholderPortalPage readModel={readModel} tab={tab} />;
}
