import { PublicInvestorWebfront, investorFaq } from "@/components/public-investor-webfront";
import { getPublicDealPackageReadModel } from "@/db/public-deal-package-read-model-repository";
import { buildFaqJsonLd, buildOrganizationJsonLd, buildPublicWebfrontMetadata, PUBLIC_WEBFRONT_ASSETS } from "@/lib/public-webfront-contract";

export const metadata = buildPublicWebfrontMetadata({
  path: "/investor",
  title: "Investor Relations | CRAYS Gym",
  description: "Understand how CRAYS connects property, location evidence, franchise preparation, finance and opening delivery before requesting investor access.",
  image: PUBLIC_WEBFRONT_ASSETS.investor.hero,
  index: true,
});

export default async function InvestorPage() {
  const publicDeals = await getPublicDealPackageReadModel("guest");
  const markets = new Set(publicDeals.packages.map((item) => `${item.city}:${item.country}`));
  const latestUpdate = publicDeals.packages.reduce<string | null>((latest, item) => !latest || item.updatedAt > latest ? item.updatedAt : latest, null);

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(investorFaq)) }} /><PublicInvestorWebfront publicProof={{ releasedOpportunities: publicDeals.summary.publicTeasers, representedMarkets: markets.size, latestUpdate }} /></>;
}
