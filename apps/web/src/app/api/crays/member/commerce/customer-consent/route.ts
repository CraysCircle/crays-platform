import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import {
  createEnvironmentConsentPolicyRegistry,
  handleCustomerConsentCommandRequest,
  handleCustomerConsentReadRequest,
} from "@/lib/member-commerce/customer-consent-http";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authority(request: Request, surface: "protected-read" | "privileged-operation") {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest", surface });
  return { authoritySource: context.authoritySource,
    accountId: context.session.account?.id ?? null };
}

export async function GET(request: Request) {
  return handleCustomerConsentReadRequest(request, {
    database: getKdsRuntimeDatabase(),
    resolveAuthority: (candidate) => authority(candidate, "protected-read"),
  });
}

export async function POST(request: Request) {
  return handleCustomerConsentCommandRequest(request, {
    database: getKdsRuntimeDatabase(),
    resolveAuthority: (candidate) => authority(candidate, "privileged-operation"),
    policyVersionForPurpose: createEnvironmentConsentPolicyRegistry(),
  });
}
