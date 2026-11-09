import type { MetadataRoute } from "next";

import {
  CLUBS_INDEXABLE_LOCALIZED_ROUTES,
  CLUBS_SEO_LAST_SIGNIFICANT_UPDATE,
  CLUBS_SEO_ORIGIN,
} from "@/lib/clubs/seo";
import {
  CLUBS_LOCALES,
  clubsCanonicalUrl,
  type ClubsLocale,
} from "@/lib/clubs/public-site";
import { getPublicAmbassadorDirectory } from "@/lib/clubs/public-ambassador-registry";

function localizedAlternates(route: string) {
  return {
    languages: {
      ...Object.fromEntries(
        CLUBS_LOCALES.map((locale) => [locale, clubsCanonicalUrl(locale, route)]),
      ),
      "x-default": clubsCanonicalUrl("en", route),
    },
  };
}

function routePriority(route: string): number {
  if (!route) return 1;
  if (["become-a-member", "community-life", "families", "discover", "hospitality", "lifestyle"].includes(route)) return 0.9;
  if (["about-us", "contact", "experiences", "host-company", "teams"].includes(route)) return 0.8;
  if (route.startsWith("legal")) return 0.3;
  return 0.7;
}

function routeFrequency(route: string): MetadataRoute.Sitemap[number]["changeFrequency"] {
  if (route === "experiences") return "weekly";
  if (route.startsWith("legal")) return "yearly";
  return "monthly";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedPages = CLUBS_INDEXABLE_LOCALIZED_ROUTES.flatMap((route) =>
    CLUBS_LOCALES.map((locale: ClubsLocale) => ({
      url: clubsCanonicalUrl(locale, route),
      lastModified: CLUBS_SEO_LAST_SIGNIFICANT_UPDATE,
      changeFrequency: routeFrequency(route),
      priority: routePriority(route),
      alternates: localizedAlternates(route),
    })),
  );

  const ambassadorPages: MetadataRoute.Sitemap = getPublicAmbassadorDirectory().map(
    (ambassador) => {
      const route = `ambassadors/${ambassador.slug}`;
      return {
        url: clubsCanonicalUrl("en", route),
        lastModified: CLUBS_SEO_LAST_SIGNIFICANT_UPDATE,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: {
          languages: {
            en: clubsCanonicalUrl("en", route),
            "x-default": clubsCanonicalUrl("en", route),
          },
        },
      };
    },
  );

  return [...localizedPages, ...ambassadorPages].filter(
    (entry) => entry.url.startsWith(CLUBS_SEO_ORIGIN),
  );
}
