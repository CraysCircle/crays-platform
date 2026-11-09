import {CLUBS_LOCALES, type ClubsLocale} from "@/lib/clubs/public-site";
import { MARINA_EARLIEST_ARRIVAL } from "@/lib/member-commerce/hotel-stay-policy";
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

export const metadata: Metadata = clubsPageMetadata("en", "hospitality/marina-hotel", {
  title: "Crays Club Marina | CRAYS Clubs",
  description:
    "Explore waterfront rooms, hotel facilities and monthly Crays Club stays in Forest City. Applications through an Ambassador or directly through the Crays team require approval before booking.",
  alternates: {
    canonical: "https://www.craysclub.com/en/hospitality/marina-hotel",
  },
});

type MarinaDetailRouteProps = { searchParams: Promise<SearchQuery> };

export async function LocalizedMarinaDetailRoute({
  searchParams,
}: MarinaDetailRouteProps, locale: ClubsLocale) {
  const query = await searchParams;
  const intent=getBookingIntent(query);
  if(!intent.checkIn) {
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    const year=Number(parts.find(p=>p.type==="year")?.value),month=Number(parts.find(p=>p.type==="month")?.value);
    intent.checkIn=new Date(Date.UTC(year,month,1)).toISOString().slice(0,10);
  }
  if(intent.checkIn < MARINA_EARLIEST_ARRIVAL) intent.checkIn = MARINA_EARLIEST_ARRIVAL;
  const bootstrap = await readPublicHospitalityPageBootstrap("property-clubs-forest-city-marina",intent.checkIn);
  return (
    <ClubsPublicShell availableLocales={CLUBS_LOCALES} headerTone="navy" locale={locale}>
      <ClubsPropertyDetailPage
        locale={locale}
        authReturnTo={buildPropertyReturnTo("marina", query, locale)}
        backToSearch={buildBackToSearch(query, locale)}
        intent={intent}
        variant="marina"
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

