import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { FamiliesPage } from "@/components/crays-clubs/journeys-phase8/families-page";
import { familiesCopy } from "@/components/crays-clubs/journeys-phase8/families-copy";

export const metadata: Metadata = clubsPageMetadata("pt", "families", {
  title: familiesCopy.pt.metaTitle,
  description: familiesCopy.pt.metaDescription,
  alternates: {
    canonical: "https://www.craysclub.com/pt/families",
  },
});

export default function CraysClubFamiliesPage() {
  return <FamiliesPage locale="pt" />;
}
