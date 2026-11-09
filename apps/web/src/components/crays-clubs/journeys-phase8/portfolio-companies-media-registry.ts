/**
 * Route-owned media for the CRAYS company-network page.
 *
 * Every asset lives inside the owner-approved CRAYS media boundary. The route
 * follows the approved wireframe's exact route-owned asset sequence and crops.
 */
export const portfolioCompaniesMedia = {
  hero: {
    src: "/__crays-clubs/portfolio-companies/forest-city-campus-restored-v2.png",
    altRole: "Forest City waterfront and campus viewed from across the bay.",
    objectPosition: "50% 48%",
  },
  focusedContext: {
    src: "/__crays-clubs/portfolio-companies/forest-city-campus-restored-v2.png",
    altRole: "Forest City waterfront and campus viewed from across the bay.",
    objectPosition: "50% 48%",
  },
  mobileHero: {
    src: "/__crays-clubs/portfolio-companies/forest-city-tropical-walkway-mobile-v3.png",
    altRole: "Palm-lined walkway leading towards the Forest City waterfront.",
    objectPosition: "50% 50%",
  },
  workingWeek: {
    src: "/__crays-clubs/portfolio-companies/forest-city-tropical-walkway-restored.png",
    altRole: "Palm-lined walkway leading towards the Forest City waterfront.",
    objectPosition: "50% 54%",
  },
  hostedContext: {
    src: "/__crays-clubs/phase9-owner/forest-city-v16/community-events-forest-city-sunset.webp",
    altRole: "Forest City waterfront at sunset.",
    objectPosition: "50% 52%",
  },
  teamRhythm: {
    src: "/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-coast.webp",
    altRole: "Forest City working campus and coastline viewed from above.",
    objectPosition: "50% 52%",
  },
  workshop: {
    src: "/__crays-clubs/phase9-owner/homepage-final-v1/community-workshops.jpg",
    altRole: "A small team working together around a workshop wall.",
    objectPosition: "50% 48%",
  },
  focusedSprint: {
    src: "/__crays-clubs/phase9-owner/homepage-final-v1/host-one-week-sprints.jpg",
    altRole: "Two people reviewing work together at a shared table.",
    objectPosition: "50% 50%",
  },
  hostedGathering: {
    src: "/__crays-clubs/phase9-owner/homepage-final-v1/work-community.jpg",
    altRole: "A community gathering around a shared table.",
    objectPosition: "50% 46%",
  },
  ongoingRhythm: {
    src: "/__crays-clubs/phase9-owner/homepage-final-v1/community-coworking.jpg",
    altRole: "A hosted working session in a shared room.",
    objectPosition: "50% 52%",
  },
  provisionPanorama: {
    src: "/__crays-clubs/portfolio-companies/forest-city-campus-restored-v2.png",
    altRole: "Forest City waterfront and campus viewed from across the bay.",
    objectPosition: "50% 48%",
  },
} as const;

export type PortfolioMediaKey = keyof typeof portfolioCompaniesMedia;
