import { validateCommandEnvelope } from "@/lib/resources/commands";
import { listResourceDescriptors } from "@/lib/resources/registry";
import { validateResourceQuery } from "@/lib/resources/query";
import { validateSavedView } from "@/lib/resources/saved-views";
import { toSourcePagination } from "@/lib/resources/pagination";
import type { ResourceDescriptor, ResourceKey, ResourceQuery } from "@/lib/resources/types";
import type { RoleKey } from "@/lib/roles";

const internalContractRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

function summarizeResource(descriptor: ResourceDescriptor) {
  return {
    key: descriptor.key,
    label: descriptor.label,
    sourceSystem: descriptor.sourceSystem,
    schemaStatus: descriptor.schemaStatus,
    tenantScope: descriptor.tenantScope,
    idField: descriptor.idField,
    requiredReadPermission: descriptor.requiredReadPermission,
    supportedOperations: descriptor.supportedOperations,
    pagination: descriptor.pagination,
    savedViews: descriptor.savedViews,
    fieldCount: descriptor.fields.length,
    publicFieldCount: descriptor.fields.filter((field) => field.public).length,
    selectableFieldCount: descriptor.fields.filter((field) => field.clientSelectable).length,
    filterableFields: descriptor.fields.filter((field) => field.filterOperators.length > 0).map((field) => field.key),
    sortableFields: descriptor.fields.filter((field) => field.sortable).map((field) => field.key),
    provenance: descriptor.provenance,
    cache: descriptor.cache,
  };
}

function getDescriptorOrThrow(resource: ResourceKey) {
  const descriptor = listResourceDescriptors().find((item) => item.key === resource);
  if (!descriptor) throw new Error(`Missing descriptor ${resource}`);
  return descriptor;
}

function queryCase(label: string, resource: ResourceKey, query: ResourceQuery) {
  const descriptor = getDescriptorOrThrow(resource);
  const validation = validateResourceQuery(descriptor, query);

  return {
    label,
    resource,
    expected: label.startsWith("valid") ? "accepted" : "rejected",
    status: validation.ok ? "accepted" : "rejected",
    errorCode: validation.ok ? null : validation.error.code,
    fieldErrors: validation.ok ? [] : validation.error.fieldErrors ?? [],
    sourcePagination: validation.ok ? toSourcePagination(descriptor, validation.value) : null,
  };
}

function savedViewCases() {
  const now = new Date().toISOString();

  return [
    {
      label: "valid saved view",
      result: validateSavedView({
        schema: "crays.resource-view",
        schemaVersion: 1,
        viewId: "view_block74_valid",
        resource: "prepared-offers",
        label: "Reviewed Munich offers",
        ownerRole: "reviewer",
        sharing: "role",
        query: {
          filters: [{ field: "status", operator: "eq", value: "reviewed" }],
          sort: [{ field: "updatedAt", direction: "desc" }],
          page: { limit: 25, offset: 0 },
        },
        columns: ["offerId", "title", "city", "status", "updatedAt"],
        density: "compact",
        createdAt: now,
        updatedAt: now,
      }),
    },
    {
      label: "invalid saved view unknown column",
      result: validateSavedView({
        schema: "crays.resource-view",
        schemaVersion: 1,
        viewId: "view_block74_invalid",
        resource: "prepared-offers",
        label: "Leaky offer view",
        ownerRole: "reviewer",
        sharing: "role",
        query: { page: { limit: 25, offset: 0 } },
        columns: ["offerId", "internalSourcePayload"],
        density: "compact",
        createdAt: now,
        updatedAt: now,
      }),
    },
  ].map((item) => ({
    label: item.label,
    status: item.result.ok ? "accepted" : "rejected",
    errorCode: item.result.ok ? null : item.result.error.code,
    fieldErrors: item.result.ok ? [] : item.result.error.fieldErrors ?? [],
  }));
}

export function getResourceContractReadModel(role: RoleKey) {
  const accessAllowed = internalContractRoles.includes(role);
  const descriptors = listResourceDescriptors();
  const queryValidationCases = [
    queryCase("valid core offset query", "prepared-offers", {
      filters: [{ field: "status", operator: "eq", value: "reviewed" }],
      sort: [{ field: "updatedAt", direction: "desc" }],
      page: { limit: 25, offset: 0 },
    }),
    queryCase("invalid unknown field query", "prepared-offers", {
      filters: [{ field: "privateBankNotes", operator: "contains", value: "leak" }],
      page: { limit: 25, offset: 0 },
    }),
    queryCase("invalid unsupported operator query", "prepared-offers", {
      filters: [{ field: "status", operator: "contains", value: "review" }],
      page: { limit: 25, offset: 0 },
    }),
    queryCase("valid Plane cursor query", "project-work-items", {
      filters: [{ field: "stateKey", operator: "eq", value: "in-review" }],
      page: { limit: 50, cursor: "plane_cursor_demo" },
    }),
    queryCase("invalid Plane offset query", "project-work-items", {
      page: { limit: 50, offset: 0 },
    }),
    queryCase("valid Frappe offset query", "erp-documents", {
      filters: [{ field: "doctype", operator: "eq", value: "Sales Invoice" }],
      page: { limit: 20, offset: 40 },
    }),
    queryCase("invalid Twenty undiscovered query", "crm-companies", {
      filters: [{ field: "displayName", operator: "contains", value: "CRAYS" }],
      page: { limit: 25 },
    }),
  ];

  return {
    access: {
      allowed: accessAllowed,
      role,
      level: accessAllowed ? "internal_contract" : "forbidden",
    },
    summary: {
      resources: descriptors.length,
      fields: descriptors.reduce((total, descriptor) => total + descriptor.fields.length, 0),
      coreOwnedResources: descriptors.filter((descriptor) => descriptor.schemaStatus === "core-owned").length,
      discoveryRequiredResources: descriptors.filter((descriptor) => descriptor.schemaStatus === "requires-discovery").length,
      publicResources: descriptors.filter((descriptor) => descriptor.sourceSystem === "crays-public").length,
      savedViewEnabledResources: descriptors.filter((descriptor) => descriptor.savedViews.enabled).length,
    },
    resources: accessAllowed ? descriptors.map(summarizeResource) : [],
    queryValidationCases: accessAllowed ? queryValidationCases : [],
    savedViewValidationCases: accessAllowed ? savedViewCases() : [],
    commandEnvelopeCases: accessAllowed
      ? [
          validateCommandEnvelope({
            resource: "prepared-offers",
            operation: "review",
            changes: { status: "reviewed" },
            idempotencyKey: "block74-valid-review",
          }),
          validateCommandEnvelope({
            resource: "prepared-offers",
            operation: "wire-money",
            changes: { amount: 1000000 },
            idempotencyKey: "short",
          }),
        ].map((result, index) => ({
          label: index === 0 ? "valid command envelope" : "invalid command envelope",
          status: result.ok ? "accepted" : "rejected",
          errorCode: result.ok ? null : result.error.code,
          fieldErrors: result.ok ? [] : result.error.fieldErrors ?? [],
        }))
      : [],
    errorTaxonomy: [
      "unauthenticated",
      "forbidden",
      "not_found",
      "invalid_query",
      "validation_failed",
      "conflict",
      "rate_limited",
      "source_unavailable",
      "partial_data",
      "operation_gated",
      "unexpected",
    ],
    boundaries: {
      browserVendorRequestsEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      targetApplyEnabled: false,
      destructiveApplyEnabled: false,
      externalSendingEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      releaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
