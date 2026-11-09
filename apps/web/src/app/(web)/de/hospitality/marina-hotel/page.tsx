import {LocalizedMarinaDetailRoute} from "@/lib/server/clubs/localized-marina-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("de", "hospitality/marina-hotel", {title:"Forest City Marina Hotel | CRAYS Clubs",description:"Entdecke Zimmer, Ausstattung und Aufenthalte im Forest City Marina Hotel in Forest City, Malaysia. Verfügbarkeit, Zugang und Buchungen werden separat bestätigt."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedMarinaDetailRoute(props, "de"); }
