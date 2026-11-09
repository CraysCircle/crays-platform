import { getCandidateDealPackageContract } from "@/lib/candidate-deal-package-contract";
import { getCandidateRegulatedChecksContract } from "@/lib/candidate-regulated-checks-contract";
import { getCoreDomainReadModelContract } from "@/lib/core-domain-contracts";
import type { RoleKey } from "@/lib/roles";
import { getCandidateDealRoomReadiness } from "./candidate-deal-room-readiness-repository";
import { getCandidateIntentReviewReadModel } from "./candidate-intent-repository";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { getCoreDomainReadiness, type CoreDomainSurfaceReadiness } from "./core-domain-repository";

const bankPackageReadinessRoles: RoleKey[] = ["deal-manager", "finance", "bank-partner", "reviewer", "crays-management", "admin"];
const internalReadinessRoles: RoleKey[] = ["deal-manager", "finance", "reviewer", "crays-management", "admin"];
const benchmarkSeedBatchId = "crays-benchmark-20260710-v1";

export type BankPackagePrerequisiteStatus = "ready" | "pending" | "blocked" | "decision_required" | "release_required";

export type BankPackagePrerequisite = {
  key: string;
  label: string;
  status: BankPackagePrerequisiteStatus;
  current: string;
  requiredFor: string;
  ownerRole: RoleKey;
};

export type BankPackageReadinessReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_readiness" | "external_release_shell" | "forbidden";
    reason: string;
  };
  contract: {
    key: "bank-packages";
    label: string;
    status: "contract_ready";
    primaryTables: string[];
    stages: Array<{
      key: string;
      label: string;
      ownerRole: RoleKey;
      gate: string;
    }>;
    bankHandoffPreconditions: string[];
  };
  domainSurface: {
    configured: boolean;
    schemaReady: boolean;
    queryStatus: CoreDomainSurfaceReadiness["queryStatus"];
    requiredTables: string[];
    missingTables: string[];
    rowCounts: Array<{ tableName: string; rowCount: number }>;
    totalRecords: number;
    liveRecordsReturned: false;
  };
  summary: {
    bankPackages: number;
    loanCases: number;
    financialModels: number;
    documentPackageLinks: number;
    candidateIntents: number;
    releasedOffers: number;
    readyPrerequisites: number;
    blockedPrerequisites: number;
    decisionRequiredPrerequisites: number;
  };
  prerequisites: BankPackagePrerequisite[];
  regulatedDecisionBrief: {
    path: string;
    requiredBeforeProviderIntegration: true;
    openDecisionCount: number;
  };
  bankPartnerScope: {
    authenticatedPartnerReadinessOnly: boolean;
    releaseRequiredBeforePackageAccess: true;
    internalCountsReturned: boolean;
    releasedPackageRecordsReturned: false;
  };
  boundaries: {
    bankPackageCreationEnabled: false;
    bankHandoffEnabled: false;
    lenderReleaseEnabled: false;
    candidateIntentWriteEnabled: false;
    candidateConsentCollectionEnabled: false;
    kycAmlStarted: false;
    equityCheckStarted: false;
    sourceOfFundsCollectionEnabled: false;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    liveCandidateDataReturned: false;
    liveBankDataReturned: false;
    liveProviderPayloadsReturned: false;
  };
  liveBankPackageRecordsReturned: false;
  liveLoanCaseRecordsReturned: false;
  liveFinancialModelRecordsReturned: false;
  liveCandidateDataReturned: false;
  liveBankDataReturned: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

type LegacyBankCountsRow = {
  bank_packages: string;
  loan_cases: string;
  financial_models: string;
  document_package_links: string;
};

function accessForRole(role: RoleKey): BankPackageReadinessReadModel["access"] {
  if (!bankPackageReadinessRoles.includes(role)) {
    return {
      allowed: false,
      level: "forbidden",
      reason: "Bank package readiness requires Deal Manager, Finance, Bank Partner or review scope.",
    };
  }

  if (role === "bank-partner") {
    return {
      allowed: true,
      level: "external_release_shell",
      reason: "Bank Partner can read the release-gated readiness shell, but no internal counts, Candidate data or package records.",
    };
  }

  return {
    allowed: true,
    level: "internal_readiness",
    reason: "Role can review bank package prerequisites before any package creation or lender release.",
  };
}

function emptyDomainSurface(configured: boolean): BankPackageReadinessReadModel["domainSurface"] {
  return {
    configured,
    schemaReady: false,
    queryStatus: configured ? "schema_incomplete" : "not_configured",
    requiredTables: ["bank_packages", "loan_cases", "financial_models", "document_package_links"],
    missingTables: ["bank_packages", "loan_cases", "financial_models", "document_package_links"],
    rowCounts: [],
    totalRecords: 0,
    liveRecordsReturned: false,
  };
}

function contractSummary(): BankPackageReadinessReadModel["contract"] {
  const bankContract = getCoreDomainReadModelContract("bank-packages");
  const dealPackageContract = getCandidateDealPackageContract();

  return {
    key: "bank-packages",
    label: bankContract.label,
    status: bankContract.status,
    primaryTables: bankContract.primaryTables,
    stages: bankContract.stages.map((stage) => ({
      key: stage.key,
      label: stage.label,
      ownerRole: stage.ownerRole,
      gate: stage.gate,
    })),
    bankHandoffPreconditions: dealPackageContract.bankHandoffPreconditions,
  };
}

function statusCounts(prerequisites: BankPackagePrerequisite[]) {
  return {
    readyPrerequisites: prerequisites.filter((gate) => gate.status === "ready").length,
    blockedPrerequisites: prerequisites.filter((gate) => gate.status === "blocked" || gate.status === "release_required").length,
    decisionRequiredPrerequisites: prerequisites.filter((gate) => gate.status === "decision_required").length,
  };
}

function buildPrerequisites(input: {
  role: RoleKey;
  internalCountsReturned: boolean;
  candidateIntents: number;
  releasedOffers: number;
  documentPackageLinks: number;
  bankPackages: number;
}) {
  const regulated = getCandidateRegulatedChecksContract(input.role);
  const hasCandidateIntent = input.internalCountsReturned && input.candidateIntents > 0;
  const hasReleasedOffer = input.internalCountsReturned && input.releasedOffers > 0;
  const hasBankDocuments = input.internalCountsReturned && input.documentPackageLinks > 0 && input.bankPackages > 0;

  return [
    {
      key: "candidate-account-scope",
      label: "Candidate account scope",
      status: "blocked",
      current: "No bank-package Candidate scope is released.",
      requiredFor: "Candidate-specific bank package preparation.",
      ownerRole: "admin",
    },
    {
      key: "purchase-or-financing-intent",
      label: "Purchase or financing intent",
      status: hasCandidateIntent ? "ready" : "blocked",
      current: hasCandidateIntent ? `${input.candidateIntents} internal intent records.` : "No eligible intent records.",
      requiredFor: "Regulated check preparation.",
      ownerRole: "deal-manager",
    },
    {
      key: "candidate-consent",
      label: "Candidate consent",
      status: regulated.currentState.consentRecorded ? "ready" : "decision_required",
      current: regulated.currentState.consentRecorded ? "Consent recorded." : "Consent wording and retention policy still require approval.",
      requiredFor: "KYC / AML, equity check and source-of-funds collection.",
      ownerRole: "finance",
    },
    {
      key: "kyc-aml",
      label: "KYC / AML",
      status: regulated.currentState.kycAmlStarted ? "pending" : "blocked",
      current: regulated.currentState.kycAmlStarted ? "Check flow started." : "No check started; provider calls disabled.",
      requiredFor: "Bank handoff.",
      ownerRole: "finance",
    },
    {
      key: "equity-check",
      label: "Equity check",
      status: regulated.currentState.equityCheckStarted ? "pending" : "decision_required",
      current: regulated.currentState.equityCheckStarted ? "Equity check started." : "Thresholds and evidence policy require approval.",
      requiredFor: "Bank handoff.",
      ownerRole: "finance",
    },
    {
      key: "source-of-funds",
      label: "Source of funds",
      status: regulated.currentState.sourceOfFundsStarted ? "pending" : "decision_required",
      current: regulated.currentState.sourceOfFundsStarted ? "Collection started." : "Collection is disabled until policy approval.",
      requiredFor: "Manual review and bank package readiness.",
      ownerRole: "finance",
    },
    {
      key: "prepared-deal-review",
      label: "Prepared deal review",
      status: hasReleasedOffer ? "pending" : "release_required",
      current: hasReleasedOffer ? `${input.releasedOffers} Candidate-visible offers.` : "No Candidate-visible released offers.",
      requiredFor: "Package source material.",
      ownerRole: "deal-manager",
    },
    {
      key: "bank-package-documents",
      label: "Bank package documents",
      status: hasBankDocuments ? "pending" : "blocked",
      current: hasBankDocuments ? "Document metadata exists, lender release still disabled." : "No released bank package document set.",
      requiredFor: "Lender package release.",
      ownerRole: "finance",
    },
    {
      key: "bank-package-release",
      label: "Bank package release",
      status: input.bankPackages > 0 ? "pending" : "blocked",
      current: input.bankPackages > 0 ? "Internal package records exist; release disabled." : "No bank package records.",
      requiredFor: "Bank Partner workspace access.",
      ownerRole: "finance",
    },
  ] satisfies BankPackagePrerequisite[];
}

function zeroSummary() {
  return {
    bankPackages: 0,
    loanCases: 0,
    financialModels: 0,
    documentPackageLinks: 0,
    candidateIntents: 0,
    releasedOffers: 0,
    readyPrerequisites: 0,
    blockedPrerequisites: 0,
    decisionRequiredPrerequisites: 0,
  };
}

async function getLegacyBankCounts() {
  const result = await getCorePgPool().query<LegacyBankCountsRow>(
    `
      select
        (
          select count(*)::text
          from crays_core.bank_packages
          where coalesce(metadata -> '__seed' ->> 'seed_batch_id', '') <> $1
        ) as bank_packages,
        (
          select count(*)::text
          from crays_core.loan_cases
          where coalesce(metadata -> '__seed' ->> 'seed_batch_id', '') <> $1
        ) as loan_cases,
        (
          select count(*)::text
          from crays_core.financial_models
          where coalesce(summary -> '__seed' ->> 'seed_batch_id', '') <> $1
        ) as financial_models,
        (
          select count(*)::text
          from crays_core.document_package_links
          where package_type in ('bank-package', 'loan-case')
            and coalesce(metadata -> '__seed' ->> 'seed_batch_id', '') <> $1
        ) as document_package_links
    `,
    [benchmarkSeedBatchId],
  );
  const row = result.rows[0];

  return {
    bankPackages: Number(row?.bank_packages ?? 0),
    loanCases: Number(row?.loan_cases ?? 0),
    financialModels: Number(row?.financial_models ?? 0),
    documentPackageLinks: Number(row?.document_package_links ?? 0),
  };
}

export async function getBankPackageReadiness(role: RoleKey): Promise<BankPackageReadinessReadModel> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);
  const regulated = getCandidateRegulatedChecksContract(role);
  const internalCountsReturned = internalReadinessRoles.includes(role);

  if (!access.allowed) {
    return {
      configured: runtime.configured,
      role,
      access,
      contract: contractSummary(),
      domainSurface: emptyDomainSurface(runtime.configured),
      summary: zeroSummary(),
      prerequisites: [],
      regulatedDecisionBrief: {
        path: regulated.decisionBrief.path,
        requiredBeforeProviderIntegration: true,
        openDecisionCount: regulated.decisionBrief.openDecisions.length,
      },
      bankPartnerScope: {
        authenticatedPartnerReadinessOnly: false,
        releaseRequiredBeforePackageAccess: true,
        internalCountsReturned: false,
        releasedPackageRecordsReturned: false,
      },
      boundaries: {
        bankPackageCreationEnabled: false,
        bankHandoffEnabled: false,
        lenderReleaseEnabled: false,
        candidateIntentWriteEnabled: false,
        candidateConsentCollectionEnabled: false,
        kycAmlStarted: false,
        equityCheckStarted: false,
        sourceOfFundsCollectionEnabled: false,
        providerCallsEnabled: false,
        fileUploadEnabled: false,
        externalSendingEnabled: false,
        publicReleaseEnabled: false,
        liveCandidateDataReturned: false,
        liveBankDataReturned: false,
        liveProviderPayloadsReturned: false,
      },
      liveBankPackageRecordsReturned: false,
      liveLoanCaseRecordsReturned: false,
      liveFinancialModelRecordsReturned: false,
      liveCandidateDataReturned: false,
      liveBankDataReturned: false,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  }

  const [domainReadiness, candidateIntents, dealRoomReadiness] = await Promise.all([
    internalCountsReturned ? getCoreDomainReadiness() : Promise.resolve(null),
    internalCountsReturned ? getCandidateIntentReviewReadModel(role) : Promise.resolve(null),
    internalCountsReturned ? getCandidateDealRoomReadiness("deal-manager") : Promise.resolve(null),
  ]);
  const bankSurface = domainReadiness?.surfaces.find((surface) => surface.key === "bank-packages") ?? null;
  const legacyCounts = internalCountsReturned && runtime.configured ? await getLegacyBankCounts() : zeroSummary();
  const legacyTotalRecords = legacyCounts.bankPackages + legacyCounts.loanCases + legacyCounts.financialModels;
  const legacyRowCounts = [
    { tableName: "bank_packages", rowCount: legacyCounts.bankPackages },
    { tableName: "loan_cases", rowCount: legacyCounts.loanCases },
    { tableName: "financial_models", rowCount: legacyCounts.financialModels },
    { tableName: "document_package_links", rowCount: legacyCounts.documentPackageLinks },
  ];
  const domainSurface: BankPackageReadinessReadModel["domainSurface"] = bankSurface
    ? {
        configured: domainReadiness?.configured ?? runtime.configured,
        schemaReady: domainReadiness?.schemaReady ?? false,
        queryStatus: bankSurface.missingTables.length > 0 ? "schema_incomplete" : legacyTotalRecords > 0 ? "ready_with_records" : "ready_empty",
        requiredTables: bankSurface.requiredTables,
        missingTables: bankSurface.missingTables,
        rowCounts: legacyRowCounts,
        totalRecords: legacyTotalRecords,
        liveRecordsReturned: false as const,
      }
    : emptyDomainSurface(runtime.configured);
  const bankPackages = internalCountsReturned ? legacyCounts.bankPackages : 0;
  const loanCases = internalCountsReturned ? legacyCounts.loanCases : 0;
  const financialModels = internalCountsReturned ? legacyCounts.financialModels : 0;
  const documentPackageLinks = internalCountsReturned ? legacyCounts.documentPackageLinks : 0;
  const candidateIntentCount = internalCountsReturned ? (candidateIntents?.summary.total ?? 0) : 0;
  const releasedOffers = internalCountsReturned ? (dealRoomReadiness?.summary.releasedOffers ?? 0) : 0;
  const prerequisites = buildPrerequisites({
    role,
    internalCountsReturned,
    candidateIntents: candidateIntentCount,
    releasedOffers,
    documentPackageLinks,
    bankPackages,
  });

  return {
    configured: runtime.configured,
    role,
    access,
    contract: contractSummary(),
    domainSurface,
    summary: {
      bankPackages,
      loanCases,
      financialModels,
      documentPackageLinks,
      candidateIntents: candidateIntentCount,
      releasedOffers,
      ...statusCounts(prerequisites),
    },
    prerequisites,
    regulatedDecisionBrief: {
      path: regulated.decisionBrief.path,
      requiredBeforeProviderIntegration: true,
      openDecisionCount: regulated.decisionBrief.openDecisions.length,
    },
    bankPartnerScope: {
      authenticatedPartnerReadinessOnly: role === "bank-partner",
      releaseRequiredBeforePackageAccess: true,
      internalCountsReturned,
      releasedPackageRecordsReturned: false,
    },
    boundaries: {
      bankPackageCreationEnabled: false,
      bankHandoffEnabled: false,
      lenderReleaseEnabled: false,
      candidateIntentWriteEnabled: false,
      candidateConsentCollectionEnabled: false,
      kycAmlStarted: regulated.currentState.kycAmlStarted,
      equityCheckStarted: regulated.currentState.equityCheckStarted,
      sourceOfFundsCollectionEnabled: regulated.boundary.sourceOfFundsCollectionEnabled,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      liveCandidateDataReturned: false,
      liveBankDataReturned: false,
      liveProviderPayloadsReturned: false,
    },
    liveBankPackageRecordsReturned: false,
    liveLoanCaseRecordsReturned: false,
    liveFinancialModelRecordsReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
