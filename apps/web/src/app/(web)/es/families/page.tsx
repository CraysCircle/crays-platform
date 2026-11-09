import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { FamiliesPage } from "@/components/crays-clubs/journeys-phase8/families-page";
import { familiesCopy } from "@/components/crays-clubs/journeys-phase8/families-copy";

export const metadata: Metadata = clubsPageMetadata("es", "families", {
  title: familiesCopy.es.metaTitle,
  description: familiesCopy.es.metaDescription,
  alternates: {
    canonical: "https://www.craysclub.com/es/families",
  },
});

export default function CraysClubFamiliesPage() {
  return <FamiliesPage locale="es" />;
}
