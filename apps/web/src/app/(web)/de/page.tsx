import { clubsMetadata, renderClubsHomepage } from "@/components/crays-clubs/public/clubs-locale-page";
export const metadata = clubsMetadata("de");
export default async function ClubsdePage() { return renderClubsHomepage("de"); }
