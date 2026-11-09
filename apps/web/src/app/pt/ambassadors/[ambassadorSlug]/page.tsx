import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubsAmbassadorProfilePage } from "../../../../components/crays-clubs/public/clubs-ambassador-profile-page";
import { findPublicAmbassador } from "@/lib/server/clubs/public-ambassador-page-data";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import { clubsAmbassadorProfileMetadata } from "@/lib/clubs/ambassador-profile-metadata";

type RouteProps = {
  params: Promise<{ ambassadorSlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { ambassadorSlug } = await params;
  const ambassador = await findPublicAmbassador("pt", ambassadorSlug);
  if (!ambassador) {
    return clubsPageMetadata(
      "pt",
      `ambassadors/${ambassadorSlug}`,
      { title: "Ambassador not found | CRAYS Clubs" },
      { availableLocales: ["en", "de", "es", "ca", "fr", "pt", "it"], index: false },
    );
  }

  return clubsAmbassadorProfileMetadata(
    "pt",
    ambassador,
    {
      title: `${ambassador.name} | CRAYS Ambassador`,
      description: "Conheça {name} e comece uma conversa pessoal sobre a CRAYS.".replace("{name}", ambassador.name),
    },
  );
}

export default async function AmbassadorProfileRoute({
  params,
}: RouteProps) {
  const { ambassadorSlug } = await params;
  const ambassador = await findPublicAmbassador("pt", ambassadorSlug);
  if (!ambassador) notFound();

  return (
    <ClubsAmbassadorProfilePage
      ambassador={ambassador}
      locale="pt"
    />
  );
}
