import { z } from "zod";
import { isOperationalResourceKey, type OperationalMutationOperation } from "./operational-record-policy";

const fieldName = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const recordId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

const changesSchema = z.record(z.string(), z.unknown()).superRefine((changes, context) => {
  const entries = Object.entries(changes);
  if (entries.length > 100) {
    context.addIssue({ code: "custom", message: "A mutation may change at most 100 fields." });
  }

  for (const [key] of entries) {
    if (!fieldName.test(key) || ["__proto__", "prototype", "constructor"].includes(key)) {
      context.addIssue({ code: "custom", message: `Invalid field name: ${key}.` });
    }
  }
});

const mutationSchema = z.object({
  resource: z.string().min(1).refine(isOperationalResourceKey, "Resource has no CRAYS-owned mutation policy."),
  operation: z.enum(["create", "update", "archive", "restore", "delete"]),
  recordId: z.string().regex(recordId).optional(),
  expectedVersion: z.number().int().positive().optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
  reason: z.string().trim().min(3).max(500),
  changes: changesSchema.default({}),
}).strict().superRefine((input, context) => {
  if (input.operation === "create" && input.expectedVersion !== undefined) {
    context.addIssue({ code: "custom", path: ["expectedVersion"], message: "Create must not include expectedVersion." });
  }
  if (input.operation !== "create" && !input.recordId) {
    context.addIssue({ code: "custom", path: ["recordId"], message: "recordId is required for this operation." });
  }
  if (input.operation !== "create" && input.expectedVersion === undefined) {
    context.addIssue({ code: "custom", path: ["expectedVersion"], message: "expectedVersion is required for this operation." });
  }
  if (["archive", "restore", "delete"].includes(input.operation) && Object.keys(input.changes).length) {
    context.addIssue({ code: "custom", path: ["changes"], message: `${input.operation} does not accept field changes.` });
  }
  if (["create", "update"].includes(input.operation) && Object.keys(input.changes).length === 0) {
    context.addIssue({ code: "custom", path: ["changes"], message: `${input.operation} requires at least one field change.` });
  }
});

export type OperationalMutationInput = z.infer<typeof mutationSchema> & {
  operation: OperationalMutationOperation;
};

export type OperationalMutationValidation =
  | { ok: true; input: OperationalMutationInput }
  | { ok: false; issues: Array<{ path: string; message: string }> };

export function validateOperationalMutation(value: unknown): OperationalMutationValidation {
  const result = mutationSchema.safeParse(value);
  if (result.success) return { ok: true, input: result.data as OperationalMutationInput };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  };
}
