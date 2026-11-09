import { stageCandidateFinancingPrepCommand } from "@/db/candidate-financing-prep-workbench-repository";
import { assertCoreCommandWriteAllowed } from "@/lib/core-command-write-guard";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function POST(request: Request) {
  const guard = assertCoreCommandWriteAllowed(request, process.env, "stage-candidate-financing-prep-command");
  if (!guard.allowed) return guard.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
    const actionKey = cleanText(body.actionKey, "source-of-funds");
    const result = await stageCandidateFinancingPrepCommand({ role, actionKey });
    const statusCode = result.status === "forbidden" ? 403 : result.status === "blocked" ? 409 : 200;

    return Response.json(
      {
        status: result.status,
        writeEnabled: result.status === "created" || result.status === "idempotent_existing",
        result: result.result,
        readModel: result.readModel,
        regulatedChecksStarted: false,
        bankWorkflowStartEnabled: false,
        bankSendEnabled: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        externalSendingEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
        note:
          result.status === "created" || result.status === "idempotent_existing"
            ? "Candidate financing prep staged a Core command draft only. Regulated checks, source apply, bank handoff, bank send and external sending remain closed."
            : "Candidate financing prep command draft could not be staged for this role or case.",
      },
      { status: statusCode },
    );
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid candidate financing prep command.",
        regulatedChecksStarted: false,
        bankWorkflowStartEnabled: false,
        bankSendEnabled: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        externalSendingEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 400 },
    );
  }
}
