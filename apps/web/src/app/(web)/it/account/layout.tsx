import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("it","account");

export default function ITAccountSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
