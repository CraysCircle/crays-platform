import { stageLoansChecklistCommand, type StageLoansChecklistCommandInput } from "./core-command-write-repository";
import { getBankReadinessWorkbenchReadModel } from "./bank-readiness-workbench-read-model-repository";
import { getCandidateIntentPersistenceReadiness } from "./candidate-intent-persistence-readiness-repository";
import { getCandidateIntentReviewReadModel } from "./candidate-intent-repository";
import type { RoleKey } from "@/lib/roles";

type CandidateFinancingPrepMode = "internal_prep_workflow" | "candidate_shell" | "forbidden";
type PrepStatus = "ready" | "attention" | "blocked";

export type CandidateFinancingPrepWorkbenchReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    mode: CandidateFinancingPrepMode;
    canViewInternalRecords: boolean;
    canStageChecklistDraft: boolean;
    canStartRegulatedChecks: false;
    canReleaseToBank: false;
  };
  activeCase: {
    preparedOfferId: string;
    dealId: string | null;
    propertyCaseId: string | null;
    title: string;
    market: string;
  } | null;
  candidateIntent: {
    persistenceReady: boolean;
    records: number;
    purchase: number;
    financing: number;
    writeGate: "release_required" | "candidate_account_required" | "candidate_acknowledgement_required";
  };
  financingPrep: {
    sourceOfFundsReadiness: string;
    accountInformationReadiness: string;
    transactionEvidenceReadiness: string;
    evidenceConsentState: string;
    approvedDocuments: number;
    totalDocuments: number;
  };
  stages: Array<{
    key: string;
    label: string;
    ownerRole: string;
    status: PrepStatus;
    current: string;
    nextAction: string;
  }>;
  nextAction: {
    label: string;
    priority: "high" | "normal";
    actionKey: "source-of-funds" | "candidate-intent" | "review-only";
  };
  history: Array<{
    commandId: string;
    label: string;
    actorRole: string;
    commandStatus: string;
    targetApplyStatus: string;
    applyGate: string;
    createdAt: string;
  }>;
  boundaries: {
    candidateIntentRecordsReturned: boolean;
    candidatePrivateDataReturned: false;
    sourceOfFundsCollectionStarted: false;
    regulatedChecksStarted: false;
    bankWorkflowStartEnabled: false;
    bankPackageCreationEnabled: false;
    bankSendEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    externalSendingEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "not_found" | "forbidden";
};

const internalRoles: RoleKey[] = ["deal-manager", "finance", "reviewer", "crays-management", "admin"];
const shellRoles: RoleKey[] = ["franchise-candidate"];

function accessForRole(role: RoleKey): CandidateFinancingPrepWorkbenchReadModel["access"] {
  if (internalRoles.includes(role)) {
    return {
      role,
      allowed: true,
      mode: "internal_prep_workflow",
      canViewInternalRecords: true,
      canStageChecklistDraft: role === "deal-manager" || role === "finance" || role === "reviewer" || role === "admin" || role === "crays-management",
      canStartRegulatedChecks: false,
      canReleaseToBank: false,
    };
  }

  if (shellRoles.includes(role)) {
    return {
      role,
      allowed: true,
      mode: "candidate_shell",
      canViewInternalRecords: false,
      canStageChecklistDraft: false,
      canStartRegulatedChecks: false,
      canReleaseToBank: false,
    };
  }

  return {
    role,
    allowed: false,
    mode: "forbidden",
    canViewInternalRecords: false,
    canStageChecklistDraft: false,
    canStartRegulatedChecks: false,
    canReleaseToBank: false,
  };
}

function prepStatus(value: string): PrepStatus {
  if (["ready", "cleared", "approved", "passed"].includes(value)) return "ready";
  if (["pending", "review", "partial", "requested", "in_review"].includes(value)) return "attention";
  return "blocked";
}

function words(value: string) {
  return value.replaceAll("_", " ");
}

function emptyReadModel(role: RoleKey, queryStatus: CandidateFinancingPrepWorkbenchReadModel["queryStatus"]): CandidateFinancingPrepWorkbenchReadModel {
  const access = accessForRole(role);
  return {
    access,
    activeCase: null,
    candidateIntent: {
      persistenceReady: false,
      records: 0,
      purchase: 0,
      financing: 0,
      writeGate: "release_required",
    },
    financingPrep: {
      sourceOfFundsReadiness: "not_started",
      accountInformationReadiness: "not_requested",
      transactionEvidenceReadiness: "not_requested",
      evidenceConsentState: "not_requested",
      approvedDocuments: 0,
      totalDocuments: 0,
    },
    stages: [],
    nextAction: {
      label: access.allowed ? "Open a released candidate offer before intent can be recorded." : "Candidate financing prep is not available to this role.",
      priority: "normal",
      actionKey: "review-only",
    },
    history: [],
    boundaries: {
      candidateIntentRecordsReturned: false,
      candidatePrivateDataReturned: false,
      sourceOfFundsCollectionStarted: false,
      regulatedChecksStarted: false,
      bankWorkflowStartEnabled: false,
      bankPackageCreationEnabled: false,
      bankSendEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      externalSendingEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus,
  };
}

function buildStages(input: {
  persistenceReady: boolean;
  intentRecords: number;
  sourceOfFundsReadiness: string;
  consentState: string;
  approvedDocuments: number;
  totalDocuments: number;
}): CandidateFinancingPrepWorkbenchReadModel["stages"] {
  return [
    {
      key: "released-offer",
      label: "Released offer scope",
      ownerRole: "Deal Manager",
      status: input.persistenceReady ? ("attention" as const) : ("blocked" as const),
      current: input.persistenceReady ? "Candidate intent persistence is ready; offer release still controls write access." : "Intent persistence is not ready.",
      nextAction: "Confirm candidate-scoped release before any Candidate write.",
    },
    {
      key: "candidate-intent",
      label: "Purchase or financing intent",
      ownerRole: "Candidate",
      status: input.intentRecords > 0 ? ("ready" as const) : input.persistenceReady ? ("attention" as const) : ("blocked" as const),
      current: `${input.intentRecords} intent records available for internal review.`,
      nextAction: input.intentRecords > 0 ? "Review intent and financing route." : "Prepare intent capture once candidate release and account mapping are present.",
    },
    {
      key: "source-of-funds",
      label: "Source-of-funds readiness",
      ownerRole: "Finance",
      status: prepStatus(input.sourceOfFundsReadiness),
      current: `Source-of-funds state is ${words(input.sourceOfFundsReadiness)}.`,
      nextAction: "Stage a source-of-funds checklist draft for finance review.",
    },
    {
      key: "evidence-consent",
      label: "Evidence consent",
      ownerRole: "Candidate Experience",
      status: prepStatus(input.consentState),
      current: `${input.approvedDocuments}/${input.totalDocuments} documents are approved in the current package.`,
      nextAction: "Keep evidence collection separated from regulated checks.",
    },
    {
      key: "regulated-checks",
      label: "Regulated checks",
      ownerRole: "Compliance",
      status: "blocked" as const,
      current: "No regulated check is started from this workbench.",
      nextAction: "Open only through the exact regulated workflow gate.",
    },
  ];
}

function nextAction(stages: ReturnType<typeof buildStages>): CandidateFinancingPrepWorkbenchReadModel["nextAction"] {
  const sourceOfFunds = stages.find((stage) => stage.key === "source-of-funds");
  if (sourceOfFunds && sourceOfFunds.status !== "ready") {
    return {
      label: sourceOfFunds.nextAction,
      priority: "high",
      actionKey: "source-of-funds",
    };
  }
  const candidateIntent = stages.find((stage) => stage.key === "candidate-intent");
  if (candidateIntent && candidateIntent.status !== "ready") {
    return {
      label: candidateIntent.nextAction,
      priority: "normal",
      actionKey: "candidate-intent",
    };
  }
  return {
    label: "Review candidate financing readiness and keep bank handoff closed.",
    priority: "normal",
    actionKey: "review-only",
  };
}

export async function getCandidateFinancingPrepWorkbenchReadModel(role: RoleKey): Promise<CandidateFinancingPrepWorkbenchReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) return emptyReadModel(role, "forbidden");
  if (access.mode === "candidate_shell") return emptyReadModel(role, "schema_ready");

  const [bankReadiness, intentReadiness, intentReview] = await Promise.all([
    getBankReadinessWorkbenchReadModel({ role: role === "finance" ? "finance" : "deal-manager" }),
    getCandidateIntentPersistenceReadiness(),
    getCandidateIntentReviewReadModel("deal-manager"),
  ]);

  if (bankReadiness.queryStatus !== "schema_ready" || !bankReadiness.case) {
    return emptyReadModel(role, bankReadiness.queryStatus === "not_configured" ? "not_configured" : "not_found");
  }

  const stages = buildStages({
    persistenceReady: intentReadiness.migrationApplied,
    intentRecords: intentReview.summary.total,
    sourceOfFundsReadiness: bankReadiness.evidence.sourceOfFundsReadiness,
    consentState: bankReadiness.evidence.consentState,
    approvedDocuments: bankReadiness.evidence.approvedDocuments,
    totalDocuments: bankReadiness.evidence.totalDocuments,
  });

  return {
    access,
    activeCase: {
      preparedOfferId: bankReadiness.case.preparedOfferId,
      dealId: bankReadiness.case.dealId,
      propertyCaseId: bankReadiness.case.propertyCaseId,
      title: bankReadiness.case.title,
      market: bankReadiness.case.market,
    },
    candidateIntent: {
      persistenceReady: intentReadiness.migrationApplied,
      records: intentReview.summary.total,
      purchase: intentReview.summary.purchase,
      financing: intentReview.summary.financing,
      writeGate: "release_required",
    },
    financingPrep: {
      sourceOfFundsReadiness: bankReadiness.evidence.sourceOfFundsReadiness,
      accountInformationReadiness: bankReadiness.evidence.accountInformationReadiness,
      transactionEvidenceReadiness: bankReadiness.evidence.transactionEvidenceReadiness,
      evidenceConsentState: bankReadiness.evidence.consentState,
      approvedDocuments: bankReadiness.evidence.approvedDocuments,
      totalDocuments: bankReadiness.evidence.totalDocuments,
    },
    stages,
    nextAction: nextAction(stages),
    history: bankReadiness.history.map((item) => ({
      commandId: item.commandId,
      label: item.label,
      actorRole: item.actorRole,
      commandStatus: item.commandStatus,
      targetApplyStatus: item.targetApplyStatus,
      applyGate: item.applyGate,
      createdAt: item.createdAt,
    })),
    boundaries: {
      candidateIntentRecordsReturned: intentReview.summary.total > 0,
      candidatePrivateDataReturned: false,
      sourceOfFundsCollectionStarted: false,
      regulatedChecksStarted: false,
      bankWorkflowStartEnabled: false,
      bankPackageCreationEnabled: false,
      bankSendEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      externalSendingEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus: "schema_ready",
  };
}

export async function stageCandidateFinancingPrepCommand(input: { role: RoleKey; actionKey?: string | null }) {
  const readModel = await getCandidateFinancingPrepWorkbenchReadModel(input.role);
  if (!readModel.access.allowed) return { status: "forbidden" as const, readModel, result: null };
  if (!readModel.access.canStageChecklistDraft || !readModel.activeCase) return { status: "blocked" as const, readModel, result: null };

  const actionKey = input.actionKey === "candidate-intent" ? "candidate-intent" : "source-of-funds";
  const commandInput: StageLoansChecklistCommandInput = {
    idempotencyKey: `candidate-financing-prep:${actionKey}:${input.role}:${readModel.activeCase.preparedOfferId}`,
    actorRole: input.role === "finance" ? "finance" : input.role === "reviewer" ? "reviewer" : input.role === "crays-management" ? "crays-management" : input.role === "admin" ? "admin" : "deal-manager",
    preparedOfferId: readModel.activeCase.preparedOfferId,
    dealId: readModel.activeCase.dealId,
    propertyCaseId: readModel.activeCase.propertyCaseId,
    commandType: "bank_package_checklist",
    action: "update_checklist",
    title: actionKey === "candidate-intent" ? "Prepare candidate intent review" : "Prepare source-of-funds review",
    notes:
      actionKey === "candidate-intent"
        ? "Candidate intent review draft staged from financing prep workbench. Candidate release, regulated checks, bank handoff and external sending remain closed."
        : "Source-of-funds checklist draft staged from financing prep workbench. Evidence collection, regulated checks, bank handoff and external sending remain closed.",
    status: "drafted",
    checklistItemKey: actionKey,
  };

  const result = await stageLoansChecklistCommand(commandInput);
  return { status: result.created ? ("created" as const) : ("idempotent_existing" as const), readModel, result };
}
