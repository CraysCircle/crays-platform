import { evaluateSessionPermission, type CraysAuthSession } from "./auth-boundary";
import type { PermissionKey, PermissionScope } from "./permissions";

export type ServerAccessDecision = {
  allowed: boolean;
  reason: string;
  auditRequired: boolean;
};

export function requireServerPermission(
  session: CraysAuthSession,
  permission: PermissionKey,
  scope: PermissionScope,
): ServerAccessDecision {
  const decision = evaluateSessionPermission(session, { permission, scope });

  return {
    allowed: decision.allowed,
    reason: decision.reason,
    auditRequired: true,
  };
}

export const serverGuardrails = [
  "Navigation visibility is never the authorization layer.",
  "Every read and write path must call a server-side permission check.",
  "Provider sessions must map to a CRAYS account before product data is returned.",
  "High-risk decisions require audit entries.",
];
