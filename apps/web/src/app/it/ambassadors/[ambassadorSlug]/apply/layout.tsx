import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("it");

export default function ITAmbassadorApplicationSeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
