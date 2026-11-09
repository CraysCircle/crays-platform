import type { RoleKey } from "@/lib/roles";
import { integrationProfileForModule } from "@/modules/common/integration-modes";
import { adapterContractForModule } from "@/modules/common/registry";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const internalReadinessRoles: RoleKey[] = ["deal-manager", "expansion-manager", "reviewer", "crays-management", "admin"];
const expectedIntegrationTables = ["integration_connections", "external_record_maps", "sync_jobs"] as const;

export type CrmAdapterAccessLevel = "internal_deal_readiness" | "internal_expansion_readiness" | "internal_review_readiness" | "forbidden";

export type CrmAdapterReadiness = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    level: CrmAdapterAccessLevel;
    reason: string;
  };
  adapter: {
    module: "crm";
    label: "CRM";
    sourceOwner: "crm-engine";
    status: "contract_ready" | "schema_ready" | "not_configured" | "schema_incomplete";
    contractRoute: "/api/crays/modules/crm";
    readinessRoute: "/api/crays/crm/adapter/readiness";
    integrationBoundary: string;
    profileRule: string;
    capabilities: {
      read: "contract_ready";
      write: "blocked";
      event: "contract_only";
      communication: "contract_only";
      file: "not_in_first_scope";
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
    externalSystemKey: "crm-engine";
    internalCountsReturned: boolean;
    entityPairs: Array<{
      sourceEntity: string;
      craysEntity: string;
      mappingStatus: "contract_ready" | "blocked_until_schema_change" | "future";
    }>;
    currentCrmConnections: number;
    currentCrmExternalMaps: number;
    currentCrmSyncJobs: number;
  };
  health: {
    coreDbConfigured: boolean;
    integrationTablesReady: boolean;
    missingIntegrationTables: string[];
    liveSourceProbePerformed: false;
    sourceApiCalled: false;
    sourceUiEmbedded: false;
    externalSendingChecked: false;
    lastReadOnlySmokeAt: null;
    operationalRisk: "vps_inventory_required" | "ready_for_contract_work" | "schema_incomplete";
  };
  boundaries: {
    readOnly: true;
    companyWriteEnabled: false;
    personWriteEnabled: false;
    opportunityWriteEnabled: false;
    taskWriteEnabled: false;
    noteWriteEnabled: false;
    workflowAutomationEnabled: false;
    syncWritesEnabled: false;
    sourceUiExposureEnabled: false;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
  };
  liveCrmRecordsReturned: false;
  liveCompanyRecordsReturned: false;
  livePersonRecordsReturned: false;
  liveOpportunityRecordsReturned: false;
  liveTaskRecordsReturned: false;
  liveSourceRecordsReturned: false;
  liveBusinessRecordsReturned: false;
  providerCallsEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

function accessForRole(role: RoleKey): CrmAdapterReadiness["access"] {
  if (role === "deal-manager") {
    return {
      allowed: true,
      level: "internal_deal_readiness",
      reason: "Role can read CRM adapter readiness for candidate deal, prepared-offer and handoff pipeline scope.",
    };
  }

  if (role === "expansion-manager") {
    return {
      allowed: true,
      level: "internal_expansion_readiness",
      reason: "Role can read CRM adapter readiness for property, owner and partner pipeline scope.",
    };
  }

  if (internalReadinessRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_review_readiness",
      reason: "Role can review CRM adapter readiness before live source reads or write commands are enabled.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "CRM adapter readiness requires internal CRM review scope.",
  };
}

function zeroCounts() {
  return {
    currentCrmConnections: 0,
    currentCrmExternalMaps: 0,
    currentCrmSyncJobs: 0,
  };
}

function firstEntities(): CrmAdapterReadiness["firstEntities"] {
  return [
    {
      key: "companies",
      label: "Companies",
      sourceEntity: "Company",
      craysTarget: "Organization or partner pipeline record",
      firstReadScope: "Name, lifecycle stage, ownership and relationship type.",
    },
    {
      key: "people",
      label: "People",
      sourceEntity: "Person",
      craysTarget: "Account or stakeholder reference",
      firstReadScope: "Stakeholder identity, role, relationship and scoped contact state.",
    },
    {
      key: "opportunities",
      label: "Opportunities",
      sourceEntity: "Opportunity",
      craysTarget: "Candidate deal, prepared offer or property-case pipeline",
      firstReadScope: "Stage, owner, related entity and next review gate.",
    },
    {
      key: "tasks",
      label: "Tasks",
      sourceEntity: "Task",
      craysTarget: "Workflow event or follow-up summary",
      firstReadScope: "Owner, due date, status and related business object.",
    },
    {
      key: "notes",
      label: "Notes",
      sourceEntity: "Note",
      craysTarget: "Internal review note or conversation metadata",
      firstReadScope: "Metadata only until communication visibility rules approve body reads.",
    },
  ];
}

function readModels(): CrmAdapterReadiness["readModels"] {
  return [
    {
      key: "candidate-deal-pipeline",
      label: "Candidate deal pipeline",
      ownerRole: "deal-manager",
      status: "contract_ready",
    },
    {
      key: "prepared-offer-review-support",
      label: "Prepared offer review support",
      ownerRole: "deal-manager",
      status: "contract_ready",
    },
    {
      key: "property-partner-pipeline",
      label: "Property partner pipeline",
      ownerRole: "expansion-manager",
      status: "contract_ready",
    },
    {
      key: "handoff-context",
      label: "Handoff context",
      ownerRole: "reviewer",
      status: "future_scoped",
    },
  ];
}

function allowedReadScopes(): CrmAdapterReadiness["allowedReadScopes"] {
  return [
    {
      role: "deal-manager",
      scope: "Candidate deal, prepared-offer review and opening handoff CRM context.",
      records: ["Companies", "People", "Opportunities", "Tasks", "Reviewed notes metadata"],
    },
    {
      role: "expansion-manager",
      scope: "Property owner, landlord, broker, funding partner and banking partner development before deal handoff.",
      records: ["Companies", "People", "Opportunities", "Tasks", "Reviewed notes metadata"],
    },
    {
      role: "reviewer",
      scope: "Approval, compliance and quality review queues across scoped CRM records.",
      records: ["Opportunities", "Tasks", "Handoff context"],
    },
  ];
}

function blockedWriteScopes(): CrmAdapterReadiness["blockedWriteScopes"] {
  return [
    {
      key: "company-write",
      label: "Create or update companies",
      blockedUntil: "Explicit CRM write-adapter approval, idempotency keys and audit event policy.",
    },
    {
      key: "person-write",
      label: "Create or update people",
      blockedUntil: "Account/contact data ownership, consent and dedupe policy are approved.",
    },
    {
      key: "opportunity-write",
      label: "Create or update opportunities",
      blockedUntil: "Pipeline state mapping, handoff gates and rollback plan are approved.",
    },
    {
      key: "task-note-write",
      label: "Write tasks or notes",
      blockedUntil: "Communication visibility, review and external-sending rules are approved.",
    },
    {
      key: "workflow-automation",
      label: "Trigger workflow automation",
      blockedUntil: "Event ingestion, retry behavior and owner escalation rules are approved.",
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

async function crmIntegrationCounts() {
  const pool = getCorePgPool();

  const connectionResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.integration_connections
      where module_key = 'crm'
    `,
  );
  const mapResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.external_record_maps
      where external_system = 'crm-engine'
         or metadata ->> 'moduleKey' = 'crm'
    `,
  );
  const syncJobResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.sync_jobs sync_jobs
      left join crays_core.integration_connections connections
        on connections.connection_id = sync_jobs.connection_id
      where connections.module_key = 'crm'
         or sync_jobs.payload_summary ->> 'moduleKey' = 'crm'
    `,
  );

  return {
    currentCrmConnections: Number(connectionResult.rows[0]?.row_count ?? 0),
    currentCrmExternalMaps: Number(mapResult.rows[0]?.row_count ?? 0),
    currentCrmSyncJobs: Number(syncJobResult.rows[0]?.row_count ?? 0),
  };
}

export async function getCrmAdapterReadiness(role: RoleKey): Promise<CrmAdapterReadiness> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);
  const adapter = adapterContractForModule("crm");
  const profile = integrationProfileForModule("crm");

  if (!adapter || !profile) {
    throw new Error("CRM adapter contract is not registered.");
  }

  let missingIntegrationTables = [...expectedIntegrationTables];
  let integrationTablesReady = false;
  let counts = zeroCounts();

  if (runtime.configured) {
    const existing = await existingIntegrationTables();
    missingIntegrationTables = expectedIntegrationTables.filter((tableName) => !existing.has(tableName));
    integrationTablesReady = missingIntegrationTables.length === 0;
    if (integrationTablesReady && access.allowed) {
      counts = await crmIntegrationCounts();
    }
  }

  const status: CrmAdapterReadiness["adapter"]["status"] = !runtime.configured
    ? "not_configured"
    : integrationTablesReady
      ? "schema_ready"
      : "schema_incomplete";

  return {
    configured: runtime.configured,
    role,
    access,
    adapter: {
      module: "crm",
      label: "CRM",
      sourceOwner: "crm-engine",
      status,
      contractRoute: "/api/crays/modules/crm",
      readinessRoute: "/api/crays/crm/adapter/readiness",
      integrationBoundary: adapter.integrationBoundary,
      profileRule: profile.uiRule,
      capabilities: {
        read: "contract_ready",
        write: "blocked",
        event: "contract_only",
        communication: "contract_only",
        file: "not_in_first_scope",
      },
    },
    firstEntities: access.allowed ? firstEntities() : [],
    readModels: access.allowed ? readModels() : [],
    allowedReadScopes: access.allowed ? allowedReadScopes() : [],
    blockedWriteScopes: access.allowed ? blockedWriteScopes() : [],
    mappingStrategy: {
      externalRecordMapsReady: integrationTablesReady,
      externalSystemKey: "crm-engine",
      internalCountsReturned: access.allowed,
      entityPairs: [
        {
          sourceEntity: "Company",
          craysEntity: "organization or account-scoped relationship",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Company",
          craysEntity: "partner pipeline relationship",
          mappingStatus: "blocked_until_schema_change",
        },
        {
          sourceEntity: "Person",
          craysEntity: "account, stakeholder or organization membership",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Opportunity",
          craysEntity: "prepared offer, deal or property case",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Task",
          craysEntity: "workflow event or follow-up read model",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Note",
          craysEntity: "conversation, message or internal review metadata",
          mappingStatus: "future",
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
      externalSendingChecked: false,
      lastReadOnlySmokeAt: null,
      operationalRisk: !runtime.configured ? "vps_inventory_required" : integrationTablesReady ? "ready_for_contract_work" : "schema_incomplete",
    },
    boundaries: {
      readOnly: true,
      companyWriteEnabled: false,
      personWriteEnabled: false,
      opportunityWriteEnabled: false,
      taskWriteEnabled: false,
      noteWriteEnabled: false,
      workflowAutomationEnabled: false,
      syncWritesEnabled: false,
      sourceUiExposureEnabled: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
    },
    liveCrmRecordsReturned: false,
    liveCompanyRecordsReturned: false,
    livePersonRecordsReturned: false,
    liveOpportunityRecordsReturned: false,
    liveTaskRecordsReturned: false,
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
