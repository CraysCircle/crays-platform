import { createResourceError } from "@/lib/resources/errors";
import { getResourceDescriptor, isResourceKey } from "@/lib/resources/registry";
import type { CraysResourceError } from "@/lib/resources/errors";
import type { ResourceKey, ResourceOperation } from "@/lib/resources/types";

export type ResourceCommandEnvelope<TChanges = Record<string, unknown>> = {
  resource: ResourceKey;
  id?: string;
  operation: Exclude<ResourceOperation, "list" | "get">;
  changes: TChanges;
  idempotencyKey: string;
  expectedVersion?: string;
  clientRequestId?: string;
};

export type ResourceCommandStatus = "accepted" | "validation_failed" | "forbidden" | "conflicted" | "gated" | "queued" | "source_unavailable";

export type ResourceCommandReceipt = {
  status: ResourceCommandStatus;
  commandId: string;
  resource: ResourceKey;
  operation: ResourceCommandEnvelope["operation"];
  acceptedAt: string;
  targetApplyEnabled: false;
  sourceWritesEnabled: false;
  syncApplyEnabled: false;
  auditRequired: true;
  message: string;
  fieldErrors?: Array<{ field: string; message: string }>;
  conflict?: { expectedVersion?: string; actualVersion?: string };
  gate?: { key: string; reason: string };
};

export type CommandEnvelopeValidation =
  | { ok: true; envelope: ResourceCommandEnvelope }
  | { ok: false; error: CraysResourceError };

export function validateCommandEnvelope(input: unknown): CommandEnvelopeValidation {
  if (!input || typeof input !== "object") {
    return { ok: false, error: createResourceError("validation_failed", "Command envelope must be an object.") };
  }

  const envelope = input as Partial<ResourceCommandEnvelope>;
  const fieldErrors: Array<{ field: string; message: string }> = [];

  if (!envelope.resource || !isResourceKey(envelope.resource)) {
    fieldErrors.push({ field: "resource", message: "Resource is not registered." });
  }

  const descriptor = envelope.resource && isResourceKey(envelope.resource) ? getResourceDescriptor(envelope.resource) : null;
  if (!envelope.operation) {
    fieldErrors.push({ field: "operation", message: "Operation is required." });
  } else if (!descriptor?.supportedOperations.includes(envelope.operation)) {
    fieldErrors.push({ field: "operation", message: "Operation is not supported by this resource." });
  }

  if (!envelope.idempotencyKey || envelope.idempotencyKey.length < 12) {
    fieldErrors.push({ field: "idempotencyKey", message: "A stable idempotency key of at least 12 characters is required." });
  }

  if (!envelope.changes || typeof envelope.changes !== "object" || Array.isArray(envelope.changes)) {
    fieldErrors.push({ field: "changes", message: "Changes must be an object." });
  }

  if (fieldErrors.length) {
    return {
      ok: false,
      error: createResourceError("validation_failed", "Command envelope is invalid.", { fieldErrors }),
    };
  }

  return { ok: true, envelope: envelope as ResourceCommandEnvelope };
}

export function createCommandReceipt(
  envelope: ResourceCommandEnvelope,
  status: ResourceCommandStatus,
  message: string,
  options: Pick<ResourceCommandReceipt, "fieldErrors" | "conflict" | "gate"> = {},
): ResourceCommandReceipt {
  return {
    status,
    commandId: `core_cmd_${crypto.randomUUID().replaceAll("-", "")}`,
    resource: envelope.resource,
    operation: envelope.operation,
    acceptedAt: new Date().toISOString(),
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    auditRequired: true,
    message,
    fieldErrors: options.fieldErrors,
    conflict: options.conflict,
    gate: options.gate,
  };
}
