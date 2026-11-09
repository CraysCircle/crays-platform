import {CLUBS_LOCALES, type ClubsLocale} from "@/lib/clubs/public-site";
import { readPublicHospitalityPageBootstrap } from "@/graphql/clubs/public-hospitality-page-bootstrap";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ClubsPropertyDetailPage } from "@/components/crays-clubs/public/clubs-property-detail-page";
import {
  buildBackToSearch,
  buildPropertyReturnTo,
  getBookingIntent,
  type SearchQuery,
} from "@/components/crays-clubs/public/clubs-property-detail-contract";
import { ClubsPublicShell } from "@/components/crays-clubs/public/clubs-public-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = clubsPageMetadata("en", "hospitality/golf-hotel", {
  title: "Crays Golf Hotel | CRAYS Clubs",
  description:
    "Explore rooms, golf, dining and daily, weekly or monthly Crays stays in Forest City. Applications through an Ambassador or directly through the Crays team require approval before booking.",
  alternates: {
    canonical: "https://www.craysclub.com/en/hospitality/golf-hotel",
  },
});

type GolfDetailRouteProps = { searchParams: Promise<SearchQuery> };

export async function LocalizedGolfDetailRoute({
  searchParams,
}: GolfDetailRouteProps, locale: ClubsLocale) {
  const query = await searchParams;
  const bootstrap = await readPublicHospitalityPageBootstrap("property-clubs-forest-city-golf",getBookingIntent(query).checkIn || new Date().toISOString().slice(0,10));
  return (
    <ClubsPublicShell availableLocales={CLUBS_LOCALES} headerTone="navy" locale={locale}>
      <ClubsPropertyDetailPage
        locale={locale}
        authReturnTo={buildPropertyReturnTo("golf", query, locale)}
        backToSearch={buildBackToSearch(query, locale)}
        intent={getBookingIntent(query)}
        variant="golf"
        initialPublicContent={bootstrap.content}
        initialPublicRate={bootstrap.rate}
        initialPublicPricing={bootstrap.policy}
        initialAmbassadors={bootstrap.ambassadors}
      />
    </ClubsPublicShell>
  );
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";

