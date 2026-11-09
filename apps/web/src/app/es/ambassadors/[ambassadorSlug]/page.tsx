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
  const ambassador = await findPublicAmbassador("es", ambassadorSlug);
  if (!ambassador) {
    return clubsPageMetadata(
      "es",
      `ambassadors/${ambassadorSlug}`,
      { title: "Ambassador not found | CRAYS Clubs" },
      { availableLocales: ["en", "de", "es", "ca", "fr", "pt", "it"], index: false },
    );
  }

  return clubsAmbassadorProfileMetadata(
    "es",
    ambassador,
    {
      title: `${ambassador.name} | CRAYS Ambassador`,
      description: "Conoce a {name} e inicia una conversación personal sobre CRAYS.".replace("{name}", ambassador.name),
    },
  );
}

export default async function AmbassadorProfileRoute({
  params,
}: RouteProps) {
  const { ambassadorSlug } = await params;
  const ambassador = await findPublicAmbassador("es", ambassadorSlug);
  if (!ambassador) notFound();

  return (
    <ClubsAmbassadorProfilePage
      ambassador={ambassador}
      locale="es"
    />
  );
}
