import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { FamiliesPage } from "@/components/crays-clubs/journeys-phase8/families-page";
import { familiesCopy } from "@/components/crays-clubs/journeys-phase8/families-copy";

export const metadata: Metadata = clubsPageMetadata("it", "families", {
  title: familiesCopy.it.metaTitle,
  description: familiesCopy.it.metaDescription,
  alternates: {
    canonical: "https://www.craysclub.com/it/families",
  },
});

export default function CraysClubFamiliesPage() {
  return <FamiliesPage locale="it" />;
}
