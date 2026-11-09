import messages from "@/components/crays-clubs/journeys-phase8/founder-messages/de.json";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";
import { AboutUsPage } from "@/components/crays-clubs/journeys-phase8/about-us-page";
import { aboutCopy } from "@/components/crays-clubs/journeys-phase8/about-us-copy";

const locale = "de" as const;
const content = aboutCopy[locale];

export const metadata: Metadata = clubsPageMetadata("de", "about-us", {
  title: content.metaTitle,
  description: content.metaDescription,
  alternates: { canonical: "https://www.craysclub.com/de/about-us" },
});

export default function AboutUsRoute() {
  return <AboutUsPage locale={locale} messages={messages} />;
}
