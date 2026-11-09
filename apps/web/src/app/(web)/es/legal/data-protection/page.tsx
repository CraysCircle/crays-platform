import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { LegalPage } from "@/components/crays-clubs/journeys-phase8/legal-page";
import { legalUiCopy, getLegalDocumentTitle } from "@/components/crays-clubs/journeys-phase8/legal-copy-v1";

export const metadata: Metadata = clubsPageMetadata("es", "legal/data-protection", {
  title: `${getLegalDocumentTitle("es", "data-protection")} | CRAYS Club`,
  alternates: {
    canonical: "https://www.craysclub.com/es/legal/data-protection",
    languages: {
      "en": "https://www.craysclub.com/en/legal/data-protection",
      "de": "https://www.craysclub.com/de/legal/data-protection",
      "es": "https://www.craysclub.com/es/legal/data-protection",
      "ca": "https://www.craysclub.com/ca/legal/data-protection",
      "fr": "https://www.craysclub.com/fr/legal/data-protection",
      "pt": "https://www.craysclub.com/pt/legal/data-protection",
      "it": "https://www.craysclub.com/it/legal/data-protection",
    },
  },
});

export default function Page() {
  return <LegalPage locale="es" document="data-protection" />;
}
