import { getBankPackageReadiness } from "@/db/bank-package-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getBankPackageReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: readModel.liveBankPackageRecordsReturned,
      note: readModel.access.allowed
        ? "This endpoint returns bank package readiness only. It does not create packages, release lender files, start regulated checks, return Candidate data, upload files or call providers."
        : "Bank package readiness requires Deal Manager, Finance, Bank Partner or review scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
