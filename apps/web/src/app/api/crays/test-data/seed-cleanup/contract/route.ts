import { getSeedCleanupContract } from "@/lib/seed-cleanup-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getSeedCleanupContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      liveBusinessRecordReturned: false,
      note: "Seed cleanup contract only. It does not import seed data, delete rows, write to a database, call providers, upload files or send externally.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
