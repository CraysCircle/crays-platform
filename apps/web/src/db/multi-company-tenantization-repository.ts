import {
  buildMultiCompanyTenantizationReadiness,
  emptyMultiCompanyTenantizationReadiness,
  multiCompanyTenantizationAccessForRole,
  type MultiCompanyTenantizationReadiness,
} from "@/lib/multi-company-tenantization-contract";
import type { RoleKey } from "@/lib/roles";
import { getControlledBetaReadiness } from "./controlled-beta-readiness-repository";

export async function getMultiCompanyTenantizationReadiness(role: RoleKey): Promise<MultiCompanyTenantizationReadiness> {
  const access = multiCompanyTenantizationAccessForRole(role);
  const shell = emptyMultiCompanyTenantizationReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const beta = await getControlledBetaReadiness("admin");
  return buildMultiCompanyTenantizationReadiness(role, { beta });
}
