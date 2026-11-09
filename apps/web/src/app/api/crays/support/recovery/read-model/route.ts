import { getSupportRecoveryReadModel } from "@/db/support-recovery-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) { const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role; const readModel = await getSupportRecoveryReadModel(role);
  if (!readModel.access.allowed) return Response.json({ status: readModel.access.level === "release_blocked" ? "release_blocked" : "forbidden", readModel, externalSendingEnabled: false, refundExecutionEnabled: false, paymentInitiationEnabled: false, uploadsEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false, note: readModel.access.reason }, { status: readModel.access.level === "release_blocked" ? 423 : 403 });
  return Response.json({ status: "ready", readModel, externalSendingEnabled: false, refundExecutionEnabled: false, paymentInitiationEnabled: false, financePostingEnabled: false, uploadsEnabled: false, privatePreviewEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false, stakeholderReleaseEnabled: false, secretsReturned: false, privateKeysReturned: false, note: "Support Recovery returns role-scoped Core/source-map records and guarded internal command drafts only. No message, refund, payment, upload or apply is executed." });
}
