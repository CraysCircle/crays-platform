import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";
import { ClubsHospitalityPage } from "@/components/crays-clubs/public/clubs-hospitality-page";
import { hospitalityCopy } from "@/components/crays-clubs/journeys-phase8/hospitality-copy";

const locale = "pt" as const;
const content = hospitalityCopy[locale];

export const metadata: Metadata = clubsPageMetadata("pt", "hospitality", {
  title: content.metaTitle,
  description: content.metaDescription,
  alternates: { canonical: "https://www.craysclub.com/pt/hospitality" },
});

export default function HospitalityRoute() {
  return <ClubsHospitalityPage locale={locale} />;
}
