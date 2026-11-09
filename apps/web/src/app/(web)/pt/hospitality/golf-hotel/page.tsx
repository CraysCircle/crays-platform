import {LocalizedGolfDetailRoute} from "@/lib/server/clubs/localized-golf-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("pt", "hospitality/golf-hotel", {title:"Forest City Golf Hotel | CRAYS Clubs",description:"Descubra quartos, instalações e estadias no Forest City Golf Hotel, em Forest City, Malásia. Disponibilidade, acesso e reservas são confirmados separadamente."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedGolfDetailRoute(props, "pt"); }
