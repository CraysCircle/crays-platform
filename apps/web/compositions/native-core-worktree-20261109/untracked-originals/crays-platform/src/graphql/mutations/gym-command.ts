import { executeOperationalCommand } from "@/lib/read-write/operational-command-service";
import type { CraysGraphQLContext } from "../context";
import { canonicalFromOperational, decodeGymNodeId, type GymReadDomainKey } from "../reads/gym-read-model";
import { invalidateGymDomainCache } from "../performance/redis-layer";

const domainResource = {
  CRM: "crm-companies",
  FRANCHISE: "crm-opportunities",
  PROJECT: "project-work-items",
  ERP_FINANCE: "erp-documents",
  DOCUMENTS: "files-documents",
  ANALYTICS: "analytics-reports",
} as const;

const operationValue = { CREATE: "create", UPDATE: "update", ARCHIVE: "archive", RESTORE: "restore" } as const;

function finiteChanges(value: Record<string, unknown> | null | undefined) {
  return Object.fromEntries(Object.entries(value ?? {}).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined));
}

export async function executeGymRecordMutation(args: {
  input: {
    domain: keyof typeof domainResource;
    operation: keyof typeof operationValue;
    recordId?: string | null;
    command: { idempotencyKey: string; expectedVersion?: number | null };
    reason: string;
    changes?: Record<string, unknown> | null;
  };
}, context: CraysGraphQLContext) {
  const { input } = args;
  let rawRecordId: string | undefined;
  if (input.recordId) {
    const decoded = decodeGymNodeId(input.recordId);
    if (!decoded || decoded.domain !== input.domain as GymReadDomainKey) {
      return { node: null, receipt: null, errors: [{ code: "VALIDATION_FAILED", message: "Record ID is invalid for this domain.", field: "recordId" }], conflict: null, replayed: false, correlationId: context.requestId };
    }
    rawRecordId = decoded.rawId;
  }
  const outcome = await executeOperationalCommand({
    context: context.route,
    correlationId: context.requestId,
    rawMutation: {
      resource: domainResource[input.domain],
      operation: operationValue[input.operation],
      ...(rawRecordId ? { recordId: rawRecordId } : {}),
      ...(input.command.expectedVersion == null ? {} : { expectedVersion: input.command.expectedVersion }),
      idempotencyKey: input.command.idempotencyKey,
      reason: input.reason,
      changes: finiteChanges(input.changes),
    },
  });
  if (outcome.kind === "validation-error") return { node: null, receipt: null, errors: outcome.issues.map((issue) => ({ code: "VALIDATION_FAILED", message: issue.message, field: issue.path || null })), conflict: null, replayed: false, correlationId: outcome.correlationId };
  if (outcome.kind === "forbidden") return { node: null, receipt: null, errors: [{ code: "FORBIDDEN", message: outcome.message, field: outcome.deniedFields[0] ?? null }], conflict: null, replayed: false, correlationId: outcome.correlationId };
  const { result } = outcome;
  if (result.status === "not-found") return { node: null, receipt: null, errors: [{ code: "NOT_FOUND", message: "Record is unavailable.", field: null }], conflict: null, replayed: false, correlationId: outcome.correlationId };
  if (result.status === "idempotency-conflict") return { node: null, receipt: null, errors: [{ code: "IDEMPOTENCY_CONFLICT", message: "The idempotency key was already used for a different command.", field: "command.idempotencyKey" }], conflict: null, replayed: false, correlationId: outcome.correlationId };
  if (result.status === "conflict") {
    const conflict = result.expectedVersion == null ? null : { expectedVersion: result.expectedVersion, actualVersion: result.currentVersion ?? 0 };
    return { node: null, receipt: null, errors: conflict ? [] : [{ code: "ALREADY_EXISTS", message: "Record already exists.", field: "recordId" }], conflict, replayed: false, correlationId: outcome.correlationId };
  }
  await invalidateGymDomainCache(context.route.tenantId, input.domain as GymReadDomainKey);
  return {
    node: canonicalFromOperational(input.domain as GymReadDomainKey, result.record!),
    receipt: { commandId: result.eventId!, status: result.replayed ? "IDEMPOTENT_REPLAY" : "SAVED", completedAt: result.record!.updatedAt },
    errors: [], conflict: null, replayed: result.replayed, correlationId: outcome.correlationId,
  };
}
