import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { DataProtectionPage } from "@/components/crays-clubs/public/data-protection-page";

export const metadata: Metadata = clubsPageMetadata("en", "legal/data-protection", {
  title: "Data Protection | Crays Clubs",
  description: "How Crays Club handles personal data when people visit the website, request access or contact the team.",
  alternates: {
    canonical: "https://www.craysclub.com/en/legal/data-protection",
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
  return <DataProtectionPage />;
}
