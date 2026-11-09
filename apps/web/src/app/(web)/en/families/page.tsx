import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { FamiliesPage } from "@/components/crays-clubs/journeys-phase8/families-page";
import { familiesCopy } from "@/components/crays-clubs/journeys-phase8/families-copy";

export const metadata: Metadata = clubsPageMetadata("en", "families", {
  title: familiesCopy.en.metaTitle,
  description: familiesCopy.en.metaDescription,
  alternates: {
    canonical: "https://www.craysclub.com/en/families",
  },
});

export default function CraysClubFamiliesPage() {
  return <FamiliesPage locale="en" />;
}
