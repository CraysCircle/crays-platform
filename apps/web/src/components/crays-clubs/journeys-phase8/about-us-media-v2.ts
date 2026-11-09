export type AboutMediaSlot = {
  id: string;
  src: string;
  section: string;
  crop: string;
  altRole: string;
};

const CRAYS_LIBRARY = "/__crays-clubs/assets/crays-seo/";
const FOREST_CITY = "/__crays-clubs/phase9-owner/forest-city-v16/";

/**
 * Block 024 / Wireframe 3.
 * Every asset is local, rights-controlled and unique on this page.
 */
export const ABOUT_US_MEDIA_V2 = {
  heroCinematic: {
    id: "forest-city-community-sunset",
    src: FOREST_CITY + "community-events-forest-city-sunset.webp",
    section: "hero-cinematic",
    crop: "full-height, Forest City waterfront at sunset",
    altRole: "Forest City waterfront and towers at sunset",
  },
  filmCoast: {
    id: "forest-city-beach-boardwalk",
    src: FOREST_CITY + "forest-city-beach-boardwalk.webp",
    section: "hero-film-01",
    crop: "wide, palms and Forest City shoreline",
    altRole: "Palm trees and the shoreline in Forest City",
  },
  filmCommunity: {
    id: "crays-club-work-lounge-community",
    src: CRAYS_LIBRARY + "home-crays-club-work-lounge-with-guests-meeting-working-and-connecting-01.jpg",
    section: "hero-film-02",
    crop: "wide, guests connecting in a warm club lounge",
    altRole: "Guests meeting and connecting in a Crays club lounge",
  },
  filmSkyline: {
    id: "forest-city-beach-skyline",
    src: FOREST_CITY + "forest-city-beach-skyline.webp",
    section: "hero-film-03",
    crop: "wide, Forest City skyline beside the beach",
    altRole: "Forest City skyline beside the beach",
  },
  filmInterior: {
    id: "crays-work-ready-lounge",
    src: CRAYS_LIBRARY + "about-us-work-ready-lounge-and-living-space-in-a-crays-place-09.webp",
    section: "hero-film-04",
    crop: "wide, premium work-ready interior",
    altRole: "A premium work-ready Crays lounge and living space",
  },
  filmOutlook: {
    id: "forest-city-tropical-walkway",
    src: FOREST_CITY + "forest-city-tropical-walkway.webp",
    section: "hero-film-05",
    crop: "wide, tropical walkway opening towards the sea",
    altRole: "A tropical Forest City walkway leading towards the sea",
  },
  ideaWide: {
    id: "forest-city-domus",
    src: FOREST_CITY + "forest-city-domus.webp",
    section: "idea-wide",
    crop: "panoramic, Forest City residences and shoreline",
    altRole: "Forest City residences beside the shoreline",
  },
  beliefLiving: {
    id: "forest-city-marina-pool",
    src: FOREST_CITY + "forest-city-marina-pool.webp",
    section: "belief-living",
    crop: "landscape, Forest City marina hotel and pool",
    altRole: "The marina hotel and pool in Forest City",
  },
  beliefNomads: {
    id: "about-nomads-lifestyle",
    src: CRAYS_LIBRARY + "about-us-digital-nomads-crays-for-digital-nomads-crays-lifestyle-02.jpeg",
    section: "belief-nomads",
    crop: "landscape, friends sharing time together",
    altRole: "Digital nomads sharing time together",
  },
  beliefRemote: {
    id: "about-coliving-lounge",
    src: CRAYS_LIBRARY + "about-us-subscription-living-subscription-living-co-living-01.webp",
    section: "belief-remote",
    crop: "wide, shared lounge and work setting",
    altRole: "A shared lounge designed for living and working",
  },
  visionCity: {
    id: "forest-city-coast",
    src: FOREST_CITY + "hero-forest-city-coast.webp",
    section: "vision-city",
    crop: "wide, Forest City districts along the coast",
    altRole: "Forest City districts extending along the coast",
  },
  visionNomad: {
    id: "forest-city-aerial",
    src: FOREST_CITY + "work-forest-city-aerial.webp",
    section: "vision-nomad",
    crop: "portrait, aerial view of Forest City and the sea",
    altRole: "An aerial view across Forest City towards the sea",
  },
  nomadWork: {
    id: "forest-city-beach-boats",
    src: FOREST_CITY + "forest-city-beach-boats.webp",
    section: "digital-nomads",
    crop: "landscape, boats and palms on Forest City beach",
    altRole: "Boats and palms on the beach in Forest City",
  },
  remoteTeam: {
    id: "about-cowork-team",
    src: CRAYS_LIBRARY + "about-us-remote-working-remote-working-with-crays-cowork-hotel-08.jpeg",
    section: "remote-team",
    crop: "landscape, team in a shared work lounge",
    altRole: "A team meeting in a shared work lounge",
  },
  remoteNetwork: {
    id: "crays-community-yacht",
    src: CRAYS_LIBRARY + "team-crays-community-and-lifestyle-moment-25.jpg",
    section: "remote-network",
    crop: "landscape, friends sharing time together by the sea",
    altRole: "Friends sharing time together by the sea",
  },
  remoteRoutine: {
    id: "about-remote-worker",
    src: CRAYS_LIBRARY + "about-us-remote-working-remote-working-with-crays-remote-worker-01.webp",
    section: "remote-routine",
    crop: "landscape, remote work beside the sea",
    altRole: "A remote worker with a laptop beside the sea",
  },
  flowArrival: {
    id: "forest-city-night",
    src: FOREST_CITY + "forest-city-night.webp",
    section: "flow-arrival",
    crop: "portrait, Forest City waterfront after dark",
    altRole: "Forest City waterfront after dark",
  },
  flowWork: {
    id: "about-hospitality-work",
    src: CRAYS_LIBRARY + "about-us-crays-real-estate-and-hospitality-setting-10.jpg",
    section: "flow-work-live",
    crop: "portrait, hospitality and work setting",
    altRole: "A hospitality setting designed for living and working",
  },
  flowBelong: {
    id: "about-community-celebration",
    src: CRAYS_LIBRARY + "about-us-crays-lifestyle-event-and-community-moment-17.jpg",
    section: "flow-belong",
    crop: "portrait, community celebration",
    altRole: "Friends sharing a community celebration",
  },
  shortBackdrop: {
    id: "forest-city-bay-concept",
    src: FOREST_CITY + "forest-city-bay-concept.webp",
    section: "short-version",
    crop: "wide, Forest City bay and waterfront districts",
    altRole: "Forest City waterfront districts around the bay",
  },
} as const satisfies Record<string, AboutMediaSlot>;

export type AboutMediaKey = keyof typeof ABOUT_US_MEDIA_V2;
