import { clubsMetadata, renderClubsHomepage } from "@/components/crays-clubs/public/clubs-locale-page";
export const metadata = clubsMetadata("es");
export default async function ClubsesPage() { return renderClubsHomepage("es"); }
