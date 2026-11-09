export type HospitalityMediaAsset = Readonly<{
  id: string;
  src: string;
  alt: string;
  crop: string;
  role:
    | "hero"
    | "engine"
    | "culture"
    | "journey"
    | "operator"
    | "digital"
    | "promise";
}>;

const own = (
  id: string,
  path: string,
  alt: string,
  crop: string,
  role: HospitalityMediaAsset["role"],
): HospitalityMediaAsset => ({
  id,
  src: `/__crays-clubs/${path}`,
  alt,
  crop,
  role,
});

export const hospitalityMediaV1 = {
  heroSunset: own(
    "hero-forest-city-sunset",
    "phase9-owner/forest-city-v16/community-events-forest-city-sunset.webp",
    "Forest City waterfront at sunset",
    "center 59%",
    "hero",
  ),
  heroSuite: own(
    "hero-golf-suite",
    "forest-city/golf-suite.jpg",
    "A bright suite at the Forest City Golf Hotel",
    "center 64%",
    "hero",
  ),
  heroPool: own(
    "hero-cabrera-villa-pool",
    "assets/crays-villas/cabrera.jpg",
    "A Crays villa pool beside the coast",
    "center 82%",
    "hero",
  ),
  engineTower: own(
    "engine-forest-city-tower",
    "phase9-owner/forest-city-v16/intro-forest-city-portrait.webp",
    "A planted residential tower in Forest City",
    "center 74%",
    "engine",
  ),
  cultureInterior: own(
    "culture-marina-presidential",
    "forest-city/marina-presidential.jpg",
    "The lounge and dining room of a Forest City Marina Hotel suite",
    "center 50%",
    "culture",
  ),
  cultureHostedDinner: own(
    "culture-hosted-dinner-v2",
    "assets/crays-villas/hosted-chapter/living-editorial-hosted-dinner-v2.png",
    "A CRAYS host welcomes four guests to a warm garden dinner",
    "center 52%",
    "culture",
  ),
  cultureTravel: own(
    "culture-travel-lifestyle",
    "assets/crays-villas/hosted-chapter/living-editorial-travel-v1.webp",
    "Friends relax together beside a CRAYS destination pool",
    "center 52%",
    "culture",
  ),
  journeyArrive: own(
    "journey-arrive-valet-v2",
    "assets/crays-villas/hosted-chapter/journey-arrive-valet-v2.png",
    "A CRAYS host welcomes a guest beside a car on arrival",
    "center 49%",
    "journey",
  ),
  journeyMeet: own(
    "journey-meet-table",
    "assets/crays-villas/hosted-chapter/journey-meet-table-v1.webp",
    "Members meet around a welcoming hospitality table",
    "51% 48%",
    "journey",
  ),
  journeyUse: own(
    "journey-use-lounge",
    "assets/crays-villas/hosted-chapter/journey-use-lounge-v1.webp",
    "A member uses a calm CRAYS lounge during the day",
    "center 50%",
    "journey",
  ),
  journeyPay: own(
    "journey-pay-service",
    "assets/crays-villas/hosted-chapter/journey-pay-service-v1.webp",
    "A discreet hospitality service moment at a CRAYS venue",
    "center center",
    "journey",
  ),
  journeyReturn: own(
    "journey-return-belonging",
    "assets/crays-villas/hosted-chapter/journey-return-belonging-v1.webp",
    "Returning members reconnect during an evening gathering",
    "center 45%",
    "journey",
  ),
  operatorConversation: own(
    "operator-conversation-v2",
    "assets/crays-villas/hosted-chapter/behind-welcome-operator-men-v2.png",
    "Two CRAYS hospitality partners review a guest experience together",
    "center 48%",
    "operator",
  ),
  digitalIntelligence: own(
    "digital-intelligence-room",
    "assets/crays-villas/hosted-chapter/behind-welcome-digital-intelligence-v1.webp",
    "A calm hospitality room supported by discreet digital service",
    "42% center",
    "digital",
  ),
  promiseVilla: own(
    "promise-arrival-ledger-resort",
    "assets/crays-villas/hospitality-arrival-ledger-promise-v2.webp",
    "A symmetrical CRAYS resort with pools, palapas and a central lawn",
    "center 60%",
    "promise",
  ),
  promiseAfterglow: own(
    "promise-afterglow-gathering-v2",
    "assets/crays-villas/hosted-chapter/promise-afterglow-v2.png",
    "Five friends share a candlelit evening beside a CRAYS infinity pool",
    "center 56%",
    "promise",
  ),
} as const;

export const hospitalityMediaAll = Object.values(hospitalityMediaV1);
