import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ClubsHostCompanyPage } from "@/components/crays-clubs/public/clubs-host-company-page";
import { hostCompanyCopy } from "@/components/crays-clubs/public/host-company-copy";

const copy = hostCompanyCopy["en"];

export const metadata: Metadata = clubsPageMetadata("en", "host-company", {
  title: copy.metadata.title,
  description: copy.metadata.description,
});

export default function HostCompanyRoutePage() {
  return <ClubsHostCompanyPage locale="en" />;
}
