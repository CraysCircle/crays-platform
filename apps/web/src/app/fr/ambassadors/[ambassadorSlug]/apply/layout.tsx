import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("fr");

export default function FRAmbassadorApplicationSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
