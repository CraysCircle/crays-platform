import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const candidateIntentWriteRoles: RoleKey[] = ["franchise-candidate"];
const candidateIntentReviewRoles: RoleKey[] = ["deal-manager", "reviewer", "crays-management", "admin"];

export type CandidateIntentRecord = {
  intentId: string;
  preparedOfferId: string;
  dealId: string | null;
  candidateAccountId: string | null;
  intentType: string;
  status: string;
  reviewStatus: string;
  regulatedCheckStatus: string;
  equityCheckStatus: string;
  bankHandoffStatus: string;
  candidateReleaseState: string | null;
  publicTeaserEnabled: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidateIntentReviewReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  records: CandidateIntentRecord[];
  summary: {
    total: number;
    purchase: number;
    financing: number;
    submitted: number;
    accepted: number;
  };
  liveIntentRecordsReturned: boolean;
  purchaseIntentWriteEnabled: false;
  financingIntentWriteEnabled: false;
  kycAmlStarted: false;
  equityCheckStarted: false;
  bankPackageCreated: false;
  externalSendingEnabled: false;
  providerCallsEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type CandidateIntentWriteInput = {
  offerId: string;
  intentType: "purchase" | "financing";
  role: RoleKey;
  candidateAccountId?: string;
  candidateOrganizationId?: string;
  candidateAcknowledgedBoundary: boolean;
};

export type CandidateIntentWriteResult = {
  status: "created" | "already_exists" | "release_required" | "account_required" | "acknowledgement_required" | "role_forbidden";
  intentId: string | null;
  offerId: string;
  intentType: CandidateIntentWriteInput["intentType"];
  reason: string;
  updatedRows: {
    candidateIntents: number;
    candidateIntentEvents: number;
  };
  purchaseIntentRecorded: boolean;
  financingIntentRecorded: boolean;
  kycAmlStarted: false;
  equityCheckStarted: false;
  bankPackageCreated: false;
  externalSendingEnabled: false;
  providerCallsEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

type CandidateIntentReviewRow = {
  intent_id: string;
  prepared_offer_id: string;
  deal_id: string | null;
  candidate_account_id: string | null;
  intent_type: string;
  status: string;
  review_status: string;
  regulated_check_status: string;
  equity_check_status: string;
  bank_handoff_status: string;
  candidate_release_state: string | null;
  public_teaser_enabled: boolean | null;
  created_at: Date;
  updated_at: Date;
};

type PreparedOfferIntentGateRow = {
  offer_id: string;
  candidate_release_state: string;
  public_teaser_enabled: boolean;
};

function accessForReviewRole(role: RoleKey) {
  if (candidateIntentReviewRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can review Candidate intent records after they are explicitly created.",
    };
  }

  return {
    allowed: false,
    reason: "Candidate intent review requires Deal Manager or review scope.",
  };
}

function emptySummary() {
  return {
    total: 0,
    purchase: 0,
    financing: 0,
    submitted: 0,
    accepted: 0,
  };
}

function summarize(records: CandidateIntentRecord[]) {
  return records.reduce((summary, record) => {
    summary.total += 1;
    if (record.intentType === "purchase") summary.purchase += 1;
    if (record.intentType === "financing") summary.financing += 1;
    if (record.status === "submitted") summary.submitted += 1;
    if (record.status === "accepted") summary.accepted += 1;
    return summary;
  }, emptySummary());
}

function emptyReviewModel(role: RoleKey, configured: boolean, access = accessForReviewRole(role)): CandidateIntentReviewReadModel {
  return {
    configured,
    role,
    access,
    records: [],
    summary: emptySummary(),
    liveIntentRecordsReturned: false,
    purchaseIntentWriteEnabled: false,
    financingIntentWriteEnabled: false,
    kycAmlStarted: false,
    equityCheckStarted: false,
    bankPackageCreated: false,
    externalSendingEnabled: false,
    providerCallsEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function blockedWriteResult(
  input: CandidateIntentWriteInput,
  status: CandidateIntentWriteResult["status"],
  reason: string,
): CandidateIntentWriteResult {
  return {
    status,
    intentId: null,
    offerId: input.offerId,
    intentType: input.intentType,
    reason,
    updatedRows: {
      candidateIntents: 0,
      candidateIntentEvents: 0,
    },
    purchaseIntentRecorded: false,
    financingIntentRecorded: false,
    kycAmlStarted: false,
    equityCheckStarted: false,
    bankPackageCreated: false,
    externalSendingEnabled: false,
    providerCallsEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function candidateIntentId(input: CandidateIntentWriteInput) {
  const candidateScope = input.candidateAccountId?.replace(/[^a-zA-Z0-9_-]/g, "_") || "unmapped";
  return `candidate_intent_${input.offerId}_${candidateScope}_${input.intentType}`;
}

export async function getCandidateIntentReviewReadModel(role: RoleKey): Promise<CandidateIntentReviewReadModel> {
  const access = accessForReviewRole(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed) {
    return emptyReviewModel(role, runtime.configured, access);
  }

  const result = await getCorePgPool().query<CandidateIntentReviewRow>(
    `
      select
        candidate_intents.intent_id,
        candidate_intents.prepared_offer_id,
        candidate_intents.deal_id,
        candidate_intents.candidate_account_id,
        candidate_intents.intent_type,
        candidate_intents.status,
        candidate_intents.review_status,
        candidate_intents.regulated_check_status,
        candidate_intents.equity_check_status,
        candidate_intents.bank_handoff_status,
        prepared_offers.candidate_release_state,
        prepared_offers.public_teaser_enabled,
        candidate_intents.created_at,
        candidate_intents.updated_at
      from crays_core.candidate_intents
      left join crays_core.prepared_offers on prepared_offers.offer_id = candidate_intents.prepared_offer_id
      where coalesce(candidate_intents.metadata -> '__seed' ->> 'seed_batch_id', '') <> 'crays-benchmark-20260710-v1'
      order by candidate_intents.updated_at desc
      limit 25
    `,
  );

  const records = result.rows.map((row) => ({
    intentId: row.intent_id,
    preparedOfferId: row.prepared_offer_id,
    dealId: row.deal_id,
    candidateAccountId: row.candidate_account_id,
    intentType: row.intent_type,
    status: row.status,
    reviewStatus: row.review_status,
    regulatedCheckStatus: row.regulated_check_status,
    equityCheckStatus: row.equity_check_status,
    bankHandoffStatus: row.bank_handoff_status,
    candidateReleaseState: row.candidate_release_state,
    publicTeaserEnabled: row.public_teaser_enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));

  return {
    configured: true,
    role,
    access,
    records,
    summary: summarize(records),
    liveIntentRecordsReturned: records.length > 0,
    purchaseIntentWriteEnabled: false,
    financingIntentWriteEnabled: false,
    kycAmlStarted: false,
    equityCheckStarted: false,
    bankPackageCreated: false,
    externalSendingEnabled: false,
    providerCallsEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function createCandidateIntentDevRecord(input: CandidateIntentWriteInput): Promise<CandidateIntentWriteResult> {
  if (!candidateIntentWriteRoles.includes(input.role)) {
    return blockedWriteResult(input, "role_forbidden", "Candidate intent writes require Franchise Candidate scope.");
  }

  if (!input.candidateAccountId) {
    return blockedWriteResult(input, "account_required", "Candidate intent writes require a mapped Candidate account.");
  }

  if (!input.candidateAcknowledgedBoundary) {
    return blockedWriteResult(input, "acknowledgement_required", "Candidate must acknowledge intent boundary before a dev intent record can be created.");
  }

  const pool = getCorePgPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const offerResult = await client.query<PreparedOfferIntentGateRow>(
      `
        select offer_id, candidate_release_state, public_teaser_enabled
        from crays_core.prepared_offers
        where offer_id = $1
        for update
      `,
      [input.offerId],
    );
    const offer = offerResult.rows[0];

    if (!offer || !["detail_released", "reserved"].includes(offer.candidate_release_state)) {
      await client.query("rollback");
      return blockedWriteResult(input, "release_required", "Prepared offer must be explicitly released to Candidate detail before intent can be recorded.");
    }

    const intentId = candidateIntentId(input);
    const eventId = `event_${intentId}_${input.intentType}_recorded`;

    const intentResult = await client.query(
      `
        insert into crays_core.candidate_intents (
          intent_id,
          prepared_offer_id,
          candidate_account_id,
          candidate_organization_id,
          intent_type,
          status,
          review_status,
          candidate_acknowledged_boundary,
          acknowledgement_summary,
          visibility_roles,
          submitted_at,
          metadata
        )
        values ($1, $2, $3, nullif($4, ''), $5, 'submitted', 'pending', true, $6::jsonb, $7::jsonb, now(), $8::jsonb)
        on conflict (intent_id) do nothing
      `,
      [
        intentId,
        input.offerId,
        input.candidateAccountId,
        input.candidateOrganizationId ?? "",
        input.intentType,
        JSON.stringify({
          candidateAcknowledgedBoundary: true,
          kycAmlStartsAfterIntent: true,
          equityCheckStartsAfterIntent: true,
          bankHandoffEnabled: false,
        }),
        JSON.stringify(["franchise-candidate", "deal-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          source: "confirmed_dev_boundary",
          externalSendingEnabled: false,
          kycAmlStarted: false,
          equityCheckStarted: false,
          bankPackageCreated: false,
        }),
      ],
    );

    const eventResult = await client.query(
      `
        insert into crays_core.candidate_intent_events (
          event_id,
          intent_id,
          event_type,
          event_status,
          actor_account_id,
          actor_role,
          related_entity_type,
          related_entity_id,
          visibility_roles,
          payload_summary
        )
        values ($1, $2, $3, 'recorded', $4, $5, 'candidate-intent', $2, $6::jsonb, $7::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        intentId,
        input.intentType === "purchase" ? "purchase_intent.recorded" : "financing_intent.recorded",
        input.candidateAccountId,
        input.role,
        JSON.stringify(["franchise-candidate", "deal-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          intentType: input.intentType,
          preparedOfferId: input.offerId,
          kycAmlStarted: false,
          equityCheckStarted: false,
          bankPackageCreated: false,
          externalSendingEnabled: false,
        }),
      ],
    );

    await client.query("commit");

    const created = (intentResult.rowCount ?? 0) > 0;

    return {
      status: created ? "created" : "already_exists",
      intentId,
      offerId: input.offerId,
      intentType: input.intentType,
      reason: created ? "Candidate intent dev record was created." : "Candidate intent dev record already exists.",
      updatedRows: {
        candidateIntents: intentResult.rowCount ?? 0,
        candidateIntentEvents: eventResult.rowCount ?? 0,
      },
      purchaseIntentRecorded: input.intentType === "purchase",
      financingIntentRecorded: input.intentType === "financing",
      kycAmlStarted: false,
      equityCheckStarted: false,
      bankPackageCreated: false,
      externalSendingEnabled: false,
      providerCallsEnabled: false,
      publicReleaseEnabled: false,
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
