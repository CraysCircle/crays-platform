import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { LegalPage } from "@/components/crays-clubs/journeys-phase8/legal-page";
import { legalUiCopy, getLegalDocumentTitle } from "@/components/crays-clubs/journeys-phase8/legal-copy-v1";

export const metadata: Metadata = clubsPageMetadata("de", "legal/terms-and-conditions", {
  title: `${getLegalDocumentTitle("de", "terms-and-conditions")} | CRAYS Club`,
  alternates: {
    canonical: "https://www.craysclub.com/de/legal/terms-and-conditions",
    languages: {
      "en": "https://www.craysclub.com/en/legal/terms-and-conditions",
      "de": "https://www.craysclub.com/de/legal/terms-and-conditions",
      "es": "https://www.craysclub.com/es/legal/terms-and-conditions",
      "ca": "https://www.craysclub.com/ca/legal/terms-and-conditions",
      "fr": "https://www.craysclub.com/fr/legal/terms-and-conditions",
      "pt": "https://www.craysclub.com/pt/legal/terms-and-conditions",
      "it": "https://www.craysclub.com/it/legal/terms-and-conditions",
    },
  },
});

export default function Page() {
  return <LegalPage locale="de" document="terms-and-conditions" />;
}
