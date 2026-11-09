import type { RoleKey } from "@/lib/roles";
import { getCrmOperationalSourceSlice } from "@/lib/crm-operational-source-adapter";
import { localEngineErrorHttpStatus, safeLocalEngineError } from "@/lib/local-engine-runtime";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager"];

function forbidden(role: RoleKey) {
  return Response.json(
    {
      status: "forbidden",
      role,
      reason: "CRM source records require an internal relationship role.",
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

  try {
    const limit = Number(url.searchParams.get("limit") ?? 40);
    const includeDemo = url.searchParams.get("includeDemo") === "true" && ["admin", "crays-management"].includes(role);
    const readModel = await getCrmOperationalSourceSlice({ limit, includeDemo });
    return Response.json({
      status: "ready",
      role,
      readModel,
      boundaries: {
        liveReadsEnabled: true,
        sourceWritesEnabled: false,
        externalSendingEnabled: false,
        sourceUiEmbedded: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: "source_unavailable",
        role,
        error: safeLocalEngineError(error),
        boundaries: {
          liveReadsEnabled: true,
          sourceWritesEnabled: false,
          externalSendingEnabled: false,
          sourceUiEmbedded: false,
          secretsReturned: false,
          privateKeysReturned: false,
        },
      },
      { status: localEngineErrorHttpStatus(error) },
    );
  }
}
