import type { RoleKey } from "@/lib/roles";

type ValidatedClubsTenantSession = Readonly<{
  roleKey: "holiday-manager";
  organizationId: string;
}>;

export type WorkspaceAuthorityPrecedenceDecision = Readonly<{
  source: "clubs-tenant-session" | "auth0-crays-session" | "portal-bridge-cookie" | "anonymous-fail-closed";
  role: RoleKey | null;
  tenantId: string | null;
}>;

export function selectWorkspaceAuthorityPrecedence(input: Readonly<{
  mappedRole: RoleKey | null;
  mappedTenantId: string | null;
  validatedClubsTenantSession: ValidatedClubsTenantSession | null;
  portalBridgeRole: RoleKey | null;
}>): WorkspaceAuthorityPrecedenceDecision {
  if (input.mappedRole && input.validatedClubsTenantSession) {
    return {
      source: "clubs-tenant-session",
      role: "holiday-manager",
      tenantId: input.validatedClubsTenantSession.organizationId,
    };
  }
  if (input.mappedRole) {
    return {
      source: "auth0-crays-session",
      role: input.mappedRole,
      tenantId: input.mappedTenantId,
    };
  }
  if (input.portalBridgeRole) {
    return {
      source: "portal-bridge-cookie",
      role: input.portalBridgeRole,
      tenantId: "crays-portal-bridge",
    };
  }
  return { source: "anonymous-fail-closed", role: null, tenantId: null };
}
