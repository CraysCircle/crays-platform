import {
  buildOperatingPlatformPrototypeReadiness,
  emptyOperatingPlatformPrototypeReadiness,
  operatingPlatformPrototypeAccessForRole,
  type OperatingPlatformPrototypeReadiness,
} from "@/lib/operating-platform-prototype-contract";
import type { RoleKey } from "@/lib/roles";
import { getMultiCompanyTenantizationReadiness } from "./multi-company-tenantization-repository";
import { getRealProductReadModel } from "./real-product-read-model-repository";

export async function getOperatingPlatformPrototypeReadiness(role: RoleKey): Promise<OperatingPlatformPrototypeReadiness> {
  const access = operatingPlatformPrototypeAccessForRole(role);
  const shell = emptyOperatingPlatformPrototypeReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const [realProduct, tenantization] = await Promise.all([
    getRealProductReadModel(role),
    getMultiCompanyTenantizationReadiness("admin"),
  ]);

  return buildOperatingPlatformPrototypeReadiness(role, { realProduct, tenantization });
}
