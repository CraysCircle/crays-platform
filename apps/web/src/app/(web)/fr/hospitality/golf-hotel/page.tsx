import {LocalizedGolfDetailRoute} from "@/lib/server/clubs/localized-golf-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("fr", "hospitality/golf-hotel", {title:"Forest City Golf Hotel | CRAYS Clubs",description:"Découvrez les chambres, les équipements et les séjours au Forest City Golf Hotel, à Forest City, en Malaisie. Disponibilité, accès et réservations sont confirmés séparément."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedGolfDetailRoute(props, "fr"); }
