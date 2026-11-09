import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("de","account");

export default function DEAccountSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
