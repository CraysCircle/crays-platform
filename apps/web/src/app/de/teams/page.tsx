import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ClubsTeamsPage } from "@/components/crays-clubs/public/clubs-teams-page";
import { teamsMetadata } from "@/components/crays-clubs/public/clubs-teams-copy";

const metadataCopy = teamsMetadata["de"];

export const metadata: Metadata = clubsPageMetadata("de", "teams", {
  title: metadataCopy.title,
  description: metadataCopy.description,
});

export default function TeamsPage() {
  return <ClubsTeamsPage locale="de" />;
}
