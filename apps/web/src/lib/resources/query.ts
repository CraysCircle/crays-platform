import { createResourceError, type CraysResourceError } from "@/lib/resources/errors";
import type { NormalizedResourceQuery, ResourceDescriptor, ResourceFieldDescriptor, ResourceFilter, ResourceQuery, ResourceSort } from "@/lib/resources/types";

export type ResourceValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: CraysResourceError;
    };

const maxFilters = 12;
const maxSorts = 4;

function fieldMap(descriptor: ResourceDescriptor) {
  return new Map(descriptor.fields.map((field) => [field.key, field]));
}

function validateFilter(filter: ResourceFilter, field: ResourceFieldDescriptor): string | null {
  if (!field.filterOperators.includes(filter.operator)) {
    return `Operator ${filter.operator} is not allowed for field ${filter.field}.`;
  }

  if (filter.operator === "isNull") return null;

  if (filter.value === undefined || filter.value === null) {
    return `Filter ${filter.field} requires a value.`;
  }

  if (filter.operator === "in" && !Array.isArray(filter.value)) {
    return `Filter ${filter.field} with operator in requires an array value.`;
  }

  return null;
}

function normalizeSort(descriptor: ResourceDescriptor, sorts: ResourceSort[] | undefined, fields: Map<string, ResourceFieldDescriptor>) {
  const requestedSorts = sorts?.length ? sorts : descriptor.defaultSort;
  const fieldErrors: Array<{ field: string; message: string }> = [];
  const normalized: ResourceSort[] = [];

  if (requestedSorts.length > maxSorts) {
    fieldErrors.push({ field: "sort", message: `At most ${maxSorts} sort fields are allowed.` });
  }

  for (const sort of requestedSorts.slice(0, maxSorts)) {
    const field = fields.get(sort.field);

    if (!field) {
      fieldErrors.push({ field: sort.field, message: "Sort field is not registered for this resource." });
      continue;
    }

    if (!field.sortable) {
      fieldErrors.push({ field: sort.field, message: "Field is not sortable for this resource." });
      continue;
    }

    normalized.push({ field: sort.field, direction: sort.direction });
  }

  if (!normalized.some((sort) => sort.field === descriptor.stableTieBreaker)) {
    normalized.push({ field: descriptor.stableTieBreaker, direction: "asc" });
  }

  return { normalized, fieldErrors };
}

export function validateResourceQuery(
  descriptor: ResourceDescriptor,
  query: ResourceQuery = {},
): ResourceValidationResult<NormalizedResourceQuery> {
  const fields = fieldMap(descriptor);
  const fieldErrors: Array<{ field: string; message: string }> = [];
  const filters = query.filters ?? [];

  if (filters.length > maxFilters) {
    fieldErrors.push({ field: "filters", message: `At most ${maxFilters} filters are allowed.` });
  }

  for (const filter of filters.slice(0, maxFilters)) {
    const field = fields.get(filter.field);

    if (!field) {
      fieldErrors.push({ field: filter.field, message: "Filter field is not registered for this resource." });
      continue;
    }

    const filterError = validateFilter(filter, field);
    if (filterError) fieldErrors.push({ field: filter.field, message: filterError });
  }

  const sortResult = normalizeSort(descriptor, query.sort, fields);
  fieldErrors.push(...sortResult.fieldErrors);

  const limit = query.page?.limit ?? descriptor.pagination.defaultLimit;
  if (!Number.isInteger(limit) || limit < 1 || limit > descriptor.pagination.maxLimit) {
    fieldErrors.push({
      field: "page.limit",
      message: `Limit must be an integer between 1 and ${descriptor.pagination.maxLimit}.`,
    });
  }

  if (query.page?.cursor && query.page.offset !== undefined) {
    fieldErrors.push({ field: "page", message: "Cursor and offset pagination cannot be mixed." });
  }

  if ((descriptor.pagination.mode === "core-offset" || descriptor.pagination.mode === "frappe-offset") && query.page?.cursor) {
    fieldErrors.push({ field: "page.cursor", message: "This resource uses offset pagination; cursor is not accepted." });
  }

  if ((descriptor.pagination.mode === "core-cursor" || descriptor.pagination.mode === "plane-cursor") && query.page?.offset !== undefined) {
    fieldErrors.push({ field: "page.offset", message: "This resource uses cursor pagination; offset is not accepted." });
  }

  const requestedFields = query.fields ?? descriptor.fields.filter((field) => field.listVisible).map((field) => field.key);
  const selectedFields: string[] = [];
  for (const requestedField of requestedFields) {
    const field = fields.get(requestedField);

    if (!field) {
      fieldErrors.push({ field: requestedField, message: "Requested field is not registered for this resource." });
      continue;
    }

    if (!field.clientSelectable) {
      fieldErrors.push({ field: requestedField, message: "Requested field is not selectable by clients." });
      continue;
    }

    selectedFields.push(requestedField);
  }

  if (descriptor.schemaStatus === "requires-discovery" && descriptor.pagination.mode === "twenty-discovery-required") {
    fieldErrors.push({
      field: "resource",
      message: "This resource requires deployed-source discovery before list queries can be translated.",
    });
  }

  if (fieldErrors.length) {
    return {
      ok: false,
      error: createResourceError("invalid_query", "Resource query is not valid for this CRAYS resource contract.", {
        fieldErrors,
      }),
    };
  }

  return {
    ok: true,
    value: {
      filters,
      sort: sortResult.normalized,
      page: {
        cursor: query.page?.cursor,
        offset: query.page?.offset,
        limit,
      },
      fields: selectedFields,
      search: query.search,
      viewId: query.viewId,
    },
  };
}
