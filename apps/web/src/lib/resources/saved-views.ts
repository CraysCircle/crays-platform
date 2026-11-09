import { createResourceError, type CraysResourceError } from "@/lib/resources/errors";
import { getResourceDescriptor, isResourceKey } from "@/lib/resources/registry";
import { validateResourceQuery } from "@/lib/resources/query";
import type { ResourceKey, ResourceQuery } from "@/lib/resources/types";
import type { RoleKey } from "@/lib/roles";

export const resourceSavedViewSchemaVersion = 1;
export const resourceSavedViewSchemaKey = "crays.resource-view";

export type ResourceSavedViewDensity = "comfortable" | "compact" | "dense";
export type ResourceSavedViewSharing = "private" | "role" | "team" | "organization";

export type ResourceSavedViewV1 = {
  schema: typeof resourceSavedViewSchemaKey;
  schemaVersion: typeof resourceSavedViewSchemaVersion;
  viewId: string;
  resource: ResourceKey;
  label: string;
  ownerRole: RoleKey;
  sharing: ResourceSavedViewSharing;
  query: ResourceQuery;
  columns: string[];
  density: ResourceSavedViewDensity;
  createdAt: string;
  updatedAt: string;
};

export type SavedViewValidation =
  | { ok: true; view: ResourceSavedViewV1 }
  | { ok: false; error: CraysResourceError };

export function validateSavedView(input: unknown): SavedViewValidation {
  if (!input || typeof input !== "object") {
    return { ok: false, error: createResourceError("validation_failed", "Saved view must be an object.") };
  }

  const view = input as Partial<ResourceSavedViewV1>;
  const fieldErrors: Array<{ field: string; message: string }> = [];

  if (view.schema !== resourceSavedViewSchemaKey) fieldErrors.push({ field: "schema", message: "Unsupported saved-view schema." });
  if (view.schemaVersion !== resourceSavedViewSchemaVersion) fieldErrors.push({ field: "schemaVersion", message: "Unsupported saved-view schema version." });
  if (!view.resource || !isResourceKey(view.resource)) fieldErrors.push({ field: "resource", message: "Resource is not registered." });
  if (!view.viewId) fieldErrors.push({ field: "viewId", message: "View ID is required." });
  if (!view.label) fieldErrors.push({ field: "label", message: "Label is required." });

  const descriptor = view.resource && isResourceKey(view.resource) ? getResourceDescriptor(view.resource) : null;
  if (descriptor && !descriptor.savedViews.enabled) {
    fieldErrors.push({ field: "resource", message: "Saved views are disabled for this resource." });
  }

  if (descriptor && view.sharing && !descriptor.savedViews.shareScopes.includes(view.sharing)) {
    fieldErrors.push({ field: "sharing", message: "Sharing scope is not allowed for this resource." });
  }

  if (descriptor && view.query) {
    const queryValidation = validateResourceQuery(descriptor, view.query);
    if (!queryValidation.ok) fieldErrors.push(...(queryValidation.error.fieldErrors ?? []));
  }

  if (descriptor && view.columns) {
    const fields = new Set(descriptor.fields.map((field) => field.key));
    if (view.columns.length > descriptor.savedViews.maxColumns) {
      fieldErrors.push({ field: "columns", message: `At most ${descriptor.savedViews.maxColumns} columns are allowed.` });
    }

    for (const column of view.columns) {
      if (!fields.has(column)) fieldErrors.push({ field: column, message: "Column is not registered for this resource." });
    }
  }

  if (fieldErrors.length) {
    return {
      ok: false,
      error: createResourceError("validation_failed", "Saved view is invalid for the current resource contract.", { fieldErrors }),
    };
  }

  return { ok: true, view: view as ResourceSavedViewV1 };
}
