import {LocalizedGolfDetailRoute} from "@/lib/server/clubs/localized-golf-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("ca", "hospitality/golf-hotel", {title:"Forest City Golf Hotel | CRAYS Clubs",description:"Descobreix habitacions, instal·lacions i estades a Forest City Golf Hotel, a Forest City, Malàisia. La disponibilitat, l’accés i les reserves es confirmen per separat."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedGolfDetailRoute(props, "ca"); }
