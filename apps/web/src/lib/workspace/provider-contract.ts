import type { ResourceFieldType, ResourceKey, ResourceOperation, ResourcePaginationMode, ResourceSchemaStatus } from "@/lib/resources";
import type { RoleKey } from "@/lib/roles";

export type CraysWorkspaceAuthorityDto = {
  role: RoleKey;
  tenantId: string;
  authoritySource: string;
  reviewPersona: {
    requestedRole: RoleKey | null;
    effectiveRole: RoleKey;
    allowed: boolean;
    reason: string;
    auditRequired: true;
  };
};

export type CraysWorkspaceFieldDto = {
  key: string;
  label: string;
  type: ResourceFieldType;
  nullable: boolean;
  public: boolean;
  listVisible: boolean;
  detailVisible: boolean;
  clientSelectable: boolean;
  sortable: boolean;
};

export type CraysWorkspaceResourceDto = {
  name: ResourceKey;
  label: string;
  description: string;
  schemaStatus: ResourceSchemaStatus;
  idField: string;
  supportedOperations: ResourceOperation[];
  fields: CraysWorkspaceFieldDto[];
  pagination: Pick<{
    mode: ResourcePaginationMode;
    defaultLimit: number;
    maxLimit: number;
    supportsPrevious: boolean;
    totalReliable: boolean;
  }, "mode" | "defaultLimit" | "maxLimit" | "supportsPrevious" | "totalReliable">;
  savedViews: {
    enabled: boolean;
    maxColumns: number;
  };
};

export type CraysWorkspaceSessionDto = {
  status: "ready" | "forbidden";
  authority: CraysWorkspaceAuthorityDto;
  identity: {
    authenticated: boolean;
    displayName: string;
    accountId: string | null;
  };
  capabilities: string[];
  resources: CraysWorkspaceResourceDto[];
  queryClient: {
    hydratedAt: string;
    duplicateFetchOnMount: false;
  };
  sideEffects: {
    externalSendingEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    targetApplyEnabled: false;
    destructiveApplyEnabled: false;
    paymentInitiationEnabled: false;
    bankSendEnabled: false;
    financePostingEnabled: false;
    uploadsEnabled: false;
    liveAiExecutionEnabled: false;
  };
  browserBoundary: {
    coreBffOnly: true;
    vendorRequestsAllowed: false;
    vendorCredentialsExposed: false;
    nativeSourceModelsExposed: false;
  };
};

export type CraysResourceQueryRequest = {
  resource: string;
  id?: string | number;
  query?: unknown;
};

export type CraysResourceQueryResponse<TRecord = Record<string, unknown>> = {
  status: "ready" | "forbidden" | "invalid_query" | "not_configured";
  resource: ResourceKey;
  data: TRecord[];
  total: number;
  pageInfo: {
    limit: number;
    offset?: number;
    nextCursor?: string;
    previousCursor?: string;
    totalReliable: boolean;
  };
  message: string;
  asOf: string;
};
