import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ClubsBecomeAMemberPage } from "@/components/crays-clubs/public/clubs-become-a-member-page";
import { becomeMemberCopy } from "@/components/crays-clubs/journeys-phase8/become-a-member-copy";

const locale = "pt" as const;
const canonical = "https://www.craysclub.com/pt/become-a-member";
const copy = becomeMemberCopy[locale];

export const metadata: Metadata = clubsPageMetadata("pt", "become-a-member", {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: {
    canonical,
    languages: {
      en: "https://www.craysclub.com/en/become-a-member",
      de: "https://www.craysclub.com/de/become-a-member",
      es: "https://www.craysclub.com/es/become-a-member",
      ca: "https://www.craysclub.com/ca/become-a-member",
      fr: "https://www.craysclub.com/fr/become-a-member",
      pt: "https://www.craysclub.com/pt/become-a-member",
      it: "https://www.craysclub.com/it/become-a-member",
    },
  },
});

export default function BecomeAMemberRoute() {
  return <ClubsBecomeAMemberPage locale={locale} />;
}
