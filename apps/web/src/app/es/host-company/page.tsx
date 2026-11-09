import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ClubsHostCompanyPage } from "@/components/crays-clubs/public/clubs-host-company-page";
import { hostCompanyCopy } from "@/components/crays-clubs/public/host-company-copy";

const copy = hostCompanyCopy["es"];

export const metadata: Metadata = clubsPageMetadata("es", "host-company", {
  title: copy.metadata.title,
  description: copy.metadata.description,
});

export default function HostCompanyRoutePage() {
  return <ClubsHostCompanyPage locale="es" />;
}
