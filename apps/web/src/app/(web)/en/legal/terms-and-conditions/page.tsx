import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { TermsAndConditionsPage } from "@/components/crays-clubs/public/legal/terms-and-conditions-page";

export const metadata: Metadata = clubsPageMetadata("en", "legal/terms-and-conditions", {
  title: "Terms and Conditions | Crays Clubs",
  alternates: {
    canonical: "https://www.craysclub.com/en/legal/terms-and-conditions",
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
  return <TermsAndConditionsPage />;
}
