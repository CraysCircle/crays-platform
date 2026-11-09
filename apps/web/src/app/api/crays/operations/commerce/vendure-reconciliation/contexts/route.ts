import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { handlePartnerVendureReconciliationContextsRequest } from
  "@/lib/member-commerce/partner-vendure-reconciliation-context-http";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handlePartnerVendureReconciliationContextsRequest(request, {
    database: getKdsRuntimeDatabase(),
    resolveAuthority: async (candidate) => {
      const context = await resolveCraysRouteContext(candidate, {
        fallbackRole: "guest",
        surface: "protected-read",
      });
      return {
        authoritySource: context.authoritySource,
        accountId: context.session.account?.id ?? null,
        organizationId: context.tenantId,
        effectiveRole: context.role,
        strongAuthAllowed: context.strongAuth?.allowed === true,
      };
    },
  });
}
