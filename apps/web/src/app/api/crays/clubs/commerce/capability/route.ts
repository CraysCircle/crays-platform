import type { NextRequest } from "next/server";

import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { auth0 } from "@/lib/auth0";
import { block199AssuranceFromProviderClaims } from
  "@/lib/block199-runtime-auth";
import {
  handleClubsSellableCapabilityReadRequest,
} from "@/lib/member-commerce/clubs-sellable-capability-read-path";
import {
  resolveExactCommerceRoleAssignmentId,
} from "@/lib/member-commerce/commerce-context-read-path";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleClubsSellableCapabilityReadRequest(request, {
    database: getKdsRuntimeDatabase(),
    resolveAuthority: async (candidate) => {
      const [context, providerSession] = await Promise.all([
        resolveCraysRouteContext(candidate, {
          fallbackRole: "guest",
        }),
        auth0.getSession(candidate as NextRequest).catch(() => null),
      ]);
      const assurance = block199AssuranceFromProviderClaims(
        (providerSession?.user ?? {}) as Record<string, unknown>,
      );
      return {
        authoritySource: context.authoritySource,
        accountId: context.session.account?.id ?? null,
        tenantId: context.tenantId,
        role: context.role,
        roleAssignmentId: resolveExactCommerceRoleAssignmentId(
          context.session.roleAssignments,
          context.role,
          context.tenantId,
        ),
        strongAuthAllowed:
          assurance.assuranceLevel === "aal2" ||
          assurance.assuranceLevel === "aal3",
      };
    },
  });
}
