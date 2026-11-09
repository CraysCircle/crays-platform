import {LocalizedGolfDetailRoute} from "@/lib/server/clubs/localized-golf-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("es", "hospitality/golf-hotel", {title:"Forest City Golf Hotel | CRAYS Clubs",description:"Descubre habitaciones, instalaciones y estancias en Forest City Golf Hotel, en Forest City, Malasia. La disponibilidad, el acceso y las reservas se confirman por separado."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedGolfDetailRoute(props, "es"); }
