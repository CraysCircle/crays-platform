import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("ca","account");

export default function CAAccountSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
