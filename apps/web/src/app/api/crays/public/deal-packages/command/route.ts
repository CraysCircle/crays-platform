import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import type { ResourceCommandReceipt } from "@/lib/resources";
import type { RoleKey } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const publicPublicationRoles = new Set<RoleKey>(["reviewer", "admin", "crays-management"]);
const allowedOperations = new Set<ResourceCommandReceipt["operation"]>(["publish", "update", "unpublish"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function commandId(prefix: string) {
  return `core_cmd_${prefix}_public_deal_${crypto.randomUUID().replaceAll("-", "")}`;
}

function receipt(input: {
  commandId: string;
  operation: ResourceCommandReceipt["operation"];
  status: ResourceCommandReceipt["status"];
  message: string;
  gateReason: string;
}): ResourceCommandReceipt {
  return {
    status: input.status,
    commandId: input.commandId,
    resource: "public-deal-packages",
    operation: input.operation,
    acceptedAt: new Date().toISOString(),
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    auditRequired: true,
    message: input.message,
    gate: { key: "OPEN_DEV_PUBLIC_DEAL_PUBLICATION_APPLY", reason: input.gateReason },
  };
}

export async function POST(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const body = await request.json().catch(() => null);
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const operation = text(input.operation) as ResourceCommandReceipt["operation"];

  if (!allowedOperations.has(operation)) {
    return Response.json(
      {
        status: "validation_failed",
        receipt: receipt({
          commandId: commandId("validation"),
          operation: "publish",
          status: "validation_failed",
          message: "Public deal package command requires operation publish, update or unpublish.",
          gateReason: "CRAYS Public publication commands are validated before any apply gate can be considered.",
        }),
        publishApplyEnabled: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 400 },
    );
  }

  if (!publicPublicationRoles.has(context.role)) {
    return Response.json(
      {
        status: "forbidden",
        receipt: receipt({
          commandId: commandId("blocked"),
          operation,
          status: "forbidden",
          message: "This role cannot stage Public Deal publication commands.",
          gateReason: "Public publication requires Reviewer, Admin or CRAYS Management authority.",
        }),
        publishApplyEnabled: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      { status: 403 },
    );
  }

  return Response.json({
    status: "gated",
    receipt: receipt({
      commandId: commandId("gated"),
      operation,
      status: "gated",
      message: "Public Deal package publication command was staged for CRAYS review only. Publish/update/unpublish apply remains closed.",
      gateReason: "OPEN_DEV_PUBLIC_DEAL_PUBLICATION_APPLY must be explicitly opened before any public publication mutation can apply.",
    }),
    publishApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    targetApplyEnabled: false,
  });
}
