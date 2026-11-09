import type { Metadata } from "next";

export const CRAYS_PRO_PUBLIC_ORIGIN = "https://www.crays.pro" as const;

export const CRAYS_PRO_PUBLIC_PATHS = [
  "/", "/concepts", "/concepts/coffee", "/concepts/retail", "/concepts/gym",
  "/concepts/clubs", "/real-estate", "/franchise-partners", "/deals",
  "/funding-partners", "/investors", "/vendors", "/portal", "/faq",
  "/contact", "/imprint", "/privacy", "/accessibility",
] as const;

export type CraysProPublicPath = (typeof CRAYS_PRO_PUBLIC_PATHS)[number];

type PublicMetadataRecord = { title: string; description: string };

export const CRAYS_PRO_PUBLIC_METADATA = {
  "/": { title: "CRAYS Franchise | One Property. Four Possibilities.", description: "Explore CRAYS Coffee, Retail, Gym and Clubs, introduce your property for multi-format review or begin your location-backed Franchise journey." },
  "/concepts": { title: "Compare Coffee, Retail, Gym & Clubs | CRAYS Franchise", description: "Compare the confirmed property fit, minimum area and own-capital entry context for CRAYS Coffee, Retail, Gym and Clubs." },
  "/concepts/coffee": { title: "CRAYS Coffee Franchise Concept | CRAYS Franchise", description: "Review the compact CRAYS Coffee opportunity, compare its property-fit context and choose your property or Franchise route." },
  "/concepts/retail": { title: "CRAYS Retail Franchise Concept | CRAYS Franchise", description: "Review the confirmed CRAYS Retail opportunity boundary, property-fit context and the format decisions that remain in development." },
  "/concepts/gym": { title: "CRAYS Gym Franchise Concept | CRAYS Franchise", description: "Review CRAYS Gym as a specialist Franchise Venture, compare its property-fit context and choose your property or Franchise route." },
  "/concepts/clubs": { title: "CRAYS Clubs Franchise Concept | CRAYS Franchise", description: "Review the hospitality-scale CRAYS Clubs opportunity, compare its property-fit context and choose your property or Franchise route." },
  "/real-estate": { title: "Real Estate Owners & Brokers | CRAYS Franchise", description: "Introduce one property for structured review across relevant CRAYS Coffee, Retail, Gym and Clubs formats, with private evidence kept scoped." },
  "/franchise-partners": { title: "Franchise Partners & Candidates | CRAYS Franchise", description: "Compare CRAYS Ventures, understand the Prepared Deal evidence released to you and continue your governed Franchise journey through CRAYS.pro." },
  "/deals": { title: "Released Deal Marketplace | CRAYS Franchise", description: "Explore released CRAYS Franchise opportunity summaries, use public filters to compare them or see when no public opportunities are currently available." },
  "/funding-partners": { title: "Funding Partners | CRAYS Franchise", description: "Review how CRAYS prepares versioned, venture-aware Funding Cases while every lender independently underwrites and decides." },
  "/investors": { title: "Investors | CRAYS Franchise", description: "Review the public CRAYS Franchise investment thesis, governance and diligence route without making an offer, promising returns or exposing private evidence." },
  "/vendors": { title: "Vendors, Suppliers & General Contractors | CRAYS Franchise", description: "Check how your delivery capability can qualify, what evidence you need and when you can review a private work package." },
  "/portal": { title: "Shared Login & Relationship Entry | CRAYS", description: "Choose your CRAYS business relationship and review the governed CRAYS.pro account and Portal entry, with current availability and access boundaries." },
  "/faq": { title: "Frequently Asked Questions | CRAYS Franchise", description: "Find source-backed answers for your CRAYS Venture, property, released Deal, relationship, data boundary and account progression." },
  "/contact": { title: "Contact | CRAYS Franchise", description: "Choose the relevant inquiry purpose, use the dedicated self-service route where available and prepare a public-safe Contact draft." },
  "/imprint": { title: "Imprint | CRAYS Franchise", description: "Review the CRAYS.pro legal-disclosure structure and the publisher, address, representation and contact fields still requiring confirmation." },
  "/privacy": { title: "Privacy | CRAYS Franchise", description: "Understand CRAYS.pro public, Contact, account, Portal, Property, Deal and venture-processing boundaries, including details awaiting legal confirmation." },
  "/accessibility": { title: "Accessibility | CRAYS Franchise", description: "Review the CRAYS.pro accessibility target, current design approach, known limitations, available alternatives and barrier-reporting route." },
} as const satisfies Record<CraysProPublicPath, PublicMetadataRecord>;

export function getCraysProPublicCanonical(path: CraysProPublicPath) {
  return path === "/" ? `${CRAYS_PRO_PUBLIC_ORIGIN}/` : `${CRAYS_PRO_PUBLIC_ORIGIN}${path}`;
}

export function getCraysProPublicMetadata(path: CraysProPublicPath): Metadata {
  const record = CRAYS_PRO_PUBLIC_METADATA[path];
  const canonical = getCraysProPublicCanonical(path);
  return {
    title: { absolute: record.title },
    description: record.description,
    alternates: { canonical },
    openGraph: { title: record.title, description: record.description, url: canonical, siteName: "CRAYS Franchise", type: "website" },
    twitter: { card: "summary", title: record.title, description: record.description },
  };
}
