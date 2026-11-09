import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ClubsSeoScope } from "@/components/crays-clubs/public/clubs-seo-scope";
import { clubsLocaleScopeMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsLocaleScopeMetadata("it");

export default function ITWebLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ClubsSeoScope locale="it">{children}</ClubsSeoScope>;
}
