import { redirect } from "next/navigation";

import { CandidatePortalPage } from "@/components/candidate-portal-page";
import { CandidateAccessGate } from "@/components/candidate-access-gate";
import { getCandidateDecisionReadModel } from "@/db/candidate-decision-read-model-repository";
import { resolveContextualWorkspaceAccess } from "@/lib/contextual-workspace-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Candidate Deal Room | CRAYS",
  description: "Your protected CRAYS Candidate decision and purchase journey.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CandidatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await resolveContextualWorkspaceAccess("candidate", ["franchise-candidate"]);
  if (access.state === "unauthenticated" && access.redirectHref) return <CandidateAccessGate loginHref={access.redirectHref} />;
  if (!access.allowed) redirect(access.redirectHref ?? "/account/status?relationship=candidate");
  if (!access.accountId || access.activeRole !== "franchise-candidate") redirect("/account/status?relationship=candidate");

  const params = await searchParams;
  const readModel = await getCandidateDecisionReadModel({ role: access.activeRole, accountId: access.accountId });
  const compare = params.compare;
  return (
    <CandidatePortalPage
      readModel={readModel}
      query={getParam(params.q)}
      stage={getParam(params.stage)}
      offerId={getParam(params.offer)}
      compareIds={Array.isArray(compare) ? compare : compare ? [compare] : []}
    />
  );
}
