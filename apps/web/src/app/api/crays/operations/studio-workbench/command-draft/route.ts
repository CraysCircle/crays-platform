import { parseOperationsStudioActionCommandInput, stageOperationsStudioActionCommand } from "@/db/core-command-write-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedRoles = new Set(["studio-manager", "franchise-partner", "finance", "crays-management", "admin"]);

export async function POST(request: Request) {
  try {
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
    if (!allowedRoles.has(role)) {
      return Response.json(
        {
          status: "forbidden",
          error: "This role cannot stage studio operations action drafts.",
          sourceWritesEnabled: false,
          syncWritesEnabled: false,
          toolApplyEnabled: false,
          paymentInitiationEnabled: false,
          financeWritesEnabled: false,
          externalSendingEnabled: false,
        },
        { status: 403 },
      );
    }

    if (request.headers.get("x-crays-dev-confirm") !== "stage-studio-operations-command") {
      return Response.json(
        {
          status: "confirmation_required",
          error: "Missing studio operations command confirmation header.",
          sourceWritesEnabled: false,
          syncWritesEnabled: false,
          toolApplyEnabled: false,
          paymentInitiationEnabled: false,
          financeWritesEnabled: false,
          externalSendingEnabled: false,
        },
        { status: 428 },
      );
    }

    const input = parseOperationsStudioActionCommandInput(await request.json().catch(() => ({})));
    const result = await stageOperationsStudioActionCommand({ ...input, actorRole: role as typeof input.actorRole });

    return Response.json({
      status: result.created ? "staged" : "already_staged",
      result,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      paymentInitiationEnabled: false,
      financeWritesEnabled: false,
      externalSendingEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Studio operations command draft failed.",
        sourceWritesEnabled: false,
        syncWritesEnabled: false,
        toolApplyEnabled: false,
        paymentInitiationEnabled: false,
        financeWritesEnabled: false,
        externalSendingEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 500 },
    );
  }
}
