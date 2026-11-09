import { parseCrmActivityCommandInput, stageCrmActivityCommand } from "@/db/core-command-write-repository";
import { assertCoreCommandWriteAllowed } from "@/lib/core-command-write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = assertCoreCommandWriteAllowed(request, process.env, "stage-crm-activity-command");
  if (!guard.allowed) return guard.response;

  try {
    const input = parseCrmActivityCommandInput(await request.json());
    const result = await stageCrmActivityCommand(input);

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
      releaseActionsEnabled: false,
      liveCommandRecordsReturned: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: "CRM activity command was staged in CRAYS Core only. No CRM apply, sync apply, upload, external send, finance action, bank action or release was executed.",
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid request.",
        toolApplyEnabled: false,
        syncWritesEnabled: false,
        sourceWritesEnabled: false,
        externalSendingEnabled: false,
        liveCommandRecordsReturned: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 400 },
    );
  }
}
