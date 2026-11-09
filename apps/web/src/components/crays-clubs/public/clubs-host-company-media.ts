export type HostCompanyMediaAsset = {
  id: string;
  src: string;
  provenance:
    | "CRAYS phase9-owner repository asset"
    | "CRAYS page-scoped generated asset";
  section: "hero" | "formats" | "program" | "facilities" | "proof" | "closing";
  crop: string;
  alt: string;
};

const pageAsset = (
  id: string,
  path: string,
  section: HostCompanyMediaAsset["section"],
  crop: string,
  alt: string,
): HostCompanyMediaAsset => ({
  id,
  src: `/__crays-clubs/host-company/${path}`,
  provenance: "CRAYS page-scoped generated asset",
  section,
  crop,
  alt,
});

const ownerAsset = (
  id: string,
  path: string,
  section: HostCompanyMediaAsset["section"],
  crop: string,
  alt: string,
): HostCompanyMediaAsset => ({
  id,
  src: `/__crays-clubs/phase9-owner/${path}`,
  provenance: "CRAYS phase9-owner repository asset",
  section,
  crop,
  alt,
});

const forestCity = (
  id: string,
  section: HostCompanyMediaAsset["section"],
  crop: string,
  alt: string,
) =>
  ownerAsset(
    `forest-city-${id}`,
    `forest-city-v16/${id}.webp`,
    section,
    crop,
    alt,
  );

const heroStock = (
  number: string,
  section: HostCompanyMediaAsset["section"],
  crop: string,
  alt: string,
) =>
  ownerAsset(
    `crays-owner-${number}`,
    `hero-stock/hero-tile-${number}.jpg`,
    section,
    crop,
    alt,
  );

export const hostCompanyHeroMedia: HostCompanyMediaAsset[] = [
  ownerAsset(
    "crays-resort-repositioning",
    "brand-as-a-service-wireframe/resort-repositioning.jpg",
    "hero",
    "center 52%",
    "A waterfront resort pool and terrace at dusk",
  ),
  forestCity(
    "community-events-forest-city-sunset",
    "hero",
    "center 48%",
    "Forest City skyline at sunset",
  ),
  forestCity(
    "forest-city-domus",
    "hero",
    "center 48%",
    "Forest City buildings and landscaped grounds",
  ),
  heroStock(
    "20",
    "hero",
    "center 45%",
    "A company group exchanging ideas around a shared table",
  ),
  forestCity(
    "hero-forest-city-waterfront",
    "hero",
    "center 48%",
    "Forest City waterfront and marina district",
  ),
  forestCity(
    "forest-city-night",
    "hero",
    "center 52%",
    "Forest City illuminated at night",
  ),
  forestCity(
    "forest-city-marina-pool",
    "hero",
    "center 50%",
    "Forest City marina pool and tropical landscaping",
  ),
  forestCity(
    "hero-forest-city-city-aerial",
    "hero",
    "center 47%",
    "Aerial view across Forest City",
  ),
  forestCity(
    "forest-city-wave-tower",
    "hero",
    "center 43%",
    "Curved Forest City residential tower",
  ),
  forestCity(
    "forest-city-tropical-walkway",
    "hero",
    "center 48%",
    "Palm-lined waterfront walkway in Forest City",
  ),
  forestCity(
    "hero-forest-city-coast",
    "hero",
    "center 50%",
    "Forest City coastline and waterfront development",
  ),
  forestCity(
    "forest-city-beach-boats",
    "hero",
    "center 46%",
    "Boats beside the Forest City shoreline",
  ),
  forestCity(
    "forest-city-bay-concept",
    "hero",
    "center 48%",
    "Forest City waterfront seen from above",
  ),
  forestCity(
    "hero-forest-city-marina",
    "hero",
    "center 45%",
    "Forest City marina and pool landscape",
  ),
];

export const hostCompanyFormatMedia: HostCompanyMediaAsset[] = [
  ownerAsset(
    "crays-company-table-session",
    "homepage-v35/community-invitation.webp",
    "formats",
    "center 48%",
    "A company group working together around a shared table",
  ),
  pageAsset(
    "crays-company-boardroom-session",
    "host-company-boardroom.png",
    "formats",
    "center 46%",
    "A company team holding a facilitated workshop around a long boardroom table",
  ),
  ownerAsset(
    "crays-night-resort-format",
    "owner-golf-hotel.png",
    "formats",
    "center 50%",
    "A resort building and pool illuminated at night",
  ),
  ownerAsset(
    "crays-waterfront-resort-format",
    "owner-marina-hotel.png",
    "formats",
    "center 48%",
    "A bright waterfront resort with tropical landscaping",
  ),
];

export const hostCompanyProgramMedia: HostCompanyMediaAsset[] = [
  forestCity(
    "forest-city-beach-boardwalk",
    "program",
    "center 50%",
    "Palm-lined Forest City beach boardwalk",
  ),
  ownerAsset(
    "crays-tropical-program-pool",
    "brand-as-a-service-wireframe/tropical-resort-pool.png",
    "program",
    "center 48%",
    "A tropical resort pool framed by palms and the sea",
  ),
  ownerAsset(
    "crays-tropical-program-table",
    "brand-as-a-service-wireframe/wireframe-seaside-restaurant.webp",
    "program",
    "center 48%",
    "An open-air seaside table in a tropical setting",
  ),
  heroStock(
    "06",
    "program",
    "center 48%",
    "Palm trees silhouetted by warm sunset light",
  ),
];

export const hostCompanyFacilityMedia: HostCompanyMediaAsset[] = [
  ownerAsset(
    "crays-facility-work-room",
    "homepage-final-v1/work-coworking.jpg",
    "facilities",
    "center 48%",
    "A quiet shared work room with daylight and flexible tables",
  ),
  ownerAsset(
    "crays-facility-workshop",
    "homepage-final-v1/community-workshops.jpg",
    "facilities",
    "center 46%",
    "A team workshop arranged around shared tables and a planning wall",
  ),
  ownerAsset(
    "crays-facility-accommodation",
    "homepage-final-v1/community-apartment.jpg",
    "facilities",
    "center 50%",
    "A bright furnished apartment used as accommodation context",
  ),
  ownerAsset(
    "crays-facility-shared-meals",
    "homepage-final-v1/work-community.jpg",
    "facilities",
    "center 48%",
    "A group sharing a meal around a long table",
  ),
  ownerAsset(
    "crays-facility-gym",
    "homepage-final-v1/community-gym.jpg",
    "facilities",
    "center 48%",
    "A well-equipped shared gym and movement space",
  ),
  ownerAsset(
    "crays-facility-guest-expertise",
    "homepage-final-v1/community-guest-speakers.jpg",
    "facilities",
    "center 46%",
    "A guest speaker presenting to an invited audience",
  ),
  ownerAsset(
    "crays-facility-community-moments",
    "homepage-final-v1/host-one-day-events.jpg",
    "facilities",
    "center 48%",
    "An invited community gathering during a hosted event",
  ),
  ownerAsset(
    "crays-facility-content-studio",
    "homepage-final-v1/community-content-studio.jpg",
    "facilities",
    "center 48%",
    "A production slate representing planned content capture",
  ),
  heroStock(
    "27",
    "facilities",
    "center 48%",
    "A live event production with stage lighting and an audience",
  ),
  ownerAsset(
    "crays-facility-connectivity",
    "homepage-final-v1/community-wifi.jpg",
    "facilities",
    "center 48%",
    "Connected laptops in a shared digital work setting",
  ),
  ownerAsset(
    "crays-facility-close-out",
    "homepage-final-v1/host-one-week-sprints.jpg",
    "facilities",
    "center 48%",
    "A focused work station used to document and close out a company sprint",
  ),
];

export const hostCompanyProofMedia = ownerAsset(
  "crays-dusk-villa-proof",
  "brand-as-a-service-wireframe/resort-pool.jpg",
  "proof",
  "center 52%",
  "A waterfront resort pool and villa at dusk",
);

export const hostCompanyClosingMedia = pageAsset(
  "crays-warm-resort-closing",
  "host-company-sunset-resort.png",
  "closing",
  "center 50%",
  "A warm waterfront resort and infinity pool framed by tropical planting",
);

export const hostCompanyRenderedMedia = [
  ...hostCompanyHeroMedia,
  ...hostCompanyFormatMedia,
  ...hostCompanyProgramMedia,
  ...hostCompanyFacilityMedia,
  hostCompanyProofMedia,
  hostCompanyClosingMedia,
];
