import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("en","account");

export default function ENAccountSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
