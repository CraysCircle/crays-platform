import {LocalizedGolfDetailRoute} from "@/lib/server/clubs/localized-golf-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("it", "hospitality/golf-hotel", {title:"Forest City Golf Hotel | CRAYS Clubs",description:"Scopri camere, servizi e soggiorni al Forest City Golf Hotel, a Forest City, in Malesia. Disponibilità, accesso e prenotazioni vengono confermati separatamente."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedGolfDetailRoute(props, "it"); }
