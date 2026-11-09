import {LocalizedGolfDetailRoute,metadata} from "@/lib/server/clubs/localized-golf-hotel-route";
export {metadata};
export const dynamic="force-dynamic";
export const preferredRegion="fra1";
export default function HotelRoute(props: Parameters<typeof LocalizedGolfDetailRoute>[0]) {return LocalizedGolfDetailRoute(props,"en");}
