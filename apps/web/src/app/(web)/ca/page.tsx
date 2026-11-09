import { clubsMetadata, renderClubsHomepage } from "@/components/crays-clubs/public/clubs-locale-page";
export const metadata = clubsMetadata("ca");
export default async function ClubscaPage() { return renderClubsHomepage("ca"); }
