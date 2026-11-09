import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("pt","account");

export default function PTAccountSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
