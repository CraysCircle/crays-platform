import { getCandidatePortalReadModel } from "@/db/candidate-portal-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const readModel = await getCandidatePortalReadModel(context.role);
  const status = readModel.access.allowed ? "ready" : readModel.access.level === "candidate_account_required" ? "account_required" : "forbidden";

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
        ? "Candidate Portal read model returns candidate-safe DTOs, gates and next safe actions only. It does not expose internal fields, candidate-private data from other accounts, bank records, file bodies, provider calls or external sends."
        : "Candidate Portal requires Franchise Candidate scope or an internal review role.",
    },
    { status: readModel.access.allowed ? 200 : readModel.access.level === "candidate_account_required" ? 423 : 403 },
  );
}
