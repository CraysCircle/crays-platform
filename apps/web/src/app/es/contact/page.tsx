import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";

import { ClubsContactPage } from "@/components/crays-clubs/public/clubs-contact-page";
import { contactCopy } from "@/components/crays-clubs/public/contact-copy";

const copy = contactCopy["es"];

export const metadata: Metadata = clubsPageMetadata("es", "contact", {
  title: copy.metadata.title,
  description: copy.metadata.description,
});

export default function ContactRoutePage() {
  return <ClubsContactPage locale="es" />;
}
