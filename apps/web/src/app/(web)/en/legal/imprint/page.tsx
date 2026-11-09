import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ImprintPage } from "@/components/crays-clubs/public/imprint-page";

export const metadata: Metadata = clubsPageMetadata("en", "legal/imprint", {
  title: "Imprint | CRAYS Club",
  description: "Company and contact information for Crays Clubs.",
  alternates: {
    canonical: "https://www.craysclub.com/en/legal/imprint",
    languages: {
      en: "https://www.craysclub.com/en/legal/imprint",
      de: "https://www.craysclub.com/de/legal/imprint",
      es: "https://www.craysclub.com/es/legal/imprint",
      ca: "https://www.craysclub.com/ca/legal/imprint",
      fr: "https://www.craysclub.com/fr/legal/imprint",
      pt: "https://www.craysclub.com/pt/legal/imprint",
      it: "https://www.craysclub.com/it/legal/imprint",
    },
  },
});

export default function Page() {
  return <ImprintPage />;
}
