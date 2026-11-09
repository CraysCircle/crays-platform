import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { FamiliesPage } from "@/components/crays-clubs/journeys-phase8/families-page";
import { familiesCopy } from "@/components/crays-clubs/journeys-phase8/families-copy";

export const metadata: Metadata = clubsPageMetadata("ca", "families", {
  title: familiesCopy.ca.metaTitle,
  description: familiesCopy.ca.metaDescription,
  alternates: {
    canonical: "https://www.craysclub.com/ca/families",
  },
});

export default function CraysClubFamiliesPage() {
  return <FamiliesPage locale="ca" />;
}
