import {LocalizedMarinaDetailRoute} from "@/lib/server/clubs/localized-marina-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("ca", "hospitality/marina-hotel", {title:"Forest City Marina Hotel | CRAYS Clubs",description:"Descobreix habitacions, instal·lacions i estades a Forest City Marina Hotel, a Forest City, Malàisia. La disponibilitat, l’accés i les reserves es confirmen per separat."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedMarinaDetailRoute(props, "ca"); }
