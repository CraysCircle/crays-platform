import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const candidateEvidenceRoles: RoleKey[] = ["franchise-candidate", "reviewer", "crays-management", "admin"];

export type CandidateEvidenceItem = {
  offerId: string;
  title: string;
  market: string | null;
  candidateReleaseState: string;
  evidencePackages: number;
  approvedDocumentLinks: number;
  propertyHandoffStatus: string | null;
  updatedAt: string;
};

export type CandidateEvidenceReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  records: CandidateEvidenceItem[];
  summary: {
    offers: number;
    evidencePackages: number;
    approvedDocumentLinks: number;
  };
  releaseBoundary: {
    candidateRequiresAccountMapping: true;
    requiredOfferReleaseStates: string[];
    requiredEvidenceReleaseState: "candidate_released";
    unreleasedEvidenceReturned: false;
    releaseExecutionEnabled: false;
  };
  liveCandidateVisibleRecordsReturned: boolean;
  evidenceRecordsReturned: boolean;
  documentLinksReturned: boolean;
  internalReviewDataReturned: false;
  candidatePrivateDataReturned: false;
  bankDataReturned: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

type CandidateEvidenceRow = {
  offer_id: string;
  title: string;
  market: string | null;
  candidate_release_state: string;
  evidence_packages: number;
  approved_document_links: number;
  property_handoff_status: string | null;
  updated_at: Date;
};

function accessForRole(role: RoleKey) {
  if (candidateEvidenceRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can read Candidate evidence only after explicit offer and evidence release.",
    };
  }

  return {
    allowed: false,
    reason: "Candidate evidence requires account-scoped Candidate or review access.",
  };
}

function emptySummary(): CandidateEvidenceReadModel["summary"] {
  return {
    offers: 0,
    evidencePackages: 0,
    approvedDocumentLinks: 0,
  };
}

function releaseBoundary(): CandidateEvidenceReadModel["releaseBoundary"] {
  return {
    candidateRequiresAccountMapping: true,
    requiredOfferReleaseStates: ["detail_released", "reserved"],
    requiredEvidenceReleaseState: "candidate_released",
    unreleasedEvidenceReturned: false,
    releaseExecutionEnabled: false,
  };
}

function emptyReadModel(role: RoleKey, configured: boolean, access = accessForRole(role)): CandidateEvidenceReadModel {
  return {
    configured,
    role,
    access,
    records: [],
    summary: emptySummary(),
    releaseBoundary: releaseBoundary(),
    liveCandidateVisibleRecordsReturned: false,
    evidenceRecordsReturned: false,
    documentLinksReturned: false,
    internalReviewDataReturned: false,
    candidatePrivateDataReturned: false,
    bankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function summarize(records: CandidateEvidenceItem[]): CandidateEvidenceReadModel["summary"] {
  return records.reduce((summary, record) => {
    summary.offers += 1;
    summary.evidencePackages += record.evidencePackages;
    summary.approvedDocumentLinks += record.approvedDocumentLinks;
    return summary;
  }, emptySummary());
}

export async function getCandidateEvidenceReadModel(role: RoleKey): Promise<CandidateEvidenceReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed) {
    return emptyReadModel(role, runtime.configured, access);
  }

  const result = await getCorePgPool().query<CandidateEvidenceRow>(
    `
      select
        prepared_offers.offer_id,
        prepared_offers.title,
        prepared_offers.market,
        prepared_offers.candidate_release_state,
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
          and evidence_packages.release_state = 'candidate_released'
          and evidence_packages.visibility_roles ? 'franchise-candidate'
        ) as evidence_packages,
        (
          select count(*)::int
          from crays_core.document_package_links
          where (
            (
              document_package_links.package_type = 'prepared-offer'
              and document_package_links.package_id = prepared_offers.offer_id
            )
            or (
              document_package_links.package_type = 'property-case'
              and document_package_links.package_id = prepared_offers.property_case_id
            )
          )
          and document_package_links.status = 'approved'
          and document_package_links.visibility_roles ? 'franchise-candidate'
        ) as approved_document_links,
        property_cases.handoff_status as property_handoff_status,
        prepared_offers.updated_at
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      where prepared_offers.owner_role = 'deal-manager'
        and prepared_offers.status in ('review', 'released', 'reserved')
        and prepared_offers.candidate_release_state in ('detail_released', 'reserved')
      order by prepared_offers.updated_at desc
      limit 25
    `,
  );

  const records = result.rows.map((row) => ({
    offerId: row.offer_id,
    title: row.title,
    market: row.market,
    candidateReleaseState: row.candidate_release_state,
    evidencePackages: row.evidence_packages,
    approvedDocumentLinks: row.approved_document_links,
    propertyHandoffStatus: row.property_handoff_status,
    updatedAt: row.updated_at.toISOString(),
  }));
  const summary = summarize(records);

  return {
    configured: true,
    role,
    access,
    records,
    summary,
    releaseBoundary: releaseBoundary(),
    liveCandidateVisibleRecordsReturned: records.length > 0,
    evidenceRecordsReturned: summary.evidencePackages > 0,
    documentLinksReturned: summary.approvedDocumentLinks > 0,
    internalReviewDataReturned: false,
    candidatePrivateDataReturned: false,
    bankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
