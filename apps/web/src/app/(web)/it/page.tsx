import { clubsMetadata, renderClubsHomepage } from "@/components/crays-clubs/public/clubs-locale-page";
export const metadata = clubsMetadata("it");
export default async function ClubsitPage() { return renderClubsHomepage("it"); }
