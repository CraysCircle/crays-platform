import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubsAmbassadorProfilePage } from "../../../../../components/crays-clubs/public/clubs-ambassador-profile-page";
import { ambassadorJourneyCopy } from "../../../../../components/crays-clubs/public/clubs-ambassador-journey-copy";
import { findPublicAmbassador } from "@/lib/server/clubs/public-ambassador-page-data";
import { clubsAmbassadorProfileMetadata } from "@/lib/clubs/ambassador-profile-metadata";
type PageProps = { params: Promise<{ ambassadorSlug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
 const { ambassadorSlug } = await params;
 const ambassador = await findPublicAmbassador("ca", ambassadorSlug);
 if (!ambassador) notFound();
 return clubsAmbassadorProfileMetadata("ca", ambassador, { title: `${ambassador.name} | CRAYS Ambassador`, description: ambassadorJourneyCopy["ca"].metaDescription });
}
export default async function AmbassadorReferralPage({ params }: PageProps) {
 const { ambassadorSlug } = await params;
 const ambassador = await findPublicAmbassador("ca", ambassadorSlug);
 if (!ambassador) notFound();
 return <ClubsAmbassadorProfilePage locale="ca" ambassador={ambassador} />;
}
