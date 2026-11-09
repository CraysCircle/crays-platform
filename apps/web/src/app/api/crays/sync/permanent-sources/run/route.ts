import { requestedPermanentSourceModules, runPermanentSourceSync } from "@/lib/source-sync-orchestrator";
import { type RoleKey } from "@/lib/roles";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance", "deal-manager", "expansion-manager"];

function forbidden(role: RoleKey) {
  return Response.json(
    {
      status: "forbidden",
      role,
      reason: "Permanent source sync requires an internal operating role.",
      boundaries: {
        sourceReadsEnabled: false,
        coreWritesEnabled: false,
        sourceTestDataWritesEnabled: false,
        sourceProductionWritesEnabled: false,
        destructiveSourceApplyEnabled: false,
        bankSendEnabled: false,
        paymentInitiationEnabled: false,
        externalSendingEnabled: false,
        publicReleaseEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
    },
    { status: 403 },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  if (!allowedRoles.includes(role)) return forbidden(role);

  const readModel = await runPermanentSourceSync({
    role,
    modules: requestedPermanentSourceModules(url.searchParams.get("modules")),
    limit: Number(url.searchParams.get("limit") ?? 50),
  });

  return Response.json({
    status: readModel.summary.sourceUnavailable > 0 || readModel.summary.incomplete > 0 ? "partial" : "ready",
    readModel,
    note: "This run reads operational source adapters and persists source maps into Core. It does not execute source production writes, destructive apply, bank sends, payments, external sending or public release.",
  });
}
