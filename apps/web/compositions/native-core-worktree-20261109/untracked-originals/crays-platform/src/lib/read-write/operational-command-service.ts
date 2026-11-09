import { randomUUID } from "node:crypto";
import { mutateOperationalRecord } from "@/db/operational-record-write-repository";
import type { CraysRouteContext } from "@/lib/dal/server-trust";
import { evaluateOperationalMutationPolicy } from "./operational-record-policy";
import { validateOperationalMutation } from "./operational-record-schema";

export type OperationalCommandOutcome =
  | { kind: "forbidden"; correlationId: string; message: string; deniedFields: string[] }
  | { kind: "validation-error"; correlationId: string; issues: Array<{ path: string; message: string }> }
  | { kind: "executed"; correlationId: string; result: Awaited<ReturnType<typeof mutateOperationalRecord>> };

export async function executeOperationalCommand(input: {
  context: CraysRouteContext;
  rawMutation: unknown;
  correlationId?: string | null;
  fallbackReason?: string;
}): Promise<OperationalCommandOutcome> {
  const correlationId = input.correlationId?.trim() || `request_${randomUUID()}`;
  if (input.context.authoritySource === "anonymous-fail-closed") {
    return { kind: "forbidden", correlationId, message: "A mapped or explicitly authorized local CRAYS identity is required.", deniedFields: [] };
  }
  const rawMutation = input.fallbackReason && input.rawMutation && typeof input.rawMutation === "object" && !Array.isArray(input.rawMutation) && !("reason" in input.rawMutation)
    ? { ...input.rawMutation, reason: input.fallbackReason }
    : input.rawMutation;
  const parsed = validateOperationalMutation(rawMutation);
  if (!parsed.ok) return { kind: "validation-error", correlationId, issues: parsed.issues };
  const access = evaluateOperationalMutationPolicy({
    resource: parsed.input.resource,
    operation: parsed.input.operation,
    role: input.context.role,
    changedFields: Object.keys(parsed.input.changes),
  });
  if (!access.allowed) return { kind: "forbidden", correlationId, message: access.reason, deniedFields: access.deniedFields };
  const actorId = input.context.session.account?.id ?? `review:${input.context.role}`;
  return {
    kind: "executed",
    correlationId,
    result: await mutateOperationalRecord({
      mutation: parsed.input,
      tenantId: input.context.tenantId,
      actorId,
      actorRole: input.context.role,
      correlationId,
    }),
  };
}
