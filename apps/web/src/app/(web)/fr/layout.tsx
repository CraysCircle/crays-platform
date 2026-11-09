import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ClubsSeoScope } from "@/components/crays-clubs/public/clubs-seo-scope";
import { clubsLocaleScopeMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsLocaleScopeMetadata("fr");

export default function FRWebLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ClubsSeoScope locale="fr">{children}</ClubsSeoScope>;
}
