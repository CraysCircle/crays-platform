import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { LegalPage } from "@/components/crays-clubs/journeys-phase8/legal-page";
import { legalUiCopy, getLegalDocumentTitle } from "@/components/crays-clubs/journeys-phase8/legal-copy-v1";

export const metadata: Metadata = clubsPageMetadata("pt", "legal/privacy-policy", {
  title: `${getLegalDocumentTitle("pt", "privacy-policy")} | CRAYS Club`,
  alternates: {
    canonical: "https://www.craysclub.com/pt/legal/privacy-policy",
    languages: {
      "en": "https://www.craysclub.com/en/legal/privacy-policy",
      "de": "https://www.craysclub.com/de/legal/privacy-policy",
      "es": "https://www.craysclub.com/es/legal/privacy-policy",
      "ca": "https://www.craysclub.com/ca/legal/privacy-policy",
      "fr": "https://www.craysclub.com/fr/legal/privacy-policy",
      "pt": "https://www.craysclub.com/pt/legal/privacy-policy",
      "it": "https://www.craysclub.com/it/legal/privacy-policy",
    },
  },
});

export default function Page() {
  return <LegalPage locale="pt" document="privacy-policy" />;
}
