import { parseLoansChecklistCommandInput, stageLoansChecklistCommand } from "@/db/core-command-write-repository";
import { assertCoreCommandWriteAllowed } from "@/lib/core-command-write-guard";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function closedBoundaries() {
  return {
    toolApplyEnabled: false,
    syncWritesEnabled: false,
    sourceWritesEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    releaseActionsEnabled: false,
    liveCommandRecordsReturned: false,
    secretsReturned: false,
    privateKeysReturned: false,
  } as const;
}

function financeOnlyResponse() {
  return Response.json(
    {
      status: "forbidden",
      writeEnabled: false,
      financeOwned: true,
      reason: "Bank readiness checklist and condition drafts are owned by CRAYS Finance. Other roles consume readiness or review release gates.",
      ...closedBoundaries(),
    },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  if (role !== "finance") return financeOnlyResponse();

  const guard = assertCoreCommandWriteAllowed(request, process.env, "stage-loans-checklist-command");
  if (!guard.allowed) return guard.response;

  try {
    const body = (await request.json()) as unknown;
    const rawRole = body && typeof body === "object" ? (body as Record<string, unknown>).actorRole : null;
    if (rawRole !== "finance") return financeOnlyResponse();

    const input = parseLoansChecklistCommandInput(body);
    const result = await stageLoansChecklistCommand(input);

    return Response.json({
      status: result.created ? "created" : "idempotent_existing",
      writeEnabled: true,
      financeOwned: true,
      result,
      ...closedBoundaries(),
      note: "Finance staged a CRAYS Core bank-readiness command draft. No Loans apply, bank send, payment, lender release, sync apply, external send or finance action was executed.",
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        writeEnabled: false,
        financeOwned: true,
        error: error instanceof Error ? error.message : "Invalid request.",
        ...closedBoundaries(),
      },
      { status: 400 },
    );
  }
}
