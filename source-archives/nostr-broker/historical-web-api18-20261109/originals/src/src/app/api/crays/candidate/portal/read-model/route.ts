import { getCandidateDecisionReadModel } from "@/db/candidate-decision-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const readModel = await getCandidateDecisionReadModel({
    role: context.role,
    accountId: context.session.account?.id ?? null,
  });
  const status = readModel.access.allowed ? "ready" : context.role === "franchise-candidate" ? "account_required" : "forbidden";

  return Response.json(
    {
      status,
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role: context.role,
      reviewPersona: context.reviewPersona,
      readModel,
      boundaries: readModel.boundaries,
      note: readModel.access.allowed
        ? "Your released opportunities, evidence and next steps are available."
        : "Candidate access requires an active Candidate account.",
    },
    { status: readModel.access.allowed ? 200 : context.role === "franchise-candidate" ? 423 : 403 },
  );
}
