import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ClubsTeamsPage } from "@/components/crays-clubs/public/clubs-teams-page";
import { teamsMetadata } from "@/components/crays-clubs/public/clubs-teams-copy";

const metadataCopy = teamsMetadata["pt"];

export const metadata: Metadata = clubsPageMetadata("pt", "teams", {
  title: metadataCopy.title,
  description: metadataCopy.description,
});

export default function TeamsPage() {
  return <ClubsTeamsPage locale="pt" />;
}
