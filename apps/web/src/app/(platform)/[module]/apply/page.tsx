import { notFound } from "next/navigation";
import { ClubsAmbassadorApplyPage } from "@/components/crays-clubs/public/clubs-ambassador-apply-page";
import { isApprovedAmbassadorSlug } from "@/lib/clubs/public-ambassador-registry";

export default async function Page({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: ambassadorSlug } = await params;
  if (
    process.env.CRAYS_CLUBS_LOCAL_PREVIEW !== "true" ||
    !isApprovedAmbassadorSlug(ambassadorSlug)
  ) {
    notFound();
  }
  return <ClubsAmbassadorApplyPage locale="en" ambassadorSlug={ambassadorSlug} />;
}
