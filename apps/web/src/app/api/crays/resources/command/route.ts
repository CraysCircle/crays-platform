import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { createCommandReceipt, validateCommandEnvelope } from "@/lib/resources/commands";
import { canUseCraysResource } from "@/lib/workspace/server-access";

export async function POST(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const input = await request.json().catch(() => null);
  const validation = validateCommandEnvelope(input);

  if (!validation.ok) {
    return Response.json({
      status: "validation_failed",
      error: validation.error,
      targetApplyEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
    }, { status: 422 });
  }

  const access = canUseCraysResource(context, validation.envelope.resource, validation.envelope.operation);
  if (!access.can) {
    const receipt = createCommandReceipt(
      validation.envelope,
      "forbidden",
      access.reason,
      { gate: { key: "server_access_denied", reason: access.reason } },
    );

    return Response.json({
      status: "forbidden",
      receipt,
      message: access.reason,
    }, { status: 403 });
  }

  const receipt = createCommandReceipt(
    validation.envelope,
    "gated",
    "Command envelope accepted for audit, but source writes, sync apply, tool apply and target apply remain closed.",
    { gate: { key: "block75_apply_closed", reason: "Block 75 does not execute productive mutations." } },
  );

  return Response.json({
    status: "gated",
    receipt,
    message: receipt.message,
  });
}
