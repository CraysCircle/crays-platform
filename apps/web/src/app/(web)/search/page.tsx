import {LocalizedSearchRoute} from "@/lib/server/clubs/localized-search-route";
import {metadata} from "@/lib/server/clubs/localized-search-route";
export {metadata};
export const dynamic="force-dynamic";
export const preferredRegion="fra1";
export default function SearchRoute(props: Parameters<typeof LocalizedSearchRoute>[0]) {return LocalizedSearchRoute(props,"en");}
