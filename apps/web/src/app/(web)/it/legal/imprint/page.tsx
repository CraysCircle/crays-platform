import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { LegalPage } from "@/components/crays-clubs/journeys-phase8/legal-page";
import { legalUiCopy, getLegalDocumentTitle } from "@/components/crays-clubs/journeys-phase8/legal-copy-v1";

export const metadata: Metadata = clubsPageMetadata("it", "legal/imprint", {
  title: `${getLegalDocumentTitle("it", "imprint")} | CRAYS Club`,
  alternates: {
    canonical: "https://www.craysclub.com/it/legal/imprint",
    languages: {
      "en": "https://www.craysclub.com/en/legal/imprint",
      "de": "https://www.craysclub.com/de/legal/imprint",
      "es": "https://www.craysclub.com/es/legal/imprint",
      "ca": "https://www.craysclub.com/ca/legal/imprint",
      "fr": "https://www.craysclub.com/fr/legal/imprint",
      "pt": "https://www.craysclub.com/pt/legal/imprint",
      "it": "https://www.craysclub.com/it/legal/imprint",
    },
  },
});

export default function Page() {
  return <LegalPage locale="it" document="imprint" />;
}
