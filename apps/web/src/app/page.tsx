import {
  clubsMetadata,
  renderClubsHomepage,
} from "@/components/crays-clubs/public/clubs-locale-page";

export const metadata = clubsMetadata("en");

export default async function ClubsHomepage() {
  return renderClubsHomepage("en");
}
