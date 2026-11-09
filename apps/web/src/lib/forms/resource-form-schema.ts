import { z } from "zod";

import type { ResourceCommandEnvelope, ResourceFieldDescriptor, ResourceKey, ResourceOperation } from "@/lib/resources";

export type ResourceFormValues = Record<string, unknown>;

export type ResourceFormOperation = Exclude<ResourceOperation, "list" | "get">;

export type CreateResourceCommandInput = {
  resource: ResourceKey;
  operation: ResourceFormOperation;
  values: ResourceFormValues;
  id?: string;
  expectedVersion?: string;
  clientRequestId?: string;
  idempotencyKey?: string;
};

function emptyStringToUndefined(value: unknown) {
  return value === "" ? undefined : value;
}

function nullableField(schema: z.ZodTypeAny, field: ResourceFieldDescriptor) {
  const withEmpty = z.preprocess(emptyStringToUndefined, schema);
  return field.nullable ? withEmpty.optional().nullable() : withEmpty;
}

function schemaForField(field: ResourceFieldDescriptor) {
  switch (field.type) {
    case "number":
    case "money":
      return nullableField(z.coerce.number({ error: `${field.label} must be a number.` }), field);
    case "boolean":
      return field.nullable ? z.coerce.boolean().optional().nullable() : z.coerce.boolean();
    case "date":
    case "datetime":
      return nullableField(z.string().min(1, `${field.label} is required.`), field);
    case "json":
      return field.nullable ? z.unknown().optional().nullable() : z.unknown();
    default:
      return nullableField(z.string().min(1, `${field.label} is required.`), field);
  }
}

export function editableResourceFields(fields: ResourceFieldDescriptor[]) {
  return fields.filter((field) => field.clientSelectable && field.type !== "id" && Boolean(field.updatePermission));
}

export function createResourceFormSchema(fields: ResourceFieldDescriptor[]) {
  const shape = fields.reduce<Record<string, z.ZodTypeAny>>((current, field) => {
    current[field.key] = schemaForField(field);
    return current;
  }, {});

  return z.object(shape);
}

export function normalizeResourceFormValues(fields: ResourceFieldDescriptor[], values: ResourceFormValues) {
  return fields.reduce<ResourceFormValues>((current, field) => {
    const value = values[field.key];

    if (value === "" && field.nullable) {
      current[field.key] = null;
      return current;
    }

    current[field.key] = value;
    return current;
  }, {});
}

export function createResourceCommandEnvelope({
  resource,
  operation,
  values,
  id,
  expectedVersion,
  clientRequestId,
  idempotencyKey,
}: CreateResourceCommandInput): ResourceCommandEnvelope<ResourceFormValues> {
  const stableKey = idempotencyKey ?? `crays-form-${resource}-${operation}-${id ?? "new"}-${crypto.randomUUID()}`;

  return {
    resource,
    operation,
    id,
    changes: values,
    idempotencyKey: stableKey,
    expectedVersion,
    clientRequestId,
  };
}
