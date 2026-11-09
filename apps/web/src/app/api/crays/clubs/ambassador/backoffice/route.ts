import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { auth0 } from "@/lib/auth0";
import { block199AssuranceFromProviderClaims } from "@/lib/block199-runtime-auth";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import {
  readOwnAmbassadorBackofficeByAccount,
} from "@/lib/member-commerce/ambassador-stripe-split-repository";
import {
  resolveExactCommerceRoleAssignmentId,
} from "@/lib/member-commerce/commerce-context-read-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

export async function GET(request: NextRequest) {
  const [providerSession, context] = await Promise.all([
    auth0.getSession(request).catch(() => null),
    resolveCraysRouteContext(request, {
      fallbackRole: "guest",
    }).catch(() => null),
  ]);
  const providerClaims = providerSession?.user;
  const subject =
    typeof providerClaims?.sub === "string"
      ? providerClaims.sub
      : "";
  if (!subject || !context || !providerClaims) {
    return NextResponse.json(
      { status: "authentication_required" },
      { status: 401, headers: noStore },
    );
  }

  const identity = await getIdentityBundleByProviderSubject(
    "auth0",
    subject,
  ).catch(() => null);
  const rawAccountId = identity?.account.account_id;
  const accountId =
    typeof rawAccountId === "string" ? rawAccountId : null;
  const assurance = block199AssuranceFromProviderClaims(
    providerClaims as Record<string, unknown>,
  );
  const roleAssignmentId = resolveExactCommerceRoleAssignmentId(
    context.session.roleAssignments,
    context.role,
    context.tenantId,
  );

  if (
    !accountId ||
    context.authoritySource !== "auth0-crays-session" ||
    context.session.account?.id !== accountId ||
    !roleAssignmentId ||
    (assurance.assuranceLevel !== "aal2" &&
      assurance.assuranceLevel !== "aal3")
  ) {
    return NextResponse.json(
      { status: "ambassador_aal2_role_assignment_required" },
      { status: 403, headers: noStore },
    );
  }

  const backoffice = await readOwnAmbassadorBackofficeByAccount({
    tenantId: context.tenantId,
    canonicalAccountId: accountId,
    roleAssignmentId,
  }).catch(() => null);
  if (!backoffice) {
    return NextResponse.json(
      { status: "ambassador_authority_unavailable" },
      { status: 403, headers: noStore },
    );
  }

  return NextResponse.json(
    { status: "ok", backoffice },
    { headers: noStore },
  );
}
