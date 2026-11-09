import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { createLazyEnvironmentVendureBusinessReconciliationProvider } from
  "@/lib/member-commerce/environment-vendure-business-reconciliation-provider";
import { handlePartnerVendureReconciliationRequest } from
  "@/lib/member-commerce/partner-vendure-reconciliation-http";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handlePartnerVendureReconciliationRequest(request, {
    database: getKdsRuntimeDatabase(),
    provider: createLazyEnvironmentVendureBusinessReconciliationProvider(),
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
