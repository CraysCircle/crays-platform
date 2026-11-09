import { getAccessControlContract } from "@/lib/access-control";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";
import { permissionsForRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);

  return Response.json({
    liveDataReturned: false,
    serverAuthority: context.authoritySource,
    reviewPersona: context.reviewPersona,
    tenantId: context.tenantId,
    contract: getAccessControlContract(role),
    permissions: permissionsForRole(role).map((permission) => ({
      key: permission.key,
      label: permission.label,
      resource: permission.resource,
      action: permission.action,
      risk: permission.risk,
      scopes: permission.scopes,
    })),
    note: "This is the CRAYS role, permission and access-boundary contract. It returns no live business records.",
  });
}
