import { getPortalRoleEntries, getPortalSurfaceEntries, portalBridgeMaxAgeSeconds } from "@/lib/portal-access-bridge";
import type { RoleKey } from "@/lib/roles";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

export async function getPortalBridgeSunsetReadiness(role: RoleKey) {
  const roleEntries = getPortalRoleEntries();
  const surfaceEntries = getPortalSurfaceEntries();
  const allowed = allowedRoles.includes(role);
  return {
    access: {
      role,
      allowed,
      reason: allowed ? "Role can inspect temporary portal bridge coverage and sunset gates." : "Portal bridge sunset readiness is internal-only.",
    },
    status: allowed ? "temporary_bridge_active" : "forbidden",
    summary: {
      roles: roleEntries.length,
      surfaces: surfaceEntries.length,
      maxAgeSeconds: portalBridgeMaxAgeSeconds,
      auth0MappedSessionRequiredForSunset: true,
      directRoleQueryAuthorityAccepted: false,
    },
    bridgePolicy: {
      cookieHttpOnly: true,
      shortLived: true,
      serverSideTargetAllowlist: true,
      requestRoleAuthorityAccepted: false,
      sourceKeysExposed: false,
      productionSideEffectsOpened: false,
    },
    sunsetGates: [
      "Auth0 CRAYS account mapping active for internal roles.",
      "Stakeholder self-scope sessions replace free bridge entries.",
      "Portal bridge links retained only for controlled beta review.",
      "Direct ?role= remains ignored as authority in production.",
    ],
    note:
      "Block 102: The portal bridge is intentionally temporary. It can list free role entries for review, but it must sunset behind real Auth0/CRAYS sessions before production release.",
  };
}
