export type LifestyleMediaAsset = {
  id: string;
  src: string;
  section: "hero" | "rhythm" | "secondHero" | "architecture" | "founder" | "world" | "ecosystem" | "social";
  crop: string;
  alt: string;
};

const own = (
  id: string,
  path: string,
  section: LifestyleMediaAsset["section"],
  crop: string,
  alt: string,
): LifestyleMediaAsset => ({
  id,
  src: `/__crays-clubs/${path}`,
  section,
  crop,
  alt,
});

export const lifestyleMediaGroups = {
  hero: [
    own("hero-social-stage", "assets/crays-seo/home-crays-club-work-lounge-with-guests-meeting-working-and-connecting-01.jpg", "hero", "center 52%", "Crays members meeting, working and connecting in a warm club lounge"),
    own("hero-forest-city-coast", "phase9-owner/forest-city-v16/hero-forest-city-coast.webp", "hero", "center 48%", "Forest City coastline and waterfront"),
    own("hero-working-cafe", "assets/crays-seo/about-us-team-crays-team-working-in-a-cafe-06.jpg", "hero", "center 45%", "Crays team members working together in a cafe"),
    own("hero-training", "phase9-owner/gym-section-v2/training-plans.png", "hero", "center 38%", "A focused gym training session"),
    own("hero-evening-community", "assets/crays-seo/home-guests-arriving-at-an-evening-lifestyle-event-11.webp", "hero", "center 42%", "Guests sharing an evening lifestyle moment"),
    own("hero-forest-city-night", "phase9-owner/forest-city-v16/forest-city-night.webp", "hero", "center 45%", "Forest City after dark"),
  ],
  rhythm: [
    own("rhythm-boardwalk", "phase9-owner/forest-city-v16/forest-city-beach-boardwalk.webp", "rhythm", "center 52%", "Morning on the Forest City beach boardwalk"),
    own("rhythm-marina", "phase9-owner/forest-city-v16/forest-city-marina-pool.webp", "rhythm", "center 44%", "Forest City marina and pool"),
    own("rhythm-sunset", "assets/crays-seo/lifestyle-crays-lifestyle-event-and-community-moment-11.jpg", "rhythm", "center 48%", "A sunset hospitality moment by the water"),
    own("rhythm-nightlife", "assets/crays-seo/lifestyle-crays-lifestyle-event-and-community-moment-01.jpg", "rhythm", "center 42%", "A red-lit evening lifestyle moment"),
  ],
  secondHero: [
    own("second-journey", "assets/crays-seo/lifestyle-crays-lifestyle-event-and-community-moment-28.jpg", "secondHero", "center 45%", "Friends beginning a shared road journey"),
    own("second-hospitality", "assets/crays-seo/lifestyle-crays-real-estate-and-hospitality-setting-03.jpg", "secondHero", "center 48%", "A Crays hospitality setting"),
  ],
  architecture: [
    own("architecture-domus", "phase9-owner/forest-city-v16/forest-city-domus.webp", "architecture", "center 48%", "Forest City residential architecture"),
    own("architecture-marina", "phase9-owner/forest-city-v16/hero-forest-city-marina.webp", "architecture", "center 46%", "Forest City marina and waterfront architecture"),
    own("architecture-lounge", "assets/crays-seo/lifestyle-crays-real-estate-and-hospitality-setting-09.jpg", "architecture", "center 48%", "A refined shared hospitality lounge"),
    own("architecture-table", "assets/crays-seo/lifestyle-crays-real-estate-and-hospitality-setting-12.jpg", "architecture", "center 48%", "A shared table in a Crays hospitality setting"),
  ],
  founder: [
    own("founder-market", "assets/crays-seo/lifestyle-crays-lifestyle-event-and-community-moment-26.jpg", "founder", "center 44%", "Founders exploring a local market together"),
    own("founder-circle", "assets/crays-seo/lifestyle-crays-lifestyle-event-and-community-moment-30.jpg", "founder", "center 44%", "A Crays founder and community moment"),
    own("founder-work", "assets/crays-seo/team-crays-work-travel-and-founder-lifestyle-moment-30.jpg", "founder", "center 46%", "Crays founders working while travelling"),
  ],
  world: [
    own("world-bay", "phase9-owner/forest-city-v16/forest-city-bay-concept.webp", "world", "center 48%", "Forest City bay and connected waterfront"),
    own("world-skyline", "phase9-owner/forest-city-v16/forest-city-beach-skyline.webp", "world", "center 46%", "Forest City beach and skyline"),
  ],
  ecosystem: [
    own("ecosystem-tropical-walk", "phase9-owner/forest-city-v16/forest-city-tropical-walkway.webp", "ecosystem", "center 50%", "A tropical Forest City walkway"),
    own("ecosystem-lounge", "assets/crays-seo/about-us-work-ready-lounge-and-living-space-in-a-crays-place-09.webp", "ecosystem", "center 46%", "A work-ready Crays lounge and living space"),
  ],
  social: [
    own("social-local-market", "assets/crays-seo/lifestyle-crays-lifestyle-event-and-community-moment-14.jpg", "social", "center 44%", "A shared local market moment"),
    own("social-community", "assets/crays-seo/lifestyle-crays-lifestyle-event-and-community-moment-32.jpg", "social", "center 44%", "A real-world Crays community moment"),
  ],
} as const;

export const lifestyleAllMedia: LifestyleMediaAsset[] = Object.values(lifestyleMediaGroups).flat();
