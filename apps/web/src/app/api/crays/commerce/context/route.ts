import type { NextRequest } from "next/server";

import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import {
  handleCommerceContextReadRequest,
  resolveExactCommerceRoleAssignmentId,
} from
  "@/lib/member-commerce/commerce-context-read-path";
import { getKdsRuntimeDatabase } from "@/store-operations/kds-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleCommerceContextReadRequest(request, {
    database: getKdsRuntimeDatabase(),
    resolveAuthority: async (candidate) => {
      const context = await resolveCraysRouteContext(candidate, {
        fallbackRole: "guest",
        surface: "protected-read",
      });
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
        strongAuthAllowed: context.strongAuth?.allowed === true,
      };
    },
  });
}
