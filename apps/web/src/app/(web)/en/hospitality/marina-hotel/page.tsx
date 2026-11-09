import {LocalizedMarinaDetailRoute,metadata} from "@/lib/server/clubs/localized-marina-hotel-route";
export {metadata};
export const dynamic="force-dynamic";
export const preferredRegion="fra1";
export default function HotelRoute(props: Parameters<typeof LocalizedMarinaDetailRoute>[0]) {return LocalizedMarinaDetailRoute(props,"en");}
