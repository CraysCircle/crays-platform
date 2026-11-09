import { getCorePgPool } from "@/db/client";
import {
  persistCoreCommerceConsequence,
  type CoreCommerceConsequencePool,
} from "@/db/core-commerce-consequence-repository";
import {
  parseCoreCommerceSourceCommand,
  readBoundedJson,
  resolveCoreCommerceSourceBinding,
} from "@/lib/member-commerce/core-commerce-consequence-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const binding = resolveCoreCommerceSourceBinding(request);
  if (!binding) {
    return json(403, { status: "DENIED", code: "CORE_COMMERCE_SOURCE_AUTHORITY_DENIED" });
  }

  let command;
  try {
    command = parseCoreCommerceSourceCommand(
      await readBoundedJson(request),
      binding,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "CORE_COMMERCE_SOURCE_COMMAND_INVALID";
    return json(code === "CORE_COMMERCE_SOURCE_AUTHORITY_DENIED" ? 403 : 400, {
      status: "DENIED",
      code,
    });
  }

  try {
    const persisted = await persistCoreCommerceConsequence(
      getCorePgPool() as CoreCommerceConsequencePool,
      command,
    );
    return json(persisted.replayed ? 200 : 201, {
      status: persisted.replayed ? "REPLAYED" : "RECORDED",
      consequenceId: command.consequenceId,
      deliveryId: persisted.deliveryRecord.deliveryId,
      sourceRecordSha256: persisted.sourceRecordSha256,
      deliveryState: persisted.deliveryState,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CORE_COMMERCE_SOURCE_PERSISTENCE_FAILED";
    if (code === "CORE_COMMERCE_CONSEQUENCE_REPLAY_CONFLICT") {
      return json(409, { status: "CONFLICT", code });
    }
    return json(503, { status: "UNAVAILABLE", code: "CORE_COMMERCE_SOURCE_PERSISTENCE_FAILED" });
  }
}
