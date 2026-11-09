import {LocalizedMarinaDetailRoute} from "@/lib/server/clubs/localized-marina-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("it", "hospitality/marina-hotel", {title:"Forest City Marina Hotel | CRAYS Clubs",description:"Scopri camere, servizi e soggiorni al Forest City Marina Hotel, a Forest City, in Malesia. Disponibilità, accesso e prenotazioni vengono confermati separatamente."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedMarinaDetailRoute(props, "it"); }
