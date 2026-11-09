import type { RoleKey } from "@/lib/roles";
import { getBackOfficeOperationalSourceSlice } from "@/lib/back-office-operational-source-adapter";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedRoles: RoleKey[] = [
  "admin",
  "crays-management",
  "reviewer",
  "finance",
  "deal-manager",
  "franchise-partner",
  "studio-manager",
];

function forbidden(role: RoleKey) {
  return Response.json(
    {
      status: "forbidden",
      role,
      reason: "ERP source records require a scoped internal or operating finance role.",
      secretsReturned: false,
      privateKeysReturned: false,
    },
    { status: 403 },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  if (!allowedRoles.includes(role)) return forbidden(role);

  const readModel = await getBackOfficeOperationalSourceSlice({ limit: Number(url.searchParams.get("limit") ?? 35) });
  const unavailable = readModel.source.connection === "unavailable";

  return Response.json(
    {
      status: unavailable ? "source_unavailable" : "ready",
      role,
      readModel,
      boundaries: {
        liveReadsEnabled: readModel.capabilities.liveReads,
        financeDraftWritesEnabled: false,
        accountingExportsEnabled: false,
        bankSendsEnabled: false,
        paymentInitiationEnabled: false,
        sourceUiEmbedded: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
    },
    { status: unavailable ? 503 : 200 },
  );
}
