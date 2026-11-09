import { clubsMetadata, renderClubsHomepage } from "@/components/crays-clubs/public/clubs-locale-page";
export const metadata = clubsMetadata("pt");
export default async function ClubsptPage() { return renderClubsHomepage("pt"); }
