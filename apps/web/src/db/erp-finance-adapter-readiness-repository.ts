import type { RoleKey } from "@/lib/roles";
import { integrationProfileForModule } from "@/modules/common/integration-modes";
import { adapterContractForModule } from "@/modules/common/registry";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const internalFinanceRoles: RoleKey[] = ["finance", "crays-management", "admin", "reviewer"];
const dealFinanceShellRoles: RoleKey[] = ["deal-manager"];
const futureScopedRoles: RoleKey[] = ["franchise-partner", "studio-manager"];
const expectedIntegrationTables = ["integration_connections", "external_record_maps", "sync_jobs"] as const;

export type ErpFinanceAdapterAccessLevel =
  | "internal_finance_readiness"
  | "deal_finance_summary_shell"
  | "future_scoped_finance_shell"
  | "forbidden";

export type ErpFinanceAdapterReadiness = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    level: ErpFinanceAdapterAccessLevel;
    reason: string;
  };
  adapter: {
    module: "erp";
    label: "ERP / Finance";
    sourceOwner: "erp-engine";
    status: "contract_ready" | "schema_ready" | "not_configured" | "schema_incomplete";
    contractRoute: "/api/crays/modules/erp";
    readinessRoute: "/api/crays/erp/adapter/readiness";
    integrationBoundary: string;
    profileRule: string;
    capabilities: {
      read: "contract_ready";
      write: "blocked";
      event: "contract_only";
      file: "blocked";
      accountingExport: "blocked";
      bankSend: "blocked";
    };
  };
  firstEntities: Array<{
    key: string;
    label: string;
    sourceEntity: string;
    craysTarget: string;
    firstReadScope: string;
  }>;
  readModels: Array<{
    key: string;
    label: string;
    ownerRole: RoleKey;
    status: "contract_ready" | "future_scoped";
  }>;
  allowedReadScopes: Array<{
    role: RoleKey;
    scope: string;
    records: string[];
  }>;
  blockedWriteScopes: Array<{
    key: string;
    label: string;
    blockedUntil: string;
  }>;
  mappingStrategy: {
    externalRecordMapsReady: boolean;
    externalSystemKey: "erp-engine";
    internalCountsReturned: boolean;
    entityPairs: Array<{
      sourceEntity: string;
      craysEntity: string;
      mappingStatus: "contract_ready" | "blocked_until_schema_change" | "future";
    }>;
    currentErpConnections: number;
    currentErpExternalMaps: number;
    currentErpSyncJobs: number;
  };
  health: {
    coreDbConfigured: boolean;
    integrationTablesReady: boolean;
    missingIntegrationTables: string[];
    liveSourceProbePerformed: false;
    sourceApiCalled: false;
    sourceUiEmbedded: false;
    lastReadOnlySmokeAt: null;
    queueRiskFromVpsInventory: "high_cpu_observed";
    operationalRisk: "vps_inventory_required" | "erp_queue_cpu_high_observed" | "schema_incomplete";
  };
  boundaries: {
    readOnly: true;
    invoiceWriteEnabled: false;
    paymentWriteEnabled: false;
    journalEntryWriteEnabled: false;
    accountingExportEnabled: false;
    bankPackageCreationEnabled: false;
    bankSendEnabled: false;
    supplierWriteEnabled: false;
    itemPriceWriteEnabled: false;
    syncWritesEnabled: false;
    sourceUiExposureEnabled: false;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
  };
  liveErpRecordsReturned: false;
  liveFinanceRecordsReturned: false;
  liveInvoiceRecordsReturned: false;
  livePaymentRecordsReturned: false;
  liveAccountingRecordsReturned: false;
  liveSourceRecordsReturned: false;
  liveBusinessRecordsReturned: false;
  providerCallsEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

function accessForRole(role: RoleKey): ErpFinanceAdapterReadiness["access"] {
  if (internalFinanceRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_finance_readiness",
      reason: "Role can review ERP / Finance adapter readiness before live source reads, finance writes, exports or bank sends are enabled.",
    };
  }

  if (dealFinanceShellRoles.includes(role)) {
    return {
      allowed: true,
      level: "deal_finance_summary_shell",
      reason: "Role can read the deal finance summary shell contract, but no internal accounting counts or live finance records.",
    };
  }

  if (futureScopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "future_scoped_finance_shell",
      reason: "Role can see the future scoped finance shell contract only after handoff rules are approved.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "ERP / Finance adapter readiness requires internal finance scope or an approved future scoped finance shell.",
  };
}

function zeroCounts() {
  return {
    currentErpConnections: 0,
    currentErpExternalMaps: 0,
    currentErpSyncJobs: 0,
  };
}

function countsAllowed(level: ErpFinanceAdapterAccessLevel) {
  return level === "internal_finance_readiness";
}

function firstEntities(): ErpFinanceAdapterReadiness["firstEntities"] {
  return [
    {
      key: "customers",
      label: "Customers",
      sourceEntity: "Customer",
      craysTarget: "Organization, account or partner finance reference",
      firstReadScope: "Reference metadata, lifecycle state and scoped billing ownership.",
    },
    {
      key: "suppliers",
      label: "Suppliers",
      sourceEntity: "Supplier",
      craysTarget: "Vendor or service partner finance reference",
      firstReadScope: "Reference metadata only until supplier write and document rules are approved.",
    },
    {
      key: "invoices",
      label: "Invoices",
      sourceEntity: "Invoice",
      craysTarget: "Prepared-offer, studio and bank-package finance summary",
      firstReadScope: "Status, totals, due dates and approved relationship metadata only.",
    },
    {
      key: "payments",
      label: "Payments",
      sourceEntity: "Payment",
      craysTarget: "Loan, drawdown and studio finance summary",
      firstReadScope: "Status and amount summary only; no payment execution.",
    },
    {
      key: "accounts",
      label: "Accounts",
      sourceEntity: "Account",
      craysTarget: "Finance summary and accounting export readiness",
      firstReadScope: "Chart metadata and scoped summary rollups only.",
    },
    {
      key: "journal-entries",
      label: "Journal entries",
      sourceEntity: "JournalEntry",
      craysTarget: "Accounting event summary",
      firstReadScope: "Metadata only; no accounting export or posting.",
    },
    {
      key: "budgets",
      label: "Budgets",
      sourceEntity: "Budget",
      craysTarget: "Opening budget and studio operating summary",
      firstReadScope: "Approved budget category rollups and variance state.",
    },
  ];
}

function readModels(): ErpFinanceAdapterReadiness["readModels"] {
  return [
    {
      key: "bank-package-finance-summary",
      label: "Bank package finance summary",
      ownerRole: "deal-manager",
      status: "contract_ready",
    },
    {
      key: "prepared-offer-fee-basis",
      label: "Prepared offer fee basis",
      ownerRole: "finance",
      status: "contract_ready",
    },
    {
      key: "opening-budget-summary",
      label: "Opening budget summary",
      ownerRole: "finance",
      status: "contract_ready",
    },
    {
      key: "studio-finance-snapshot",
      label: "Studio finance snapshot",
      ownerRole: "franchise-partner",
      status: "future_scoped",
    },
    {
      key: "accounting-export-readiness",
      label: "Accounting export readiness",
      ownerRole: "finance",
      status: "future_scoped",
    },
  ];
}

function allowedReadScopes(): ErpFinanceAdapterReadiness["allowedReadScopes"] {
  return [
    {
      role: "finance",
      scope: "Internal finance readiness across invoices, payments, budgets, accounts and export preparation metadata.",
      records: ["Customers", "Suppliers", "Invoices", "Payments", "Accounts", "Journal entries", "Budgets"],
    },
    {
      role: "deal-manager",
      scope: "Prepared-offer, bank-package and opening-budget finance summaries only.",
      records: ["Bank package finance summary", "Prepared offer fee basis", "Opening budget summary"],
    },
    {
      role: "franchise-partner",
      scope: "Own studio finance snapshot only after partner handoff and scope approval.",
      records: ["Studio finance snapshot", "Approved invoices", "Approved budget variance"],
    },
    {
      role: "studio-manager",
      scope: "Own studio operating finance summary only after scope approval.",
      records: ["Studio finance snapshot", "Approved budget variance"],
    },
    {
      role: "reviewer",
      scope: "Finance review queues and exception metadata.",
      records: ["Prepared offer fee basis", "Opening budget summary", "Accounting export readiness"],
    },
  ];
}

function blockedWriteScopes(): ErpFinanceAdapterReadiness["blockedWriteScopes"] {
  return [
    {
      key: "invoice-write",
      label: "Create or update invoices",
      blockedUntil: "Explicit ERP / Finance write-adapter approval, idempotency keys and audit event policy.",
    },
    {
      key: "payment-write",
      label: "Create, update or execute payments",
      blockedUntil: "Payment authority, approval chain, rollback plan and regulated handoff rules are approved.",
    },
    {
      key: "journal-entry-write",
      label: "Create or post journal entries",
      blockedUntil: "Accounting ownership, period-lock and export reconciliation policy are approved.",
    },
    {
      key: "accounting-export",
      label: "Export accounting data",
      blockedUntil: "Export format, accountant access scope and retention policy are approved.",
    },
    {
      key: "supplier-item-write",
      label: "Create suppliers or item prices",
      blockedUntil: "Vendor ownership, dedupe rules and price-change approval policy are approved.",
    },
    {
      key: "bank-send",
      label: "Send finance package to bank",
      blockedUntil: "Bank package release, consent, KYC / AML and external sending gates are approved.",
    },
  ];
}

async function existingIntegrationTables() {
  const pool = getCorePgPool();
  const result = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedIntegrationTables],
  );

  return new Set(result.rows.map((row) => row.table_name));
}

async function erpIntegrationCounts() {
  const pool = getCorePgPool();

  const connectionResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.integration_connections
      where module_key = 'erp'
    `,
  );
  const mapResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.external_record_maps
      where external_system = 'erp-engine'
         or metadata ->> 'moduleKey' = 'erp'
    `,
  );
  const syncJobResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.sync_jobs sync_jobs
      left join crays_core.integration_connections connections
        on connections.connection_id = sync_jobs.connection_id
      where connections.module_key = 'erp'
         or sync_jobs.payload_summary ->> 'moduleKey' = 'erp'
    `,
  );

  return {
    currentErpConnections: Number(connectionResult.rows[0]?.row_count ?? 0),
    currentErpExternalMaps: Number(mapResult.rows[0]?.row_count ?? 0),
    currentErpSyncJobs: Number(syncJobResult.rows[0]?.row_count ?? 0),
  };
}

export async function getErpFinanceAdapterReadiness(role: RoleKey): Promise<ErpFinanceAdapterReadiness> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);
  const adapter = adapterContractForModule("erp");
  const profile = integrationProfileForModule("erp");

  if (!adapter || !profile) {
    throw new Error("ERP adapter contract is not registered.");
  }

  let missingIntegrationTables = [...expectedIntegrationTables];
  let integrationTablesReady = false;
  let counts = zeroCounts();

  if (runtime.configured) {
    const existing = await existingIntegrationTables();
    missingIntegrationTables = expectedIntegrationTables.filter((tableName) => !existing.has(tableName));
    integrationTablesReady = missingIntegrationTables.length === 0;
    if (integrationTablesReady && countsAllowed(access.level)) {
      counts = await erpIntegrationCounts();
    }
  }

  const status: ErpFinanceAdapterReadiness["adapter"]["status"] = !runtime.configured
    ? "not_configured"
    : integrationTablesReady
      ? "schema_ready"
      : "schema_incomplete";

  return {
    configured: runtime.configured,
    role,
    access,
    adapter: {
      module: "erp",
      label: "ERP / Finance",
      sourceOwner: "erp-engine",
      status,
      contractRoute: "/api/crays/modules/erp",
      readinessRoute: "/api/crays/erp/adapter/readiness",
      integrationBoundary: adapter.integrationBoundary,
      profileRule: profile.uiRule,
      capabilities: {
        read: "contract_ready",
        write: "blocked",
        event: "contract_only",
        file: "blocked",
        accountingExport: "blocked",
        bankSend: "blocked",
      },
    },
    firstEntities: access.allowed ? firstEntities() : [],
    readModels: access.allowed ? readModels() : [],
    allowedReadScopes: access.allowed ? allowedReadScopes() : [],
    blockedWriteScopes: access.allowed ? blockedWriteScopes() : [],
    mappingStrategy: {
      externalRecordMapsReady: integrationTablesReady,
      externalSystemKey: "erp-engine",
      internalCountsReturned: countsAllowed(access.level),
      entityPairs: [
        {
          sourceEntity: "Customer",
          craysEntity: "organization, account or partner finance reference",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Supplier",
          craysEntity: "vendor relationship or service partner finance reference",
          mappingStatus: "blocked_until_schema_change",
        },
        {
          sourceEntity: "Invoice",
          craysEntity: "prepared offer, bank package, studio finance or workflow event summary",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Payment",
          craysEntity: "loan case, drawdown or studio finance summary",
          mappingStatus: "future",
        },
        {
          sourceEntity: "Account",
          craysEntity: "finance summary and accounting export readiness",
          mappingStatus: "future",
        },
        {
          sourceEntity: "JournalEntry",
          craysEntity: "workflow event or accounting event summary",
          mappingStatus: "future",
        },
        {
          sourceEntity: "Budget",
          craysEntity: "opening budget or financial model summary",
          mappingStatus: "contract_ready",
        },
      ],
      ...counts,
    },
    health: {
      coreDbConfigured: runtime.configured,
      integrationTablesReady,
      missingIntegrationTables,
      liveSourceProbePerformed: false,
      sourceApiCalled: false,
      sourceUiEmbedded: false,
      lastReadOnlySmokeAt: null,
      queueRiskFromVpsInventory: "high_cpu_observed",
      operationalRisk: !runtime.configured ? "vps_inventory_required" : integrationTablesReady ? "erp_queue_cpu_high_observed" : "schema_incomplete",
    },
    boundaries: {
      readOnly: true,
      invoiceWriteEnabled: false,
      paymentWriteEnabled: false,
      journalEntryWriteEnabled: false,
      accountingExportEnabled: false,
      bankPackageCreationEnabled: false,
      bankSendEnabled: false,
      supplierWriteEnabled: false,
      itemPriceWriteEnabled: false,
      syncWritesEnabled: false,
      sourceUiExposureEnabled: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
    },
    liveErpRecordsReturned: false,
    liveFinanceRecordsReturned: false,
    liveInvoiceRecordsReturned: false,
    livePaymentRecordsReturned: false,
    liveAccountingRecordsReturned: false,
    liveSourceRecordsReturned: false,
    liveBusinessRecordsReturned: false,
    providerCallsEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
