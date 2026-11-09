import type { PermissionKey, PermissionScope } from "@/lib/permissions";

export const resourceKeys = [
  "prepared-offers",
  "deals",
  "properties",
  "bank-packages",
  "workflow-events",
  "core-command-requests",
  "workbench-saved-views",
  "public-deal-packages",
  "crm-companies",
  "crm-people",
  "crm-leads",
  "crm-opportunities",
  "crm-emails",
  "crm-calendar-events",
  "crm-tasks",
  "crm-activities",
  "project-work-items",
  "project-states",
  "project-comments",
  "erp-documents",
] as const;

export type ResourceKey = (typeof resourceKeys)[number];

export type ResourceSourceSystem = "crays-core" | "crays-public" | "twenty" | "plane" | "frappe";

export type ResourceSchemaStatus = "core-owned" | "verified" | "requires-discovery";

export type ResourceFieldType =
  | "id"
  | "text"
  | "long-text"
  | "number"
  | "money"
  | "boolean"
  | "date"
  | "datetime"
  | "enum"
  | "relation"
  | "user"
  | "file"
  | "location"
  | "json";

export type ResourcePiiClassification = "none" | "business" | "personal" | "financial" | "secret";

export type ResourceFilterOperator =
  | "eq"
  | "neq"
  | "in"
  | "contains"
  | "startsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "isNull";

export type ResourceSortDirection = "asc" | "desc";

export type ResourcePaginationMode =
  | "core-offset"
  | "core-cursor"
  | "plane-cursor"
  | "frappe-offset"
  | "twenty-discovery-required";

export type ResourceOperation =
  | "list"
  | "get"
  | "create"
  | "update"
  | "transition"
  | "comment"
  | "archive"
  | "restore"
  | "publish"
  | "unpublish"
  | "review";

export type ResourceFieldDescriptor = {
  key: string;
  label: string;
  type: ResourceFieldType;
  nullable: boolean;
  pii: ResourcePiiClassification;
  public: boolean;
  listVisible: boolean;
  detailVisible: boolean;
  clientSelectable: boolean;
  filterOperators: ResourceFilterOperator[];
  sortable: boolean;
  readScopes: PermissionScope[];
  readPermission?: PermissionKey;
  updatePermission?: PermissionKey;
  source: {
    system: ResourceSourceSystem;
    nativeField?: string;
    requiresDiscovery?: boolean;
  };
};

export type ResourceDescriptor = {
  key: ResourceKey;
  label: string;
  description: string;
  sourceSystem: ResourceSourceSystem;
  schemaStatus: ResourceSchemaStatus;
  tenantScope: PermissionScope;
  idField: string;
  requiredReadPermission?: PermissionKey;
  supportedOperations: ResourceOperation[];
  fields: ResourceFieldDescriptor[];
  defaultSort: Array<{ field: string; direction: ResourceSortDirection }>;
  stableTieBreaker: string;
  pagination: {
    mode: ResourcePaginationMode;
    defaultLimit: number;
    maxLimit: number;
    supportsPrevious: boolean;
    totalReliable: boolean;
  };
  savedViews: {
    enabled: boolean;
    shareScopes: Array<"private" | "role" | "team" | "organization">;
    maxColumns: number;
  };
  provenance: {
    exposesNativeIdsToClient: boolean;
    notes: string;
  };
  cache: {
    strategy: "no-store" | "tagged-revalidate" | "session";
    tags: string[];
  };
};

export type ResourceFilter = {
  field: string;
  operator: ResourceFilterOperator;
  value?: unknown;
};

export type ResourceSort = {
  field: string;
  direction: ResourceSortDirection;
};

export type ResourcePageRequest = {
  cursor?: string;
  offset?: number;
  limit: number;
};

export type ResourceQuery = {
  filters?: ResourceFilter[];
  sort?: ResourceSort[];
  page?: ResourcePageRequest;
  fields?: string[];
  search?: string;
  viewId?: string;
};

export type NormalizedResourceQuery = Required<Pick<ResourceQuery, "filters" | "sort">> & {
  page: ResourcePageRequest;
  fields: string[];
  search?: string;
  viewId?: string;
};

export type ResourcePageInfo = {
  nextCursor?: string;
  previousCursor?: string;
  offset?: number;
  limit: number;
  total?: number;
  totalReliable: boolean;
};

export type ResourcePage<TRecord> = {
  data: TRecord[];
  pageInfo: ResourcePageInfo;
  appliedQuery: NormalizedResourceQuery;
  health: "fresh" | "stale" | "partial" | "unavailable";
  asOf: string;
  provenance: {
    resource: ResourceKey;
    sourceSystem: ResourceSourceSystem;
    schemaStatus: ResourceSchemaStatus;
  };
};
