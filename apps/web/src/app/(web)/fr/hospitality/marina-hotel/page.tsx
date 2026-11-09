import {LocalizedMarinaDetailRoute} from "@/lib/server/clubs/localized-marina-hotel-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("fr", "hospitality/marina-hotel", {title:"Forest City Marina Hotel | CRAYS Clubs",description:"Découvrez les chambres, les équipements et les séjours au Forest City Marina Hotel, à Forest City, en Malaisie. Disponibilité, accès et réservations sont confirmés séparément."});
export default function HotelRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedMarinaDetailRoute(props, "fr"); }
