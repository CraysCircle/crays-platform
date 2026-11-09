import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ClubsSeoScope } from "@/components/crays-clubs/public/clubs-seo-scope";
import { clubsLocaleScopeMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsLocaleScopeMetadata("pt");

export default function PTWebLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ClubsSeoScope locale="pt">{children}</ClubsSeoScope>;
}
