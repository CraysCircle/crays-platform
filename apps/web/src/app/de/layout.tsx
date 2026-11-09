import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ClubsSeoScope } from "@/components/crays-clubs/public/clubs-seo-scope";
import { clubsLocaleScopeMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsLocaleScopeMetadata("de");

export default function DEPublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ClubsSeoScope locale="de">{children}</ClubsSeoScope>;
}
