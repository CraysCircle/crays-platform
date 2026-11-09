import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const preparedOfferReviewRoles: RoleKey[] = ["deal-manager", "reviewer", "crays-management", "admin"];

export type PreparedOfferReviewItem = {
  offerId: string;
  propertyCaseId: string | null;
  title: string;
  market: string | null;
  ownerRole: string;
  status: string;
  candidateReleaseState: string;
  publicTeaserEnabled: boolean;
  partnerHandoffStatus: string;
  propertyCaseStatus: string | null;
  propertyCasePhase: string | null;
  propertyHandoffStatus: string | null;
  locationAnalysisLinked: boolean;
  evidencePackageLinked: boolean;
  eventCount: number;
  latestEventAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PreparedOfferReviewReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  records: PreparedOfferReviewItem[];
  summary: {
    total: number;
    draft: number;
    review: number;
    released: number;
    candidateReleased: number;
    publicTeaserEnabled: number;
  };
  liveBusinessRecordsReturned: boolean;
  candidatePrivateDataReturned: false;
  bankDataReturned: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type PreparedOfferTransitionInput = {
  offerId: string;
  role: RoleKey;
  transition: "start_review";
};

export type PreparedOfferTransitionResult = {
  status: "transitioned" | "already_transitioned";
  offerId: string;
  fromStatus: string;
  toStatus: "review";
  eventId: string;
  updatedRows: {
    preparedOffers: number;
    workflowEvents: number;
  };
  candidateReleaseEnabled: false;
  publicReleaseEnabled: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

type PreparedOfferReviewRow = {
  offer_id: string;
  property_case_id: string | null;
  title: string;
  market: string | null;
  owner_role: string;
  status: string;
  candidate_release_state: string;
  public_teaser_enabled: boolean;
  partner_handoff_status: string;
  property_case_status: string | null;
  property_case_phase: string | null;
  property_handoff_status: string | null;
  location_analysis_linked: boolean;
  evidence_package_linked: boolean;
  event_count: number;
  latest_event_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type PreparedOfferTransitionRow = {
  offer_id: string;
  owner_role: string;
  status: string;
  candidate_release_state: string;
  public_teaser_enabled: boolean;
  location_analysis_id: string | null;
  evidence_package_id: string | null;
};

function accessForRole(role: RoleKey) {
  if (preparedOfferReviewRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can review internal prepared-offer drafts before Candidate release.",
    };
  }

  return {
    allowed: false,
    reason: "Prepared-offer drafts stay with Deal Manager until a reviewed release exists.",
  };
}

function emptySummary() {
  return {
    total: 0,
    draft: 0,
    review: 0,
    released: 0,
    candidateReleased: 0,
    publicTeaserEnabled: 0,
  };
}

function summarize(records: PreparedOfferReviewItem[]) {
  return records.reduce((summary, record) => {
    summary.total += 1;
    if (record.status === "draft") summary.draft += 1;
    if (record.status === "review") summary.review += 1;
    if (record.status === "released") summary.released += 1;
    if (record.candidateReleaseState !== "not_released") summary.candidateReleased += 1;
    if (record.publicTeaserEnabled) summary.publicTeaserEnabled += 1;
    return summary;
  }, emptySummary());
}

function transitionEventId(offerId: string, transition: PreparedOfferTransitionInput["transition"]) {
  return `event_${offerId}_${transition}`;
}

export function canReviewPreparedOffers(role: RoleKey) {
  return accessForRole(role).allowed;
}

export async function getPreparedOfferReviewReadModel(role: RoleKey): Promise<PreparedOfferReviewReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed) {
    return {
      configured: runtime.configured,
      role,
      access,
      records: [],
      summary: emptySummary(),
      liveBusinessRecordsReturned: false,
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

  const result = await getCorePgPool().query<PreparedOfferReviewRow>(
    `
      with event_counts as (
        select
          related_entity_id,
          count(*)::int as event_count,
          max(occurred_at) as latest_event_at
        from crays_core.workflow_events
        where related_entity_type = 'prepared-offer'
        group by related_entity_id
      )
      select
        prepared_offers.offer_id,
        prepared_offers.property_case_id,
        prepared_offers.title,
        prepared_offers.market,
        prepared_offers.owner_role,
        prepared_offers.status,
        prepared_offers.candidate_release_state,
        prepared_offers.public_teaser_enabled,
        prepared_offers.partner_handoff_status,
        property_cases.status as property_case_status,
        property_cases.current_phase as property_case_phase,
        property_cases.handoff_status as property_handoff_status,
        prepared_offers.location_analysis_id is not null as location_analysis_linked,
        prepared_offers.evidence_package_id is not null as evidence_package_linked,
        coalesce(event_counts.event_count, 0)::int as event_count,
        event_counts.latest_event_at,
        prepared_offers.created_at,
        prepared_offers.updated_at
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      left join event_counts on event_counts.related_entity_id = prepared_offers.offer_id
      where prepared_offers.owner_role = 'deal-manager'
        and coalesce(prepared_offers.metadata -> '__seed' ->> 'seed_batch_id', '') <> 'crays-benchmark-20260710-v1'
      order by prepared_offers.created_at desc
      limit 25
    `,
  );

  const records = result.rows.map((row) => ({
    offerId: row.offer_id,
    propertyCaseId: row.property_case_id,
    title: row.title,
    market: row.market,
    ownerRole: row.owner_role,
    status: row.status,
    candidateReleaseState: row.candidate_release_state,
    publicTeaserEnabled: row.public_teaser_enabled,
    partnerHandoffStatus: row.partner_handoff_status,
    propertyCaseStatus: row.property_case_status,
    propertyCasePhase: row.property_case_phase,
    propertyHandoffStatus: row.property_handoff_status,
    locationAnalysisLinked: row.location_analysis_linked,
    evidencePackageLinked: row.evidence_package_linked,
    eventCount: row.event_count,
    latestEventAt: row.latest_event_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));

  return {
    configured: true,
    role,
    access,
    records,
    summary: summarize(records),
    liveBusinessRecordsReturned: records.length > 0,
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

export async function transitionPreparedOfferToReview(input: PreparedOfferTransitionInput): Promise<PreparedOfferTransitionResult> {
  if (!canReviewPreparedOffers(input.role)) {
    throw new Error("Role is not allowed to transition prepared offers.");
  }

  if (input.transition !== "start_review") {
    throw new Error("Unsupported prepared-offer transition.");
  }

  const pool = getCorePgPool();
  const client = await pool.connect();
  const eventId = transitionEventId(input.offerId, input.transition);

  try {
    await client.query("begin");

    const currentResult = await client.query<PreparedOfferTransitionRow>(
      `
        select offer_id, owner_role, status, candidate_release_state, public_teaser_enabled, location_analysis_id, evidence_package_id
        from crays_core.prepared_offers
        where offer_id = $1
        for update
      `,
      [input.offerId],
    );
    const current = currentResult.rows[0];

    if (!current) {
      throw new Error("Prepared offer was not found.");
    }

    if (current.owner_role !== "deal-manager") {
      throw new Error("Only Deal-owned prepared offers can enter review through this workflow action.");
    }

    if (!current.location_analysis_id || !current.evidence_package_id) {
      throw new Error("Prepared offer requires linked location analysis and evidence package before review.");
    }

    if (current.candidate_release_state !== "not_released" || current.public_teaser_enabled) {
      throw new Error("Prepared offer review transition cannot run after candidate or public release.");
    }

    const alreadyTransitioned = current.status === "review";

    if (!alreadyTransitioned && current.status !== "draft") {
      throw new Error("Prepared offer must be a draft before it can enter internal review.");
    }

    const offerUpdate = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.prepared_offers
            set status = 'review',
                metadata = metadata || $2::jsonb,
                updated_at = now()
            where offer_id = $1
          `,
          [
            input.offerId,
            JSON.stringify({
              internalReviewStarted: true,
              startedByRole: input.role,
              candidateReleaseEnabled: false,
              publicReleaseEnabled: false,
            }),
          ],
        );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'prepared_offer.review_started', 'prepared-offer', $2, $3, $4::jsonb, 'recorded', $5::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        input.offerId,
        input.role,
        JSON.stringify(["deal-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          transition: input.transition,
          fromStatus: current.status,
          toStatus: "review",
          candidateReleaseEnabled: false,
          publicReleaseEnabled: false,
        }),
      ],
    );

    await client.query("commit");

    return {
      status: alreadyTransitioned ? "already_transitioned" : "transitioned",
      offerId: input.offerId,
      fromStatus: current.status,
      toStatus: "review",
      eventId,
      updatedRows: {
        preparedOffers: offerUpdate.rowCount ?? 0,
        workflowEvents: eventResult.rowCount ?? 0,
      },
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
