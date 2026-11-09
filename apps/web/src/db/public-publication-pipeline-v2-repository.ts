import { getPublicDealPackageReadModel } from "./public-deal-package-read-model-repository";

export async function getPublicPublicationPipelineV2ReadModel() {
  const [guest, candidate] = await Promise.all([
    getPublicDealPackageReadModel("guest"),
    getPublicDealPackageReadModel("candidate"),
  ]);

  return {
    status: guest.status === "ready" && candidate.status === "ready" ? "ready" : "not_configured",
    summary: {
      guestPackages: guest.summary.total,
      publicTeasers: guest.summary.publicTeasers,
      candidatePackages: candidate.summary.total,
      candidateDetails: candidate.summary.candidateDetails,
      reserved: candidate.summary.reserved,
      dtoVersion: guest.packages[0]?.version ?? candidate.packages[0]?.version ?? "public-deal-package/v1",
    },
    publicationStages: [
      {
        key: "draft",
        label: "Core offer review",
        status: "gated",
        nextAction: "Prepare reviewed PublicDealPackageDTO in CRAYS Core.",
      },
      {
        key: "publish",
        label: "Publish public teaser",
        status: "closed",
        gate: "OPEN_DEV_PUBLIC_DEAL_PUBLISH_APPLY",
        nextAction: "Stage a publish command draft; do not mutate public cache directly.",
      },
      {
        key: "update",
        label: "Update public package",
        status: "closed",
        gate: "OPEN_DEV_PUBLIC_DEAL_UPDATE_APPLY",
        nextAction: "Stage an update command draft with DTO diff and cache tags.",
      },
      {
        key: "unpublish",
        label: "Unpublish public package",
        status: "closed",
        gate: "OPEN_DEV_PUBLIC_DEAL_UNPUBLISH_APPLY",
        nextAction: "Stage an unpublish command draft; public release remains closed.",
      },
    ],
    cachePlan: {
      strategy: guest.cache.strategy,
      tags: [...new Set([...guest.cache.tags, ...candidate.cache.tags])],
      revalidation: guest.cache.revalidation,
      directClientFetchRequired: false,
      serverComponentsPreferred: true,
    },
    boundaries: {
      publicDtoOnly: true,
      preparedFranchiseOffersFallbackUsed: false,
      staticFallbackUsed: guest.releaseBoundary.staticFallbackUsed || candidate.releaseBoundary.staticFallbackUsed,
      internalFieldsReturned: guest.releaseBoundary.internalFieldsReturned || candidate.releaseBoundary.internalFieldsReturned,
      unreleasedPreparedOffersReturned: guest.releaseBoundary.unreleasedPreparedOffersReturned || candidate.releaseBoundary.unreleasedPreparedOffersReturned,
      publicReleaseEnabled: guest.releaseBoundary.publicReleaseEnabled,
      publishCommandEnabled: guest.releaseBoundary.publishCommandEnabled,
      updateCommandEnabled: guest.releaseBoundary.updateCommandEnabled,
      unpublishCommandEnabled: guest.releaseBoundary.unpublishCommandEnabled,
    },
    note:
      "Block 104: Public publication pipeline v2 is PublicDealPackageDTO-only with controlled cache tags. Publish/update/unpublish remain gated command drafts.",
  };
}
