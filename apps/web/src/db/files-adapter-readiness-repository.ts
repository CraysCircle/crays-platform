import type { RoleKey } from "@/lib/roles";
import { integrationProfileForModule } from "@/modules/common/integration-modes";
import { adapterContractForModule } from "@/modules/common/registry";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const internalMetadataRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "reviewer", "crays-management", "admin"];
const releaseShellRoles: RoleKey[] = ["franchise-candidate", "bank-partner"];
const futureScopedRoles: RoleKey[] = ["franchise-partner", "landlord", "vendor", "studio-manager"];
const expectedMetadataTables = ["document_package_links", "evidence_packages", "workflow_events"] as const;
const expectedIntegrationTables = ["integration_connections", "external_record_maps", "sync_jobs"] as const;

export type FilesAdapterAccessLevel =
  | "internal_metadata_readiness"
  | "release_gated_shell"
  | "future_scoped_shell"
  | "forbidden";

export type FilesAdapterReadiness = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    level: FilesAdapterAccessLevel;
    reason: string;
  };
  adapter: {
    module: "files";
    label: "Files";
    sourceOwner: "file-engine";
    status: "contract_ready" | "schema_ready" | "not_configured" | "schema_incomplete";
    contractRoute: "/api/crays/modules/files";
    readinessRoute: "/api/crays/files/adapter/readiness";
    integrationBoundary: string;
    profileRule: string;
    capabilities: {
      read: "contract_ready";
      metadata: "contract_ready";
      write: "blocked";
      upload: "blocked";
      binaryFile: "blocked";
      preview: "blocked";
      publicRelease: "blocked";
      externalShare: "blocked";
      event: "contract_only";
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
  documentSurface: {
    metadataTablesReady: boolean;
    missingMetadataTables: string[];
    internalCountsReturned: boolean;
    currentDocumentPackageLinks: number;
    currentApprovedDocumentPackageLinks: number;
    currentEvidencePackages: number;
    currentInternalEvidencePackages: number;
    currentCandidateReleasedEvidencePackages: number;
    currentBankReleasedEvidencePackages: number;
    currentDocumentWorkflowEvents: number;
    liveMetadataRowsReturned: false;
  };
  mappingStrategy: {
    externalRecordMapsReady: boolean;
    externalSystemKey: "file-engine";
    internalCountsReturned: boolean;
    entityPairs: Array<{
      sourceEntity: string;
      craysEntity: string;
      mappingStatus: "contract_ready" | "blocked_until_schema_change" | "future";
    }>;
    currentFileConnections: number;
    currentFileExternalMaps: number;
    currentFileSyncJobs: number;
  };
  health: {
    coreDbConfigured: boolean;
    metadataTablesReady: boolean;
    integrationTablesReady: boolean;
    missingMetadataTables: string[];
    missingIntegrationTables: string[];
    liveSourceProbePerformed: false;
    sourceApiCalled: false;
    sourceUiEmbedded: false;
    binaryStorageConfigured: false;
    privatePreviewChecked: false;
    lastReadOnlySmokeAt: null;
    operationalRisk: "vps_inventory_required" | "upload_storage_not_approved" | "schema_incomplete";
  };
  boundaries: {
    readOnly: true;
    metadataOnly: true;
    binaryUploadEnabled: false;
    filePreviewEnabled: false;
    privateFilePreviewEnabled: false;
    publicFileReleaseEnabled: false;
    sourceFileDownloadEnabled: false;
    externalShareLinkEnabled: false;
    packageLinkWriteEnabled: false;
    versionWriteEnabled: false;
    accessGrantWriteEnabled: false;
    fileDeleteEnabled: false;
    syncWritesEnabled: false;
    sourceUiExposureEnabled: false;
    providerCallsEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    bankReleaseEnabled: false;
    publicReleaseEnabled: false;
  };
  liveFileRecordsReturned: false;
  liveDocumentRecordsReturned: false;
  liveBinaryFilesReturned: false;
  livePrivatePreviewsReturned: false;
  liveSourceRecordsReturned: false;
  liveBusinessRecordsReturned: false;
  providerCallsEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

type TableName = (typeof expectedMetadataTables)[number] | (typeof expectedIntegrationTables)[number];

type MetadataCounts = Pick<
  FilesAdapterReadiness["documentSurface"],
  | "currentDocumentPackageLinks"
  | "currentApprovedDocumentPackageLinks"
  | "currentEvidencePackages"
  | "currentInternalEvidencePackages"
  | "currentCandidateReleasedEvidencePackages"
  | "currentBankReleasedEvidencePackages"
  | "currentDocumentWorkflowEvents"
>;

function accessForRole(role: RoleKey): FilesAdapterReadiness["access"] {
  if (internalMetadataRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_metadata_readiness",
      reason: "Role can review Files metadata bridge readiness before binary uploads, previews, public file release or external shares are enabled.",
    };
  }

  if (releaseShellRoles.includes(role)) {
    return {
      allowed: true,
      level: "release_gated_shell",
      reason: "Role can read the release-gated Files metadata shell, but no internal counts, file contents or private previews.",
    };
  }

  if (futureScopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "future_scoped_shell",
      reason: "Role can see the future scoped Files metadata shell only after handoff and document-scope rules are approved.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Files adapter readiness requires internal document metadata scope or an approved release-gated shell.",
  };
}

function countsAllowed(level: FilesAdapterAccessLevel) {
  return level === "internal_metadata_readiness";
}

function zeroMetadataCounts(): MetadataCounts {
  return {
    currentDocumentPackageLinks: 0,
    currentApprovedDocumentPackageLinks: 0,
    currentEvidencePackages: 0,
    currentInternalEvidencePackages: 0,
    currentCandidateReleasedEvidencePackages: 0,
    currentBankReleasedEvidencePackages: 0,
    currentDocumentWorkflowEvents: 0,
  };
}

function zeroIntegrationCounts() {
  return {
    currentFileConnections: 0,
    currentFileExternalMaps: 0,
    currentFileSyncJobs: 0,
  };
}

function firstEntities(): FilesAdapterReadiness["firstEntities"] {
  return [
    {
      key: "document-package-links",
      label: "Document package links",
      sourceEntity: "DocumentLink",
      craysTarget: "Prepared-offer, bank-package, property-case and opening-project package metadata",
      firstReadScope: "Package type, linked document reference, document group, status and visibility roles.",
    },
    {
      key: "evidence-packages",
      label: "Evidence packages",
      sourceEntity: "Package",
      craysTarget: "Candidate, bank, owner and internal evidence package metadata",
      firstReadScope: "Related entity, owner role, release state, visibility roles and approval metadata.",
    },
    {
      key: "release-states",
      label: "Release states",
      sourceEntity: "ReleaseState",
      craysTarget: "Candidate, bank and owner document visibility gates",
      firstReadScope: "Metadata-only gate state; no file body, preview or external share.",
    },
    {
      key: "version-metadata",
      label: "Version metadata",
      sourceEntity: "Version",
      craysTarget: "Future immutable document version index",
      firstReadScope: "Future metadata only after version persistence is approved.",
    },
    {
      key: "access-grants",
      label: "Access grants",
      sourceEntity: "Grant",
      craysTarget: "Role, organization and entity-scoped document access",
      firstReadScope: "Visibility roles and release-scope metadata only.",
    },
  ];
}

function readModels(): FilesAdapterReadiness["readModels"] {
  return [
    {
      key: "candidate-evidence-metadata",
      label: "Candidate evidence metadata",
      ownerRole: "deal-manager",
      status: "contract_ready",
    },
    {
      key: "bank-package-document-set",
      label: "Bank package document set",
      ownerRole: "finance",
      status: "contract_ready",
    },
    {
      key: "property-case-documentation",
      label: "Property case documentation",
      ownerRole: "expansion-manager",
      status: "contract_ready",
    },
    {
      key: "opening-project-document-set",
      label: "Opening project document set",
      ownerRole: "deal-manager",
      status: "future_scoped",
    },
    {
      key: "communication-attachment-metadata",
      label: "Communication attachment metadata",
      ownerRole: "reviewer",
      status: "future_scoped",
    },
  ];
}

function allowedReadScopes(): FilesAdapterReadiness["allowedReadScopes"] {
  return [
    {
      role: "deal-manager",
      scope: "Prepared-offer, Candidate deal, property-case handoff and bank-package preparation document metadata.",
      records: ["Document package links", "Evidence packages", "Release states"],
    },
    {
      role: "expansion-manager",
      scope: "Property-case, owner-submitted and location evidence document metadata before handoff.",
      records: ["Document package links", "Evidence packages", "Property documentation"],
    },
    {
      role: "finance",
      scope: "Bank-package, finance, tax and accounting document metadata only.",
      records: ["Bank package document set", "Evidence packages", "Release states"],
    },
    {
      role: "franchise-candidate",
      scope: "Own released Candidate evidence metadata only after offer and evidence release.",
      records: ["Candidate evidence metadata", "Approved document links"],
    },
    {
      role: "bank-partner",
      scope: "Released bank-package document metadata only after lender release.",
      records: ["Bank package document set", "Release states"],
    },
    {
      role: "reviewer",
      scope: "Document approval and exception queues across scoped packages.",
      records: ["Document package links", "Evidence packages", "Release states"],
    },
  ];
}

function blockedWriteScopes(): FilesAdapterReadiness["blockedWriteScopes"] {
  return [
    {
      key: "binary-upload",
      label: "Upload binary files",
      blockedUntil: "Upload storage, virus scanning, versioning, retention and access policy are approved.",
    },
    {
      key: "file-preview",
      label: "Preview private files",
      blockedUntil: "Signed preview, watermarking, audit and revocation rules are approved.",
    },
    {
      key: "public-file-release",
      label: "Release files publicly",
      blockedUntil: "Public release workflow, reviewer approval and takedown policy are approved.",
    },
    {
      key: "external-share-link",
      label: "Create external share links",
      blockedUntil: "Consent, expiry, recipient scope and audit policy are approved.",
    },
    {
      key: "version-write",
      label: "Create document versions",
      blockedUntil: "Immutable version model and rollback behavior are approved.",
    },
    {
      key: "package-link-write",
      label: "Create or update package links",
      blockedUntil: "Document ownership, release gates and idempotent write policy are approved.",
    },
  ];
}

async function existingTables(tableNames: readonly TableName[]) {
  const pool = getCorePgPool();
  const result = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [tableNames],
  );

  return new Set(result.rows.map((row) => row.table_name));
}

async function fileIntegrationCounts() {
  const pool = getCorePgPool();

  const connectionResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.integration_connections
      where module_key = 'files'
    `,
  );
  const mapResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.external_record_maps
      where external_system = 'file-engine'
         or metadata ->> 'moduleKey' = 'files'
    `,
  );
  const syncJobResult = await pool.query<{ row_count: string }>(
    `
      select count(*)::text as row_count
      from crays_core.sync_jobs sync_jobs
      left join crays_core.integration_connections connections
        on connections.connection_id = sync_jobs.connection_id
      where connections.module_key = 'files'
         or sync_jobs.payload_summary ->> 'moduleKey' = 'files'
    `,
  );

  return {
    currentFileConnections: Number(connectionResult.rows[0]?.row_count ?? 0),
    currentFileExternalMaps: Number(mapResult.rows[0]?.row_count ?? 0),
    currentFileSyncJobs: Number(syncJobResult.rows[0]?.row_count ?? 0),
  };
}

async function fileMetadataCounts(): Promise<MetadataCounts> {
  const pool = getCorePgPool();
  const result = await pool.query<{
    document_package_links: string;
    approved_document_package_links: string;
    evidence_packages: string;
    internal_evidence_packages: string;
    candidate_released_evidence_packages: string;
    bank_released_evidence_packages: string;
    document_workflow_events: string;
  }>(
    `
      select
        (select count(*)::text from crays_core.document_package_links) as document_package_links,
        (select count(*)::text from crays_core.document_package_links where status = 'approved') as approved_document_package_links,
        (select count(*)::text from crays_core.evidence_packages) as evidence_packages,
        (select count(*)::text from crays_core.evidence_packages where release_state = 'internal') as internal_evidence_packages,
        (select count(*)::text from crays_core.evidence_packages where release_state = 'candidate_released') as candidate_released_evidence_packages,
        (select count(*)::text from crays_core.evidence_packages where release_state = 'bank_released') as bank_released_evidence_packages,
        (select count(*)::text from crays_core.workflow_events where related_entity_type in ('document', 'evidence-package')) as document_workflow_events
    `,
  );
  const row = result.rows[0];

  return {
    currentDocumentPackageLinks: Number(row?.document_package_links ?? 0),
    currentApprovedDocumentPackageLinks: Number(row?.approved_document_package_links ?? 0),
    currentEvidencePackages: Number(row?.evidence_packages ?? 0),
    currentInternalEvidencePackages: Number(row?.internal_evidence_packages ?? 0),
    currentCandidateReleasedEvidencePackages: Number(row?.candidate_released_evidence_packages ?? 0),
    currentBankReleasedEvidencePackages: Number(row?.bank_released_evidence_packages ?? 0),
    currentDocumentWorkflowEvents: Number(row?.document_workflow_events ?? 0),
  };
}

export async function getFilesAdapterReadiness(role: RoleKey): Promise<FilesAdapterReadiness> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);
  const adapter = adapterContractForModule("files");
  const profile = integrationProfileForModule("files");

  if (!adapter || !profile) {
    throw new Error("Files adapter contract is not registered.");
  }

  let missingMetadataTables = [...expectedMetadataTables];
  let missingIntegrationTables = [...expectedIntegrationTables];
  let metadataTablesReady = false;
  let integrationTablesReady = false;
  let metadataCounts = zeroMetadataCounts();
  let integrationCounts = zeroIntegrationCounts();

  if (runtime.configured) {
    const [metadataExisting, integrationExisting] = await Promise.all([existingTables(expectedMetadataTables), existingTables(expectedIntegrationTables)]);
    missingMetadataTables = expectedMetadataTables.filter((tableName) => !metadataExisting.has(tableName));
    missingIntegrationTables = expectedIntegrationTables.filter((tableName) => !integrationExisting.has(tableName));
    metadataTablesReady = missingMetadataTables.length === 0;
    integrationTablesReady = missingIntegrationTables.length === 0;

    if (metadataTablesReady && countsAllowed(access.level)) {
      metadataCounts = await fileMetadataCounts();
    }
    if (integrationTablesReady && countsAllowed(access.level)) {
      integrationCounts = await fileIntegrationCounts();
    }
  }

  const status: FilesAdapterReadiness["adapter"]["status"] = !runtime.configured
    ? "not_configured"
    : metadataTablesReady && integrationTablesReady
      ? "schema_ready"
      : "schema_incomplete";

  return {
    configured: runtime.configured,
    role,
    access,
    adapter: {
      module: "files",
      label: "Files",
      sourceOwner: "file-engine",
      status,
      contractRoute: "/api/crays/modules/files",
      readinessRoute: "/api/crays/files/adapter/readiness",
      integrationBoundary: adapter.integrationBoundary,
      profileRule: profile.uiRule,
      capabilities: {
        read: "contract_ready",
        metadata: "contract_ready",
        write: "blocked",
        upload: "blocked",
        binaryFile: "blocked",
        preview: "blocked",
        publicRelease: "blocked",
        externalShare: "blocked",
        event: "contract_only",
      },
    },
    firstEntities: access.allowed ? firstEntities() : [],
    readModels: access.allowed ? readModels() : [],
    allowedReadScopes: access.allowed ? allowedReadScopes() : [],
    blockedWriteScopes: access.allowed ? blockedWriteScopes() : [],
    documentSurface: {
      metadataTablesReady,
      missingMetadataTables,
      internalCountsReturned: countsAllowed(access.level),
      ...metadataCounts,
      liveMetadataRowsReturned: false,
    },
    mappingStrategy: {
      externalRecordMapsReady: integrationTablesReady,
      externalSystemKey: "file-engine",
      internalCountsReturned: countsAllowed(access.level),
      entityPairs: [
        {
          sourceEntity: "Document",
          craysEntity: "document package link or evidence package metadata",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Version",
          craysEntity: "future immutable version metadata",
          mappingStatus: "future",
        },
        {
          sourceEntity: "Package",
          craysEntity: "evidence package or bank package document set",
          mappingStatus: "contract_ready",
        },
        {
          sourceEntity: "Grant",
          craysEntity: "visibility role, organization scope or explicit document grant",
          mappingStatus: "blocked_until_schema_change",
        },
        {
          sourceEntity: "Attachment",
          craysEntity: "communication attachment metadata",
          mappingStatus: "future",
        },
      ],
      ...integrationCounts,
    },
    health: {
      coreDbConfigured: runtime.configured,
      metadataTablesReady,
      integrationTablesReady,
      missingMetadataTables,
      missingIntegrationTables,
      liveSourceProbePerformed: false,
      sourceApiCalled: false,
      sourceUiEmbedded: false,
      binaryStorageConfigured: false,
      privatePreviewChecked: false,
      lastReadOnlySmokeAt: null,
      operationalRisk: !runtime.configured
        ? "vps_inventory_required"
        : metadataTablesReady && integrationTablesReady
          ? "upload_storage_not_approved"
          : "schema_incomplete",
    },
    boundaries: {
      readOnly: true,
      metadataOnly: true,
      binaryUploadEnabled: false,
      filePreviewEnabled: false,
      privateFilePreviewEnabled: false,
      publicFileReleaseEnabled: false,
      sourceFileDownloadEnabled: false,
      externalShareLinkEnabled: false,
      packageLinkWriteEnabled: false,
      versionWriteEnabled: false,
      accessGrantWriteEnabled: false,
      fileDeleteEnabled: false,
      syncWritesEnabled: false,
      sourceUiExposureEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      bankReleaseEnabled: false,
      publicReleaseEnabled: false,
    },
    liveFileRecordsReturned: false,
    liveDocumentRecordsReturned: false,
    liveBinaryFilesReturned: false,
    livePrivatePreviewsReturned: false,
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
