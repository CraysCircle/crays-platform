import type { RoleKey } from "@/lib/roles";
import { getLocationIntelligenceCapabilityMap } from "@/lib/location-intelligence-source-adapter";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];

function forbidden(role: RoleKey) {
  return Response.json(
    {
      status: "forbidden",
      role,
      reason: "Location Intelligence capabilities require an internal site, deal or review role.",
      secretsReturned: false,
      privateKeysReturned: false,
    },
    { status: 403 },
  );
}

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  if (!allowedRoles.includes(role)) return forbidden(role);

  return Response.json({
    status: "ready",
    role,
    readModel: getLocationIntelligenceCapabilityMap(),
    boundaries: {
      liveReadsEnabled: true,
      sourceWritesEnabled: false,
      externalSendingEnabled: false,
      sourceUiEmbedded: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  });
}
