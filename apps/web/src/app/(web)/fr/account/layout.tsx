import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("fr","account");

export default function FRAccountSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
