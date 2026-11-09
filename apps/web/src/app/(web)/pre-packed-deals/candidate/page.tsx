import { CandidatePortalPage } from "@/components/candidate-portal-page";
import { getCandidatePortalReadModel } from "@/db/candidate-portal-read-model-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Candidate Portal | CRAYS",
  description: "CRAYS candidate-safe portal for released deals, documents, finance and messages.",
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PrePackedDealsCandidatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const readModel = await getCandidatePortalReadModel("franchise-candidate");

  return <CandidatePortalPage readModel={readModel} tab={getParam(params.tab)} />;
}
