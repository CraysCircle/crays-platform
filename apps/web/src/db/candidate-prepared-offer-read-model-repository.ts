import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const candidatePreparedOfferRoles: RoleKey[] = ["guest", "franchise-candidate", "reviewer", "crays-management", "admin"];

export type CandidatePreparedOfferItem = {
  offerId: string;
  title: string;
  market: string | null;
  candidateReleaseState: string;
  publicTeaserEnabled: boolean;
  visibleAccessLevel: "public_teaser" | "account_required";
  propertyHandoffStatus: string | null;
  partnerHandoffStatus: string;
  updatedAt: string;
};

export type CandidatePreparedOfferReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  records: CandidatePreparedOfferItem[];
  summary: {
    total: number;
    publicTeasers: number;
    accountRequired: number;
    detailReleased: number;
    reserved: number;
  };
  releaseBoundary: {
    guestRequiresPublicTeaser: true;
    candidateRequiresAccountMapping: true;
    allowedReleaseStates: string[];
    unreleasedPreparedOffersReturned: false;
    releaseExecutionEnabled: false;
  };
  liveCandidateVisibleRecordsReturned: boolean;
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

type CandidatePreparedOfferRow = {
  offer_id: string;
  title: string;
  market: string | null;
  candidate_release_state: string;
  public_teaser_enabled: boolean;
  property_handoff_status: string | null;
  partner_handoff_status: string;
  updated_at: Date;
};

function accessForRole(role: RoleKey) {
  if (candidatePreparedOfferRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can read Candidate-visible prepared offers after explicit CRAYS release.",
    };
  }

  return {
    allowed: false,
    reason: "Candidate-visible prepared offers require a Candidate, Guest or review role.",
  };
}

function emptySummary() {
  return {
    total: 0,
    publicTeasers: 0,
    accountRequired: 0,
    detailReleased: 0,
    reserved: 0,
  };
}

function summarize(records: CandidatePreparedOfferItem[]) {
  return records.reduce((summary, record) => {
    summary.total += 1;
    if (record.visibleAccessLevel === "public_teaser") summary.publicTeasers += 1;
    if (record.visibleAccessLevel === "account_required") summary.accountRequired += 1;
    if (record.candidateReleaseState === "detail_released") summary.detailReleased += 1;
    if (record.candidateReleaseState === "reserved") summary.reserved += 1;
    return summary;
  }, emptySummary());
}

function baseReleaseBoundary(): CandidatePreparedOfferReadModel["releaseBoundary"] {
  return {
    guestRequiresPublicTeaser: true,
    candidateRequiresAccountMapping: true,
    allowedReleaseStates: ["teaser", "detail_released", "reserved"],
    unreleasedPreparedOffersReturned: false,
    releaseExecutionEnabled: false,
  };
}

function emptyReadModel(role: RoleKey, configured: boolean, access = accessForRole(role)): CandidatePreparedOfferReadModel {
  return {
    configured,
    role,
    access,
    records: [],
    summary: emptySummary(),
    releaseBoundary: baseReleaseBoundary(),
    liveCandidateVisibleRecordsReturned: false,
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

export async function getCandidatePreparedOfferReadModel(role: RoleKey): Promise<CandidatePreparedOfferReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed) {
    return emptyReadModel(role, runtime.configured, access);
  }

  const result = await getCorePgPool().query<CandidatePreparedOfferRow>(
    `
      select
        prepared_offers.offer_id,
        prepared_offers.title,
        prepared_offers.market,
        prepared_offers.candidate_release_state,
        prepared_offers.public_teaser_enabled,
        property_cases.handoff_status as property_handoff_status,
        prepared_offers.partner_handoff_status,
        prepared_offers.updated_at
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      where prepared_offers.owner_role = 'deal-manager'
        and prepared_offers.status in ('review', 'released', 'reserved')
        and prepared_offers.candidate_release_state in ('teaser', 'detail_released', 'reserved')
        and (
          $1 <> 'guest'
          or prepared_offers.public_teaser_enabled = true
        )
      order by prepared_offers.updated_at desc
      limit 25
    `,
    [role],
  );

  const records = result.rows.map((row) => ({
    offerId: row.offer_id,
    title: row.title,
    market: row.market,
    candidateReleaseState: row.candidate_release_state,
    publicTeaserEnabled: row.public_teaser_enabled,
    visibleAccessLevel: row.public_teaser_enabled ? ("public_teaser" as const) : ("account_required" as const),
    propertyHandoffStatus: row.property_handoff_status,
    partnerHandoffStatus: row.partner_handoff_status,
    updatedAt: row.updated_at.toISOString(),
  }));

  return {
    configured: true,
    role,
    access,
    records,
    summary: summarize(records),
    releaseBoundary: baseReleaseBoundary(),
    liveCandidateVisibleRecordsReturned: records.length > 0,
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
