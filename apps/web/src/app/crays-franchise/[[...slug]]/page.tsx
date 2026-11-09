import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FranchiseSite } from "@/components/crays-franchise/franchise-site";
import {
  getCraysProPublicMetadata,
  type CraysProPublicPath,
} from "@/lib/crays-pro-public-metadata";

const validPages = new Set([
  "",
  "concepts",
  "concepts/gym",
  "concepts/coffee",
  "concepts/clubs",
  "concepts/retail",
  "property-owners",
  "property-owners/submit",
  "franchise-partners",
  "deals",
  "partners",
  "funding-partners",
  "investors",
  "suppliers",
  "how-it-works",
  "login",
]);

const canonicalMetadataPaths = {
  "": "/",
  concepts: "/concepts",
  "concepts/coffee": "/concepts/coffee",
  "concepts/retail": "/concepts/retail",
  "concepts/gym": "/concepts/gym",
  "concepts/clubs": "/concepts/clubs",
} as const satisfies Record<string, CraysProPublicPath>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await params;
  const page = slug.join("/");
  const canonicalPath =
    canonicalMetadataPaths[page as keyof typeof canonicalMetadataPaths];

  return canonicalPath ? getCraysProPublicMetadata(canonicalPath) : {};
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const page = slug.join("/");
  if (!validPages.has(page)) notFound();
  return <FranchiseSite page={page} />;
}
