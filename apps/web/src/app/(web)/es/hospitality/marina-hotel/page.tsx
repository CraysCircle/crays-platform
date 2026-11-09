import {LocalizedMarinaDetailRoute} from "@/lib/server/clubs/localized-marina-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("es", "hospitality/marina-hotel", {title:"Forest City Marina Hotel | CRAYS Clubs",description:"Descubre habitaciones, instalaciones y estancias en Forest City Marina Hotel, en Forest City, Malasia. La disponibilidad, el acceso y las reservas se confirman por separado."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedMarinaDetailRoute(props, "es"); }
