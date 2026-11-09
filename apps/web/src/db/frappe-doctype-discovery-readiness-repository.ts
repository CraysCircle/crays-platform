import { getErpFinanceLedgerReadModel } from "./erp-finance-ledger-read-model-repository";
import { getSourceMetadataDiscoveryReadModel } from "./source-metadata-discovery-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export async function getFrappeDoctypeDiscoveryReadiness(role: RoleKey) {
  const [erp, discovery] = await Promise.all([getErpFinanceLedgerReadModel(role), getSourceMetadataDiscoveryReadModel(role)]);
  const frappe = discovery.systems.find((system) => system.systemKey === "frappe") ?? null;
  const allowed = erp.access.allowed && discovery.access.allowed;
  return {
    access: {
      role,
      allowed,
      reason: allowed ? "Role can inspect ERP/Frappe discovery readiness and finance ledger projection." : erp.access.reason || discovery.access.reason,
    },
    status: allowed ? (frappe?.status === "adapter_configuration_required" ? "discovery_required" : "ready_for_doctype_probe") : "forbidden",
    summary: {
      erpRecords: erp.summary.records,
      invoiceLines: erp.summary.invoiceLines,
      paymentSettlements: erp.summary.paymentSettlements,
      blockedRows: erp.summary.blockedRows,
      frappeResources: frappe?.resources.length ?? 0,
      envNamesTracked: frappe?.requiredEnvironment.length ?? 0,
      envNamesPresent: frappe?.requiredEnvironment.filter((item) => item.present).length ?? 0,
    },
    checks: {
      doctypeAllowlistRequired: true,
      fieldRedactionRequired: true,
      permissionMappingRequired: true,
      methodAllowlistRequired: true,
      financePostingEnabled: false,
      paymentInitiationEnabled: false,
      bankSendEnabled: false,
      sourceWritesEnabled: false,
    },
    adapter: frappe
      ? {
          systemKey: "frappe",
          schemaStatus: "requires-discovery",
          resources: frappe.resources.map((resource) => resource.key),
          envPresence: frappe.requiredEnvironment.map((env) => ({ name: env.name, present: env.present, secret: env.secret })),
          readOnlyProbePlan: frappe.readOnlyProbePlan,
        }
      : null,
    note:
      "Block 98: Frappe/ERPNext DocTypes remain discovery-required. Finance posting, payment initiation, bank sends and generic method calls stay closed.",
  };
}
