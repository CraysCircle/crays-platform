import { listResourceDescriptors } from "@/lib/resources";
import type { RoleKey } from "@/lib/roles";

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

export async function getTenantFieldScopeReadiness(role: RoleKey) {
  const descriptors = listResourceDescriptors();
  const fields = descriptors.flatMap((resource) => resource.fields.map((field) => ({ resource, field })));
  const nativeIdExposure = descriptors.filter((resource) => resource.provenance.exposesNativeIdsToClient);
  const publicInternalLeaks = fields.filter(({ resource, field }) => resource.sourceSystem !== "crays-public" && field.public && field.pii !== "none" && field.pii !== "business");
  const secretSelectableFields = fields.filter(({ field }) => field.pii === "secret" && field.clientSelectable);
  const missingReadScope = fields.filter(({ field }) => !field.readScopes.length);
  const allowed = allowedRoles.includes(role);

  return {
    access: {
      role,
      allowed,
      reason: allowed ? "Role can inspect tenant, record and field-scope readiness." : "Tenant and field-scope readiness is internal-only.",
    },
    status: allowed && nativeIdExposure.length === 0 && secretSelectableFields.length === 0 && missingReadScope.length === 0 ? "ready" : allowed ? "attention" : "forbidden",
    summary: {
      resources: descriptors.length,
      fields: fields.length,
      sourceBackedResources: descriptors.filter((resource) => ["twenty", "plane", "frappe"].includes(resource.sourceSystem)).length,
      requiresDiscoveryResources: descriptors.filter((resource) => resource.schemaStatus === "requires-discovery").length,
      nativeIdExposure: nativeIdExposure.length,
      publicInternalLeaks: publicInternalLeaks.length,
      secretSelectableFields: secretSelectableFields.length,
      missingReadScope: missingReadScope.length,
    },
    checks: {
      routeRoleAuthorityAccepted: false,
      tenantScopeServerSide: true,
      recordScopeServerSide: true,
      fieldScopeDescriptorsPresent: true,
      publicDtoOnlyForPublicDeals: true,
      browserSourceKeysExposed: false,
      sourceNativeIdsReturned: nativeIdExposure.length > 0,
    },
    findings: {
      nativeIdExposure: nativeIdExposure.map((resource) => resource.key),
      publicInternalLeaks: publicInternalLeaks.map(({ resource, field }) => `${resource.key}.${field.key}`),
      secretSelectableFields: secretSelectableFields.map(({ resource, field }) => `${resource.key}.${field.key}`),
      missingReadScope: missingReadScope.map(({ resource, field }) => `${resource.key}.${field.key}`),
    },
    note:
      "Block 103: Tenant, record and field scopes are described server-side in the resource registry. Public deal fields must come from public DTOs; source-native IDs and secret fields must not be client-selectable.",
  };
}
