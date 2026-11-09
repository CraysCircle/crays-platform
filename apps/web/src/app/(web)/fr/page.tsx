import { clubsMetadata, renderClubsHomepage } from "@/components/crays-clubs/public/clubs-locale-page";
export const metadata = clubsMetadata("fr");
export default async function ClubsfrPage() { return renderClubsHomepage("fr"); }
