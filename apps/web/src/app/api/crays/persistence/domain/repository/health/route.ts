import { getCoreDomainRepositoryHealth } from "@/db/core-domain-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const health = await getCoreDomainRepositoryHealth();
  const ready = health.configured && health.missingTables.length === 0 && health.rlsNotEnabled.length === 0 && health.rlsNotForced.length === 0;

  return Response.json({
    status: ready ? "ready" : "incomplete",
    repository: "core-domain",
    health,
    liveBusinessDataReturned: false,
    secretsReturned: false,
    privateKeysReturned: false,
  }, { status: ready ? 200 : 503 });
}
