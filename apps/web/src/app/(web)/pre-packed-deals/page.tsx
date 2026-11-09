import { FranchiseWebPlatform } from "@/components/franchise-web-platform";
import { getCandidatePreparedOfferReadModel } from "@/db/candidate-prepared-offer-read-model-repository";
import { getPublicDealPackageReadModel } from "@/db/public-deal-package-read-model-repository";
import type { OfferTier } from "@/lib/franchise-web-platform";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Pre-Packed Deals | CRAYS",
  description: "CRAYS pre-packed deal market.",
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PrePackedDealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [readModel, publicDealPackages] = await Promise.all([
    getCandidatePreparedOfferReadModel("guest"),
    getPublicDealPackageReadModel("guest"),
  ]);

  return (
    <FranchiseWebPlatform
      audience="guest"
      publicDealPackages={publicDealPackages.packages}
      offerId={getParam(params.offer)}
      tier={getParam(params.tier) as "All" | OfferTier | undefined}
      q={getParam(params.q)}
      accessRequested={getParam(params.access) === "requested"}
      releasedOfferCount={publicDealPackages.summary.total}
      readModelConfigured={readModel.configured && publicDealPackages.configured}
      releaseExecutionEnabled={readModel.releaseBoundary.releaseExecutionEnabled}
      unreleasedPreparedOffersReturned={readModel.releaseBoundary.unreleasedPreparedOffersReturned || publicDealPackages.releaseBoundary.unreleasedPreparedOffersReturned}
    />
  );
}
