import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { FamiliesPage } from "@/components/crays-clubs/journeys-phase8/families-page";
import { familiesCopy } from "@/components/crays-clubs/journeys-phase8/families-copy";

export const metadata: Metadata = clubsPageMetadata("de", "families", {
  title: familiesCopy.de.metaTitle,
  description: familiesCopy.de.metaDescription,
  alternates: {
    canonical: "https://www.craysclub.com/de/families",
  },
});

export default function CraysClubFamiliesPage() {
  return <FamiliesPage locale="de" />;
}
