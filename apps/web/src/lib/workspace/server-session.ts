import "server-only";

import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { listResourceDescriptors } from "@/lib/resources";
import type { CraysWorkspaceResourceDto, CraysWorkspaceSessionDto } from "@/lib/workspace/provider-contract";

function toWorkspaceResourceDto(resource: ReturnType<typeof listResourceDescriptors>[number]): CraysWorkspaceResourceDto {
  return {
    name: resource.key,
    label: resource.label,
    description: resource.description,
    schemaStatus: resource.schemaStatus,
    idField: resource.idField,
    supportedOperations: resource.supportedOperations,
    fields: resource.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      nullable: field.nullable,
      public: field.public,
      listVisible: field.listVisible,
      detailVisible: field.detailVisible,
      clientSelectable: field.clientSelectable,
      sortable: field.sortable,
    })),
    pagination: {
      mode: resource.pagination.mode,
      defaultLimit: resource.pagination.defaultLimit,
      maxLimit: resource.pagination.maxLimit,
      supportsPrevious: resource.pagination.supportsPrevious,
      totalReliable: resource.pagination.totalReliable,
    },
    savedViews: {
      enabled: resource.savedViews.enabled,
      maxColumns: resource.savedViews.maxColumns,
    },
  };
}

function defaultWorkspaceRequest() {
  return new Request("http://crays.local/api/crays/workspace/session");
}

export async function getCraysWorkspaceSessionDto(request: Request = defaultWorkspaceRequest()): Promise<CraysWorkspaceSessionDto> {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const authenticated = context.authoritySource !== "anonymous-fail-closed" && context.role !== "guest";

  return {
    status: authenticated ? "ready" : "forbidden",
    authority: {
      role: context.role,
      tenantId: context.tenantId,
      authoritySource: context.authoritySource,
      reviewPersona: context.reviewPersona,
    },
    identity: {
      authenticated,
      displayName: authenticated ? context.role : "Guest",
      accountId: context.session.account?.id ?? null,
    },
    capabilities: context.capabilities,
    resources: listResourceDescriptors().map(toWorkspaceResourceDto),
    queryClient: {
      hydratedAt: new Date().toISOString(),
      duplicateFetchOnMount: false,
    },
    sideEffects: {
      externalSendingEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      targetApplyEnabled: false,
      destructiveApplyEnabled: false,
      paymentInitiationEnabled: false,
      bankSendEnabled: false,
      financePostingEnabled: false,
      uploadsEnabled: false,
      liveAiExecutionEnabled: false,
    },
    browserBoundary: {
      coreBffOnly: true,
      vendorRequestsAllowed: false,
      vendorCredentialsExposed: false,
      nativeSourceModelsExposed: false,
    },
  };
}
