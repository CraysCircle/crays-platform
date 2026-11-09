import { getRoleScopeAuditReadModel } from "@/db/role-scope-audit-read-model-repository";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = await getRoleScopeAuditReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "release_blocked",
      serverAuthority: context.authoritySource,
      reviewPersona: context.reviewPersona,
      tenantId: context.tenantId,
      readModel,
      permissionReadsEnabled: readModel.boundaries.permissionReadsEnabled,
      roleMatrixReadsEnabled: readModel.boundaries.roleMatrixReadsEnabled,
      coreCommandDraftsEnabled: readModel.boundaries.coreCommandDraftsEnabled,
      permissionMutationEnabled: false,
      accountMutationEnabled: false,
      roleMutationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      targetApplyEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      candidateReleaseEnabled: false,
      bankActionsEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      uploadsEnabled: false,
      privatePreviewEnabled: false,
      liveAiEnabled: false,
      productionDeployEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Role Scope Audit reads permission policy, role-tool matrix and redaction rules only. It does not mutate accounts, roles, permissions, releases, sends, payments, finance records, source records or target systems."
        : "Role Scope Audit is internal/scoped governance only and is release-blocked for this role.",
    },
    { status: readModel.access.allowed ? 200 : 423 },
  );
}
