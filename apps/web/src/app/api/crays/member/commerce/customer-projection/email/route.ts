import { auth0 } from "@/lib/auth0";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { handleCustomerProjectionEmailChangeRequest } from
  "@/lib/member-commerce/customer-projection-registration-http";
import { createEnvironmentCommerceProviderRuntimeRegistry } from
  "@/lib/member-commerce/environment-commerce-provider-runtime-registry";
import { ServerBoundCustomerProjectionProvider } from
  "@/lib/member-commerce/server-bound-customer-projection-provider";
import { createEnvironmentHistoricalOrderProviderRuntimeRegistry } from
  "@/lib/member-commerce/server-bound-historical-order-snapshot-provider";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleCustomerProjectionEmailChangeRequest(request, {
    database: getKdsRuntimeDatabase(),
    provider: new ServerBoundCustomerProjectionProvider(
      createEnvironmentHistoricalOrderProviderRuntimeRegistry(),
      createEnvironmentCommerceProviderRuntimeRegistry(),
    ),
    resolveAuthority: async (candidate) => {
      const [context, providerSession] = await Promise.all([
        resolveCraysRouteContext(candidate, {
          fallbackRole: "guest", surface: "privileged-operation",
        }),
        auth0.getSession(candidate as never).catch(() => null),
      ]);
      return { authoritySource: context.authoritySource,
        accountId: context.session.account?.id ?? null,
        providerUser: providerSession?.user as Record<string, unknown> | null ?? null };
    },
  });
}
