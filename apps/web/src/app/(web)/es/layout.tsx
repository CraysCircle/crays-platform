import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ClubsSeoScope } from "@/components/crays-clubs/public/clubs-seo-scope";
import { clubsLocaleScopeMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsLocaleScopeMetadata("es");

export default function ESWebLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ClubsSeoScope locale="es">{children}</ClubsSeoScope>;
}
