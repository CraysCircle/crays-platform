import { parseSyncPreviewCommandInput, stageSyncPreviewCommand } from "@/db/core-command-write-repository";
import { assertCoreCommandWriteAllowed } from "@/lib/core-command-write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = assertCoreCommandWriteAllowed(request, process.env, "stage-sync-preview-command");
  if (!guard.allowed) return guard.response;

  try {
    const input = parseSyncPreviewCommandInput(await request.json());
    const result = await stageSyncPreviewCommand(input);

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
      note: "Sync preview command was staged in CRAYS Core only. No sync apply, source write, tool apply, upload, external send, finance action, bank action, payment or release was executed.",
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid request.",
        toolApplyEnabled: false,
        syncWritesEnabled: false,
        sourceWritesEnabled: false,
        liveCommandRecordsReturned: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 400 },
    );
  }
}
