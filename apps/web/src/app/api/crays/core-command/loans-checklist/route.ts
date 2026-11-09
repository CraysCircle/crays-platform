import { parseLoansChecklistCommandInput, stageLoansChecklistCommand } from "@/db/core-command-write-repository";
import { assertCoreCommandWriteAllowed } from "@/lib/core-command-write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = assertCoreCommandWriteAllowed(request, process.env, "stage-loans-checklist-command");
  if (!guard.allowed) return guard.response;

  try {
    const input = parseLoansChecklistCommandInput(await request.json());
    const result = await stageLoansChecklistCommand(input);

    return Response.json({
      status: result.created ? "created" : "idempotent_existing",
      writeEnabled: true,
      result,
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
      note: "Loans checklist command was staged in CRAYS Core only. No Loans apply, bank send, payment, lender release, sync apply, external send or finance action was executed.",
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid request.",
        toolApplyEnabled: false,
        syncWritesEnabled: false,
        sourceWritesEnabled: false,
        financeActionsEnabled: false,
        bankActionsEnabled: false,
        paymentInitiationEnabled: false,
        releaseActionsEnabled: false,
        liveCommandRecordsReturned: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 400 },
    );
  }
}
