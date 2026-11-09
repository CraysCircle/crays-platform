import type { Metadata } from "next";
import type { ReactNode } from "react";

import { clubsUtilityMetadata } from "@/lib/clubs/seo";

export const metadata: Metadata = clubsUtilityMetadata("ca");

export default function CAAmbassadorApplySeoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
