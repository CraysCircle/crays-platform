import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ClubsTeamsPage } from "@/components/crays-clubs/public/clubs-teams-page";
import { teamsMetadata } from "@/components/crays-clubs/public/clubs-teams-copy";

const metadataCopy = teamsMetadata["en"];

export const metadata: Metadata = clubsPageMetadata("en", "teams", {
  title: metadataCopy.title,
  description: metadataCopy.description,
});

export default function TeamsPage() {
  return <ClubsTeamsPage locale="en" />;
}
