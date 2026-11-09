import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const releaseReadinessRoles: RoleKey[] = ["deal-manager", "reviewer", "crays-management", "admin"];

export type PreparedOfferReleaseGate = {
  key: string;
  label: string;
  status: "ready" | "pending" | "blocked";
  current: string;
  requiredFor: string;
};

export type PreparedOfferReleaseReadiness = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  offer: {
    offerId: string;
    propertyCaseId: string | null;
    title: string;
    market: string | null;
    status: string;
    candidateReleaseState: string;
    publicTeaserEnabled: boolean;
    partnerHandoffStatus: string;
    propertyCaseStatus: string | null;
    propertyCasePhase: string | null;
    propertyHandoffStatus: string | null;
    locationAnalysisLinked: boolean;
    evidencePackageLinked: boolean;
    latestEventAt: string | null;
  } | null;
  counts: {
    evidencePackages: number;
    releasableEvidencePackages: number;
    preparedOfferDocuments: number;
    approvedPreparedOfferDocuments: number;
    propertyCaseDocuments: number;
    approvedPropertyCaseDocuments: number;
    workflowEvents: number;
  };
  gates: PreparedOfferReleaseGate[];
  releaseDecision: {
    status: "not_ready" | "approval_required" | "already_released";
    readyForDecision: boolean;
    explicitDecisionRequired: boolean;
    requiredNextActions: string[];
  };
  liveBusinessRecordReturned: boolean;
  candidateReleaseEnabled: false;
  candidateReleasePerformed: boolean;
  candidatePrivateDataReturned: false;
  bankDataReturned: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  publicTeaserEnabled: boolean;
  secretsReturned: false;
  privateKeysReturned: false;
};

type PreparedOfferReleaseReadinessRow = {
  offer_id: string;
  property_case_id: string | null;
  title: string;
  market: string | null;
  status: string;
  candidate_release_state: string;
  public_teaser_enabled: boolean;
  partner_handoff_status: string;
  property_case_status: string | null;
  property_case_phase: string | null;
  property_handoff_status: string | null;
  location_analysis_linked: boolean;
  evidence_package_linked: boolean;
  evidence_packages: number;
  releasable_evidence_packages: number;
  prepared_offer_documents: number;
  approved_prepared_offer_documents: number;
  property_case_documents: number;
  approved_property_case_documents: number;
  workflow_events: number;
  latest_event_at: Date | null;
};

function accessForRole(role: RoleKey) {
  if (releaseReadinessRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can review Candidate release readiness before any release decision is executed.",
    };
  }

  return {
    allowed: false,
    reason: "Candidate release readiness stays with Deal Manager until an explicit release exists.",
  };
}

function emptyCounts(): PreparedOfferReleaseReadiness["counts"] {
  return {
    evidencePackages: 0,
    releasableEvidencePackages: 0,
    preparedOfferDocuments: 0,
    approvedPreparedOfferDocuments: 0,
    propertyCaseDocuments: 0,
    approvedPropertyCaseDocuments: 0,
    workflowEvents: 0,
  };
}

function emptyReadiness(role: RoleKey, configured: boolean, access = accessForRole(role)): PreparedOfferReleaseReadiness {
  return {
    configured,
    role,
    access,
    offer: null,
    counts: emptyCounts(),
    gates: [],
    releaseDecision: {
      status: "not_ready",
      readyForDecision: false,
      explicitDecisionRequired: true,
      requiredNextActions: access.allowed ? ["select_prepared_offer"] : [],
    },
    liveBusinessRecordReturned: false,
    candidateReleaseEnabled: false,
    candidateReleasePerformed: false,
    candidatePrivateDataReturned: false,
    bankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    publicTeaserEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function buildReleaseGates(row: PreparedOfferReleaseReadinessRow): PreparedOfferReleaseGate[] {
  const internalReviewStarted = row.status === "review" || row.status === "released";
  const propertyHandoffReady = row.property_case_status === "handoff_ready" && row.property_handoff_status === "ready";
  const evidenceReady = row.location_analysis_linked && row.evidence_package_linked && row.evidence_packages > 0;
  const approvedDocuments = row.approved_prepared_offer_documents + row.approved_property_case_documents;
  const allDocuments = row.prepared_offer_documents + row.property_case_documents;
  const documentsReady = approvedDocuments > 0;
  const publicTeaserDisabled = row.public_teaser_enabled === false;
  const candidateReleaseApproved = row.candidate_release_state !== "not_released";

  return [
    {
      key: "internal-review-started",
      label: "Internal review started",
      status: internalReviewStarted ? "ready" : "blocked",
      current: row.status,
      requiredFor: "Deal Manager release decision",
    },
    {
      key: "property-handoff-ready",
      label: "Property handoff ready",
      status: propertyHandoffReady ? "ready" : "blocked",
      current: `${row.property_case_status ?? "none"} / ${row.property_handoff_status ?? "none"}`,
      requiredFor: "Candidate-safe offer packaging",
    },
    {
      key: "evidence-linked",
      label: "Evidence linked",
      status: evidenceReady ? "ready" : row.evidence_packages > 0 ? "pending" : "blocked",
      current: `${row.evidence_packages} internal packages, ${row.releasable_evidence_packages} released`,
      requiredFor: "Candidate offer context",
    },
    {
      key: "document-package",
      label: "Document package",
      status: documentsReady ? "ready" : allDocuments > 0 ? "pending" : "blocked",
      current: `${approvedDocuments} approved of ${allDocuments}`,
      requiredFor: "Release review evidence",
    },
    {
      key: "public-teaser-disabled",
      label: "Public teaser disabled",
      status: publicTeaserDisabled ? "ready" : "blocked",
      current: row.public_teaser_enabled ? "enabled" : "disabled",
      requiredFor: "Controlled Candidate release",
    },
    {
      key: "candidate-release-decision",
      label: "Candidate release decision",
      status: candidateReleaseApproved ? "ready" : "blocked",
      current: row.candidate_release_state,
      requiredFor: "Explicit release approval",
    },
  ];
}

export async function getPreparedOfferReleaseReadiness(role: RoleKey, offerId?: string): Promise<PreparedOfferReleaseReadiness> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed) {
    return emptyReadiness(role, runtime.configured, access);
  }

  const requestedOfferId = offerId?.trim() ?? "";
  const result = await getCorePgPool().query<PreparedOfferReleaseReadinessRow>(
    `
      select
        prepared_offers.offer_id,
        prepared_offers.property_case_id,
        prepared_offers.title,
        prepared_offers.market,
        prepared_offers.status,
        prepared_offers.candidate_release_state,
        prepared_offers.public_teaser_enabled,
        prepared_offers.partner_handoff_status,
        property_cases.status as property_case_status,
        property_cases.current_phase as property_case_phase,
        property_cases.handoff_status as property_handoff_status,
        prepared_offers.location_analysis_id is not null as location_analysis_linked,
        prepared_offers.evidence_package_id is not null as evidence_package_linked,
        (
          select count(*)::int
          from crays_core.evidence_packages
          where (
            evidence_packages.related_entity_type = 'prepared-offer'
            and evidence_packages.related_entity_id = prepared_offers.offer_id
          )
          or evidence_packages.package_id = prepared_offers.evidence_package_id
          or (
            evidence_packages.related_entity_type = 'property-case'
            and evidence_packages.related_entity_id = prepared_offers.property_case_id
          )
        ) as evidence_packages,
        (
          select count(*)::int
          from crays_core.evidence_packages
          where (
            (
              evidence_packages.related_entity_type = 'prepared-offer'
              and evidence_packages.related_entity_id = prepared_offers.offer_id
            )
            or evidence_packages.package_id = prepared_offers.evidence_package_id
            or (
              evidence_packages.related_entity_type = 'property-case'
              and evidence_packages.related_entity_id = prepared_offers.property_case_id
            )
          )
          and evidence_packages.release_state in ('candidate_released', 'bank_released', 'owner_released')
        ) as releasable_evidence_packages,
        (
          select count(*)::int
          from crays_core.document_package_links
          where document_package_links.package_type = 'prepared-offer'
            and document_package_links.package_id = prepared_offers.offer_id
        ) as prepared_offer_documents,
        (
          select count(*)::int
          from crays_core.document_package_links
          where document_package_links.package_type = 'prepared-offer'
            and document_package_links.package_id = prepared_offers.offer_id
            and document_package_links.status = 'approved'
        ) as approved_prepared_offer_documents,
        (
          select count(*)::int
          from crays_core.document_package_links
          where document_package_links.package_type = 'property-case'
            and document_package_links.package_id = prepared_offers.property_case_id
        ) as property_case_documents,
        (
          select count(*)::int
          from crays_core.document_package_links
          where document_package_links.package_type = 'property-case'
            and document_package_links.package_id = prepared_offers.property_case_id
            and document_package_links.status = 'approved'
        ) as approved_property_case_documents,
        (
          select count(*)::int
          from crays_core.workflow_events
          where workflow_events.related_entity_type = 'prepared-offer'
            and workflow_events.related_entity_id = prepared_offers.offer_id
        ) as workflow_events,
        (
          select max(occurred_at)
          from crays_core.workflow_events
          where workflow_events.related_entity_type = 'prepared-offer'
            and workflow_events.related_entity_id = prepared_offers.offer_id
        ) as latest_event_at
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      where prepared_offers.owner_role = 'deal-manager'
        and coalesce(prepared_offers.metadata -> '__seed' ->> 'seed_batch_id', '') <> 'crays-benchmark-20260710-v1'
        and ($1 = '' or prepared_offers.offer_id = $1)
      order by
        case when prepared_offers.offer_id = $1 then 0 else 1 end,
        prepared_offers.updated_at desc
      limit 1
    `,
    [requestedOfferId],
  );
  const row = result.rows[0];

  if (!row) {
    return emptyReadiness(role, true, access);
  }

  const gates = buildReleaseGates(row);
  const technicalBlockingActions = gates.filter((gate) => gate.key !== "candidate-release-decision" && gate.status !== "ready").map((gate) => gate.key);
  const decisionBlocking = gates.find((gate) => gate.key === "candidate-release-decision" && gate.status !== "ready");
  const readyForDecision = technicalBlockingActions.length === 0;
  const candidateReleasePerformed = row.candidate_release_state !== "not_released";

  return {
    configured: true,
    role,
    access,
    offer: {
      offerId: row.offer_id,
      propertyCaseId: row.property_case_id,
      title: row.title,
      market: row.market,
      status: row.status,
      candidateReleaseState: row.candidate_release_state,
      publicTeaserEnabled: row.public_teaser_enabled,
      partnerHandoffStatus: row.partner_handoff_status,
      propertyCaseStatus: row.property_case_status,
      propertyCasePhase: row.property_case_phase,
      propertyHandoffStatus: row.property_handoff_status,
      locationAnalysisLinked: row.location_analysis_linked,
      evidencePackageLinked: row.evidence_package_linked,
      latestEventAt: row.latest_event_at?.toISOString() ?? null,
    },
    counts: {
      evidencePackages: row.evidence_packages,
      releasableEvidencePackages: row.releasable_evidence_packages,
      preparedOfferDocuments: row.prepared_offer_documents,
      approvedPreparedOfferDocuments: row.approved_prepared_offer_documents,
      propertyCaseDocuments: row.property_case_documents,
      approvedPropertyCaseDocuments: row.approved_property_case_documents,
      workflowEvents: row.workflow_events,
    },
    gates,
    releaseDecision: {
      status: candidateReleasePerformed ? "already_released" : readyForDecision ? "approval_required" : "not_ready",
      readyForDecision,
      explicitDecisionRequired: !candidateReleasePerformed,
      requiredNextActions: [...technicalBlockingActions, ...(decisionBlocking ? [decisionBlocking.key] : [])],
    },
    liveBusinessRecordReturned: true,
    candidateReleaseEnabled: false,
    candidateReleasePerformed,
    candidatePrivateDataReturned: false,
    bankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    publicTeaserEnabled: row.public_teaser_enabled,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
