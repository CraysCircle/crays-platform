import { landlordFaq, PublicLandlordWebfront } from "@/components/public-landlord-webfront";
import { getPublicDealPackageReadModel } from "@/db/public-deal-package-read-model-repository";
import { buildFaqJsonLd, buildOrganizationJsonLd, buildPublicWebfrontMetadata, PUBLIC_WEBFRONT_ASSETS } from "@/lib/public-webfront-contract";

export const metadata = buildPublicWebfrontMetadata({ path: "/real-estate", title: "Real Estate Partners | CRAYS Gym", description: "Understand the CRAYS property-fit review, location evidence, required property information and route to a private owner decision.", image: PUBLIC_WEBFRONT_ASSETS.landlord.hero, index: true });

export default async function RealEstatePage() {
  const publicDeals = await getPublicDealPackageReadModel("guest");
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(buildOrganizationJsonLd())}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(buildFaqJsonLd(landlordFaq))}}/><PublicLandlordWebfront releasedPackages={publicDeals.packages}/></>;
}
