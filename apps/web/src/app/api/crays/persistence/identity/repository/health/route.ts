import { getCoreIdentityRepositoryHealth } from "@/db/core-identity-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const health = await getCoreIdentityRepositoryHealth();
  const ready = health.configured && health.missingTables.length === 0;

  return Response.json({
    status: ready ? "ready" : "incomplete",
    repository: "core-identity",
    health,
    secretsReturned: false,
    privateKeysReturned: false,
  }, { status: ready ? 200 : 503 });
}
