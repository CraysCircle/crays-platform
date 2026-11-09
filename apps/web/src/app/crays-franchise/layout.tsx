import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "CRAYS Franchise — One property. Four possibilities.",
    template: "%s — CRAYS Franchise",
  },
  description:
    "CRAYS matches properties, franchise partners and capital across four connected concepts.",
};

export default function CraysFranchiseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
