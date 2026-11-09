import type { NextRequest } from "next/server";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { auth0 } from "./auth0";
import { createCraysSessionFromIdentityBundle } from "./auth-session-mapping";
import { isRoleNostrBindingSatisfied } from "./role-nostr-policy";

export type LendingSourceRole = "finance" | "admin";

const allowedRoles = new Set<LendingSourceRole>(["finance", "admin"]);

export type LendingSourceAccessDecision =
  | { allowed: true; role: LendingSourceRole }
  | { allowed: false; response: Response };

function forbidden(reason: string): LendingSourceAccessDecision {
  return {
    allowed: false,
    response: Response.json(
      {
        status: "forbidden",
        reason,
        liveSourceAccess: false,
        secretsReturned: false,
      },
      { status: 403 },
    ),
  };
}

function validateRole(requestedRole: string | null | undefined, bodyRole?: unknown): LendingSourceAccessDecision {
  if (!requestedRole || !allowedRoles.has(requestedRole as LendingSourceRole)) {
    return forbidden("Live Loans source access requires Finance or Admin scope.");
  }
  if (bodyRole !== undefined && bodyRole !== requestedRole) {
    return forbidden("The actor role does not match the server-side request scope.");
  }
  return { allowed: true, role: requestedRole as LendingSourceRole };
}

export async function requireLendingSourceRole(request: NextRequest, bodyRole?: unknown): Promise<LendingSourceAccessDecision> {
  if (process.env.NODE_ENV !== "production") {
    return validateRole(request.nextUrl.searchParams.get("role"), bodyRole);
  }

  let providerSession;
  try {
    providerSession = await auth0.getSession(request);
  } catch {
    return forbidden("An active CRAYS account is required for live Loans source access.");
  }

  const providerSubject = providerSession?.user?.sub;
  if (!providerSubject) return forbidden("An active CRAYS account is required for live Loans source access.");

  let bundle;
  try {
    bundle = await getIdentityBundleByProviderSubject("auth0", providerSubject);
  } catch {
    return forbidden("The CRAYS account scope could not be verified for live Loans source access.");
  }
  if (!bundle) return forbidden("An active CRAYS account is required for live Loans source access.");

  const session = createCraysSessionFromIdentityBundle(bundle);
  if (session.status !== "crays_mapped" || session.requiredActions.length) {
    return forbidden("The CRAYS account must complete its access review before live Loans source access.");
  }

  const requestedRole = request.nextUrl.searchParams.get("role") ?? session.activeRole;
  const assignment = session.roleAssignments.find(
    (candidate) => candidate.role === requestedRole && candidate.status === "active",
  );
  if (!assignment || !isRoleNostrBindingSatisfied(assignment.nostrBinding.status)) {
    return forbidden("The requested CRAYS role is not active for this account.");
  }

  return validateRole(requestedRole, bodyRole);
}
