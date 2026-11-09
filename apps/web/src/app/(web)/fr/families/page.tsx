import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { FamiliesPage } from "@/components/crays-clubs/journeys-phase8/families-page";
import { familiesCopy } from "@/components/crays-clubs/journeys-phase8/families-copy";

export const metadata: Metadata = clubsPageMetadata("fr", "families", {
  title: familiesCopy.fr.metaTitle,
  description: familiesCopy.fr.metaDescription,
  alternates: {
    canonical: "https://www.craysclub.com/fr/families",
  },
});

export default function CraysClubFamiliesPage() {
  return <FamiliesPage locale="fr" />;
}
