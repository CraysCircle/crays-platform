import { getCoreCommandPersistenceReadiness } from "@/db/core-command-persistence-readiness-repository";
import { getCoreCommandPersistenceContract } from "@/lib/core-command-persistence-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const persistence = await getCoreCommandPersistenceReadiness();
  const contract = getCoreCommandPersistenceContract(role, persistence);

  return Response.json(
    {
      status: contract.access.allowed ? (persistence.migrationApplied ? "ready" : "draft_ready") : "forbidden",
      readModel: contract,
      liveCommandRecordsReturned: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      note: contract.access.allowed
        ? "Core command persistence readiness only. Command draft writes, dry-run writes, tool apply, sync apply, uploads, sends, finance actions, bank actions and releases remain disabled."
        : "Core command persistence readiness requires internal control, review or scoped workbench ownership.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
