import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { LegalPage } from "@/components/crays-clubs/journeys-phase8/legal-page";
import { legalUiCopy } from "@/components/crays-clubs/journeys-phase8/legal-copy-v1";

export const metadata: Metadata = clubsPageMetadata("en", "legal", {
  title: `${legalUiCopy["en"].hubTitle} | CRAYS Club`,
  alternates: {
    canonical: "https://www.craysclub.com/en/legal",
    languages: {
      "en": "https://www.craysclub.com/en/legal",
      "de": "https://www.craysclub.com/de/legal",
      "es": "https://www.craysclub.com/es/legal",
      "ca": "https://www.craysclub.com/ca/legal",
      "fr": "https://www.craysclub.com/fr/legal",
      "pt": "https://www.craysclub.com/pt/legal",
      "it": "https://www.craysclub.com/it/legal",
    },
  },
});

export default function Page() {
  return <LegalPage locale="en" />;
}
