import {LocalizedMarinaDetailRoute} from "@/lib/server/clubs/localized-marina-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("pt", "hospitality/marina-hotel", {title:"Forest City Marina Hotel | CRAYS Clubs",description:"Descubra quartos, instalações e estadias no Forest City Marina Hotel, em Forest City, Malásia. Disponibilidade, acesso e reservas são confirmados separadamente."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedMarinaDetailRoute(props, "pt"); }
