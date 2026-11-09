import type { RoleKey } from "@/lib/roles";
import { getProjectOperationalSourceRuntimeState, getProjectOperationalSourceSlice } from "@/lib/project-operational-source-adapter";
import { localEngineErrorHttpStatus, safeLocalEngineError } from "@/lib/local-engine-runtime";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedRoles: RoleKey[] = [
  "admin",
  "crays-management",
  "reviewer",
  "deal-manager",
  "expansion-manager",
  "franchise-partner",
  "studio-manager",
];

function forbidden(role: RoleKey) {
  return Response.json(
    {
      status: "forbidden",
      role,
      reason: "Project source records require a scoped delivery role.",
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
    const readModel = await getProjectOperationalSourceSlice({ limit: Number(url.searchParams.get("limit") ?? 25) });
    return Response.json({
      status: "ready",
      role,
      readModel,
      boundaries: {
        liveReadsEnabled: true,
        workItemDraftCreateEnabled: readModel.capabilities.workItemDraftCreate,
        destructiveActionsEnabled: false,
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
        source: getProjectOperationalSourceRuntimeState(),
        error: safeLocalEngineError(error),
        boundaries: {
          liveReadsEnabled: true,
          workItemDraftCreateEnabled: false,
          destructiveActionsEnabled: false,
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
