import {
  getCraysMediaById,
  type CraysMediaRegistryEntry,
} from "../public/clubs-public-media-registry";

export const FAMILIES_MEDIA_KEYS = [
  "hero",
  "proof",
  "mealProvider",
  "mealTimes",
  "mealPortions",
  "mealAllergens",
  "mealNeeds",
  "mealCosts",
  "day",
  "dayQuietFocus",
  "dayFamilyMovement",
  "dayLearningCircle",
  "processOnline",
  "processCampus",
  "processSession",
  "processOpportunity",
  "activityExplore",
  "community",
  "activityCreate",
  "familyHome",
  "finale",
] as const;

export type FamiliesMediaKey = (typeof FAMILIES_MEDIA_KEYS)[number];

export type FamiliesMedia = Readonly<{
  key: FamiliesMediaKey;
  src: string;
  width: number;
  height: number;
  sourceAssetId: string;
  fileSha256: string;
  rights: "owner-approved-current";
  semanticRole: string;
  desktopCrop: string;
  mobileCrop: string;
  altRole: string;
}>;

function requireOwnerMedia(assetId: string): CraysMediaRegistryEntry {
  const asset = getCraysMediaById(assetId);

  if (
    !asset ||
    asset.status !== "approved-local" ||
    asset.rights !== "owner-approved-current" ||
    !asset.fileSha256
  ) {
    throw new Error(`Families media ${assetId} is not owner-approved.`);
  }

  return asset;
}

function routeMedia(
  key: FamiliesMediaKey,
  assetId: string,
  options: Pick<
    FamiliesMedia,
    "width" | "height" | "semanticRole" | "desktopCrop" | "mobileCrop" | "altRole"
  >,
): FamiliesMedia {
  const asset = requireOwnerMedia(assetId);

  return Object.freeze({
    key,
    src: asset.path,
    sourceAssetId: asset.assetId,
    fileSha256: asset.fileSha256 as string,
    rights: "owner-approved-current",
    ...options,
  });
}

function routeGeneratedMedia(
  key: FamiliesMediaKey,
  fileName: string,
  fileSha256: string,
  options: Pick<
    FamiliesMedia,
    "semanticRole" | "desktopCrop" | "mobileCrop" | "altRole"
  >,
): FamiliesMedia {
  return Object.freeze({
    key,
    src: `/__crays-clubs/phase9-owner/families-option2/${fileName}`,
    width: 1280,
    height: 960,
    sourceAssetId: `crays:imagegen:families-option2:${key}`,
    fileSha256,
    rights: "owner-approved-current",
    ...options,
  });
}

export const familiesMedia = Object.freeze({
  hero: routeMedia("hero", "crays:051c559904dc", {
    width: 1920,
    height: 1280,
    semanticRole: "families.hero.shared-time",
    desktopCrop: "58% center",
    mobileCrop: "62% center",
    altRole: "A family walking together beside the sea",
  }),
  proof: routeMedia("proof", "crays:1728e59364cc", {
    width: 1920,
    height: 1280,
    semanticRole: "families.proof.family-question",
    desktopCrop: "56% center",
    mobileCrop: "56% center",
    altRole: "A parent and child together by the sea",
  }),
  mealProvider: routeGeneratedMedia(
    "mealProvider",
    "provider-remote-working-mother.webp",
    "e5b62da203422c110c5c04cd6f44e4aa413f06179e428c52b3bc622750a3798e",
    {
      semanticRole: "families.questions.provider",
      desktopCrop: "55% center",
      mobileCrop: "58% center",
      altRole: "A parent working at a laptop at home",
    },
  ),
  mealTimes: routeGeneratedMedia(
    "mealTimes",
    "times-minimalist-wall-clock.webp",
    "1e141c47e7706c19c89c0feea161b017834e37281f00e2adf4a607fb9da120d4",
    {
      semanticRole: "families.questions.times",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "A simple clock in a warm interior",
    },
  ),
  mealPortions: routeGeneratedMedia(
    "mealPortions",
    "portions-family-meal-overhead.webp",
    "b44acfd75ddbd37019506b2dbbd37d0c713f655b86e8c9637aee3db4fe81b267",
    {
      semanticRole: "families.questions.portions",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "A family sharing a meal around a table",
    },
  ),
  mealAllergens: routeGeneratedMedia(
    "mealAllergens",
    "allergens-child-tissue-parent.webp",
    "f91221bef3bdd30e50b484b4bfd64f5a4276c7a08f0397aa85b5a0d6bc358fd5",
    {
      semanticRole: "families.questions.allergens",
      desktopCrop: "52% center",
      mobileCrop: "54% center",
      altRole: "A parent listening to a child at home",
    },
  ),
  mealNeeds: routeGeneratedMedia(
    "mealNeeds",
    "needs-parent-professional-conversation.webp",
    "010503d7f84f3961fba2841d5bcbbc2b08ba4d65789206ac2b7489e4fb4a5d7c",
    {
      semanticRole: "families.questions.needs",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "Two adults discussing a family question",
    },
  ),
  mealCosts: routeGeneratedMedia(
    "mealCosts",
    "costs-family-budget.webp",
    "7ff7e3bd9c6d0731f2373a02de436fd5591d83983f0665445ff5c04c2b00d498",
    {
      semanticRole: "families.questions.costs",
      desktopCrop: "46% center",
      mobileCrop: "50% center",
      altRole: "A parent planning with a calculator and notebook",
    },
  ),
  day: Object.freeze({
    key: "day",
    src: "/__crays-clubs/phase9-owner/families-v1/families-day-rhythm-v1.webp",
    width: 1800,
    height: 564,
    sourceAssetId: "crays:imagegen:families-day-rhythm-v1",
    fileSha256: "9ecfc55af3152ac92364e587b61e47fe24b663f7a2139e1f234ecc6e2bde7870",
    rights: "owner-approved-current",
    semanticRole: "families.day.coastal-rhythm",
    desktopCrop: "50% center",
    mobileCrop: "64% center",
    altRole: "A warm, quiet shoreline beneath a coastal mountain ridge",
  }),
  dayQuietFocus: routeGeneratedMedia(
    "dayQuietFocus",
    "quiet-focus.webp",
    "ea7a1585d895f020058db632db8a36d3768af26ece1496859ce76e8e7b6793df",
    {
      semanticRole: "families.day.quiet-focus",
      desktopCrop: "48% center",
      mobileCrop: "48% center",
      altRole: "A child drawing at a bright desk",
    },
  ),
  dayFamilyMovement: routeGeneratedMedia(
    "dayFamilyMovement",
    "family-movement.webp",
    "28308a9a2f6bd267c4acaddbb38ef0198cb4e3a225394b563b2a1a7ee6e6f736",
    {
      semanticRole: "families.day.family-movement",
      desktopCrop: "50% 18%",
      mobileCrop: "52% center",
      altRole: "A family moving together along the beach",
    },
  ),
  dayLearningCircle: routeGeneratedMedia(
    "dayLearningCircle",
    "learning-circle.webp",
    "b89860d60dae48b8de950a4ca93997169a3e8a4c4108d711719778e1b1b3b5d9",
    {
      semanticRole: "families.day.learning-circle",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "Adults and children sharing books and creative materials",
    },
  ),
  processOnline: routeGeneratedMedia(
    "processOnline",
    "online-practice.webp",
    "2ad38199aa0f3aa7513fd2a075ac681a324f5554635b27c93b5fedff96a0c2e3",
    {
      semanticRole: "families.process.online-practice",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "An adult working through an online practice at home",
    },
  ),
  processCampus: routeGeneratedMedia(
    "processCampus",
    "campus-invitation.webp",
    "6d47355f22eab64ff40132dbd34b3684617f456b8a166ebe5f52609d9f5fd339",
    {
      semanticRole: "families.process.campus-invitation",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "Two adults talking in a welcoming shared space",
    },
  ),
  processSession: routeGeneratedMedia(
    "processSession",
    "supervised-session.webp",
    "53b1b7a17a5d1ad46b27de98270c043eb32aa2cff62e14dd38557767a152f089",
    {
      semanticRole: "families.process.supervised-session",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "Two adults working together on a practical creative task",
    },
  ),
  processOpportunity: routeGeneratedMedia(
    "processOpportunity",
    "opportunity-handshake.webp",
    "3dc46acc5ff7e007c86c42fe2b36a318fb33103b3b1d16d4f14e0f89eaf8aa55",
    {
      semanticRole: "families.process.opportunity",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "Two adults greeting each other after a conversation",
    },
  ),
  activityExplore: routeMedia("activityExplore", "crays:a4d23fdd2ee4", {
    width: 1280,
    height: 720,
    semanticRole: "families.explore.forest-city-context",
    desktopCrop: "52% 48%",
    mobileCrop: "46% 50%",
    altRole: "Aerial view of Forest City towers and coastline",
  }),
  community: routeMedia("community", "crays:76be7602d046", {
    width: 1673,
    height: 1280,
    semanticRole: "families.community.shared-table",
    desktopCrop: "50% center",
    mobileCrop: "50% center",
    altRole: "People gathering around a shared table",
  }),
  activityCreate: routeGeneratedMedia(
    "activityCreate",
    "create-together.webp",
    "9bbc4f18df91b8827d0049266c37e70063e8f370d1aaac1a409c7d40b976d713",
    {
      semanticRole: "families.activity.create-together",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "Adults and children creating something together",
    },
  ),
  familyHome: routeGeneratedMedia(
    "familyHome",
    "family-at-home.webp",
    "ff99289aeeea7e1676b7171dd0ab156d9c36fb469ee6421be5d6ff392335d00c",
    {
      semanticRole: "families.community.family-at-home",
      desktopCrop: "50% center",
      mobileCrop: "50% center",
      altRole: "A family sharing a quiet moment together at home",
    },
  ),
  finale: routeMedia("finale", "crays:d0f71b76baf7", {
    width: 1140,
    height: 760,
    semanticRole: "families.finale.forest-city",
    desktopCrop: "50% center",
    mobileCrop: "50% center",
    altRole: "Forest City at sunset",
  }),
}) satisfies Readonly<Record<FamiliesMediaKey, FamiliesMedia>>;

export function getFamiliesMedia(key: FamiliesMediaKey): FamiliesMedia {
  return familiesMedia[key];
}
