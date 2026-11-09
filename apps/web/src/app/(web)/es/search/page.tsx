import {LocalizedSearchRoute} from "@/lib/server/clubs/localized-search-route";
import {clubsPageMetadata} from "@/lib/clubs/seo";
import type {SearchQuery} from "@/components/crays-clubs/public/clubs-property-detail-contract";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";
export const metadata = clubsPageMetadata("es", "search", {title:"Encuentra tu estancia | CRAYS Clubs"}, {index:false});
export default function SearchRoute(props: {searchParams:Promise<SearchQuery>}) { return LocalizedSearchRoute(props, "es"); }
