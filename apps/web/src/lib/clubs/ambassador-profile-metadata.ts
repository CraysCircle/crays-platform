import type { Metadata } from "next";
import type { ClubsLocale } from "./public-site";
import type { PublicAmbassadorView } from "./public-ambassador-view";
import { clubsPageMetadata } from "./seo";

/** Keep the shared canonical/language policy, then select this profile's admitted portrait. */
export function clubsAmbassadorProfileMetadata(
  locale: ClubsLocale,
  ambassador: PublicAmbassadorView,
  input: Metadata,
): Metadata {
  const metadata = clubsPageMetadata(
    locale,
    `ambassadors/${ambassador.slug}`,
    input,
    { availableLocales: ["en", "de", "es", "ca", "fr", "pt", "it"] },
  );
  const portrait = ambassador.socialImage;
  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: ambassador.canonicalUrl },
    openGraph: { ...metadata.openGraph, images: [portrait] },
    twitter: { ...metadata.twitter, images: [portrait] },
  };
}
