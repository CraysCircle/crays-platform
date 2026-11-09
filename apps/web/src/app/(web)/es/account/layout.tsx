import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("es","account");

export default function ESAccountSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
