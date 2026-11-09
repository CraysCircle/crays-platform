import "server-only";

import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { readClubsMemberPropertyEligibilityWithClient } from "@/db/clubs-member-property-eligibility-repository";
import {
  CLUBS_STAY_STEP4_PROPERTIES,
  CLUBS_STAY_STEP4_SCHEMA,
  assertClubsStayStep4TeamGoCorrelation,
  clubsStayStep4Sha256,
  type ClubsStayStep4PayableBasis,
  type ClubsStayStep4PropertyId,
  type ClubsStayStep4SourceReceipt,
  type ClubsStayStep4StayUnit,
  validateClubsStayStep4Intent,
} from "@/lib/member-commerce/clubs-stay-step4-contract";

type OfferInput = {
  tenantId: string;
  accountId: string;
  propertyId: ClubsStayStep4PropertyId;
  stayUnit: ClubsStayStep4StayUnit;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  requestedCapacity: number;
};

type SourceInput = {
  tenantId: string;
  accountId: string;
  propertyId: ClubsStayStep4PropertyId;
  quoteId: string;
  holdId: string;
  teamGoEvidenceId: string;
  payableBasis: ClubsStayStep4PayableBasis;
};

type SourceRow = {
  quote_id: string;
  account_id: string;
  property_id: ClubsStayStep4PropertyId;
  arrival_date: string;
  departure_date: string;
  guest_count: number;
  total_minor: string;
  deposit_due_minor: string;
  currency: string;
  pricing_snapshot_sha256: string;
  seller_snapshot: Record<string, unknown>;
  cancellation_snapshot: Record<string, unknown>;
  quote_expires_at: Date;
  accepted_pricing_sha256: string;
  accepted_seller_sha256: string;
  accepted_at: Date;
  reservation_hold_id: string;
  hold_status: "active" | "released" | "expired" | "converted";
  hold_expires_at: Date;
  team_go_evidence_id: string;
  team_go_handoff_id: string;
  team_go_party_go_receipt_id: string;
  team_go_property_id: string;
  primary_subject_account_id: string;
  required_person_count: number;
  approved_person_count: number;
  party_snapshot_sha256: string;
  decision_snapshot_sha256: string;
  source_contract: string;
  sandbox_evidence_scope: string;
  evidence_sha256: string;
  golf_sandbox_evidence_authorized: boolean;
  creates_stay_payment: boolean;
  handoff_id: string;
  handoff_account_id: string;
  handoff_property_id: ClubsStayStep4PropertyId;
  handoff_date_mode: string;
  handoff_stay_unit: string;
  handoff_adult_count: number;
  handoff_dependent_minor_count: number;
  handoff_intent_sha256: string;
  handoff_intent_property_id: string | null;
  handoff_intent_date_mode: string | null;
  handoff_intent_check_in: string | null;
  handoff_intent_check_out: string | null;
  handoff_intent_stay_unit: string | null;
  handoff_intent_guest_count: number | null;
  handoff_intent_child_count: number | null;
  party_go_receipt_id: string;
  party_go_handoff_id: string;
  party_go_snapshot_sha256: string;
};

type LineRow = {
  line_order: number;
  line_type: "accommodation" | "tax" | "fee" | "deposit";
  source_version_id: string;
  service_date: string | null;
  label: string;
  quantity: number;
  unit_amount_minor: string;
  line_total_minor: string;
  included_in_total: boolean;
  metadata: Record<string, unknown>;
};

export class ClubsStayStep4RepositoryError extends Error {
  constructor(
    readonly code:
      | "CCLUB_STAY_STEP4_OFFER_NOT_READY"
      | "CCLUB_STAY_STEP4_OFFER_AMBIGUOUS"
      | "CCLUB_STAY_STEP4_PROPERTY_ACCESS_REQUIRED"
      | "CCLUB_STAY_STEP4_CANONICAL_SOURCE_NOT_READY"
      | "CCLUB_STAY_STEP4_ACCEPTANCE_MISMATCH"
      | "CCLUB_STAY_STEP4_ACTIVE_HOLD_REQUIRED"
      | "CCLUB_STAY_STEP4_TEAM_GO_REQUIRED"
      | "CCLUB_STAY_STEP4_PAYABLE_AMOUNT_NOT_READY"
      | "CCLUB_STAY_STEP4_SELLER_BINDING_NOT_READY",
  ) {
    super(code);
    this.name = "ClubsStayStep4RepositoryError";
  }
}

function safeMinor(value: string, code: ClubsStayStep4RepositoryError["code"]) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new ClubsStayStep4RepositoryError(code);
  }
  return number;
}

function iso(value: Date) {
  if (!Number.isFinite(value.getTime())) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_CANONICAL_SOURCE_NOT_READY",
    );
  }
  return value.toISOString();
}

function requireConnectedAccount(value: unknown) {
  if (typeof value !== "string" || !/^acct_[A-Za-z0-9]{8,}$/.test(value)) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_SELLER_BINDING_NOT_READY",
    );
  }
  return value;
}

async function withTenantClient<T>(
  tenantId: string,
  run: (client: PoolClient) => Promise<T>,
) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    await client.query(
      "select set_config('crays.app_role','core_service',true)",
    );
    await client.query("select set_config('crays.tenant_id',$1,true)", [
      tenantId,
    ]);
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function assertPropertyAccess(
  client: PoolClient,
  input: {
    propertyId: ClubsStayStep4PropertyId;
    accountId: string;
  },
) {
  const eligibility = await readClubsMemberPropertyEligibilityWithClient(
    client,
    input.propertyId,
    input.accountId,
  );
  const admitted =
    input.propertyId === CLUBS_STAY_STEP4_PROPERTIES.golf
      ? eligibility.eligibility === "public_access"
      : eligibility.eligibility === "property_access_admitted";
  if (!admitted) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_PROPERTY_ACCESS_REQUIRED",
    );
  }
}

export async function resolveCanonicalClubsStayOffer(input: OfferInput) {
  const stay = validateClubsStayStep4Intent(input);
  if (
    !Number.isSafeInteger(input.guestCount) ||
    input.guestCount < 1 ||
    input.guestCount > 100 ||
    !Number.isSafeInteger(input.requestedCapacity) ||
    input.requestedCapacity < 1 ||
    input.requestedCapacity > 100
  ) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_OFFER_NOT_READY",
    );
  }
  return withTenantClient(input.tenantId, async (client) => {
    await assertPropertyAccess(client, input);
    const candidates = await client.query<{
      property_id: string;
      unit_id: string;
      rate_plan_id: string;
      rate_plan_version_id: string;
      currency: string;
      minimum_stay_nights: number;
      maximum_stay_nights: number | null;
      assignment_id: string;
      assignment_version: number;
      binding_version: number;
      stripe_connected_account_id: string;
    }>(
      `select property.property_id,unit.unit_id,rate.rate_plan_id,
         version.rate_plan_version_id,rate.currency,
         version.minimum_stay_nights,version.maximum_stay_nights,
         assignment.assignment_id,assignment.version assignment_version,
         binding.binding_version,binding.stripe_connected_account_id
       from crays_core.crays_accounts account
       join crays_core.clubs_properties property
         on property.property_id=$2 and property.lifecycle='published'
       join crays_core.clubs_units unit
         on unit.property_id=property.property_id and unit.lifecycle='published'
       join crays_core.clubs_rate_plans rate
         on rate.unit_id=unit.unit_id and rate.lifecycle='published'
       join crays_core.clubs_rate_plan_versions version
         on version.rate_plan_id=rate.rate_plan_id
        and version.version=rate.current_version
        and version.valid_from<=$3::date
        and (version.valid_until is null or version.valid_until>=$4::date-1)
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=property.store_id
        and assignment.partner_tenant_id=property.partner_tenant_id
        and assignment.operator_legal_entity_id=property.operator_legal_entity_id
        and assignment.vertical_root='clubs'
        and assignment.status='active'
        and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       join lateral (
         select candidate.*
           from crays_core.provider_scope_bindings candidate
          where candidate.assignment_id=assignment.assignment_id
            and candidate.assignment_version=assignment.version
            and candidate.status='active'
            and candidate.stripe_connected_account_id is not null
          order by candidate.binding_version desc
          limit 1
       ) binding on true
      where account.account_id=$1 and account.status='active'
        and version.minimum_stay_nights<=$5
        and (version.maximum_stay_nights is null
          or version.maximum_stay_nights>=$5)
      order by unit.unit_id,rate.rate_plan_id
      limit 3`,
      [
        input.accountId,
        input.propertyId,
        input.arrivalDate,
        input.departureDate,
        stay.nights,
      ],
    );
    if (candidates.rows.length === 0) {
      throw new ClubsStayStep4RepositoryError(
        "CCLUB_STAY_STEP4_OFFER_NOT_READY",
      );
    }
    if (candidates.rows.length !== 1) {
      throw new ClubsStayStep4RepositoryError(
        "CCLUB_STAY_STEP4_OFFER_AMBIGUOUS",
      );
    }
    const candidate = candidates.rows[0]!;
    const sellerRoutingSha256 = clubsStayStep4Sha256({
      propertyId: candidate.property_id,
      assignmentId: candidate.assignment_id,
      assignmentVersion: candidate.assignment_version,
      bindingVersion: candidate.binding_version,
      stripeConnectedAccountId: candidate.stripe_connected_account_id,
    });
    const offerSha256 = clubsStayStep4Sha256({
      schema: CLUBS_STAY_STEP4_SCHEMA,
      source: "canonical_database_only",
      propertyId: input.propertyId,
      stayUnit: input.stayUnit,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      nights: stay.nights,
      guestCount: input.guestCount,
      requestedCapacity: input.requestedCapacity,
      unitId: candidate.unit_id,
      ratePlanId: candidate.rate_plan_id,
      ratePlanVersionId: candidate.rate_plan_version_id,
      currency: candidate.currency,
      sellerRoutingSha256,
    });
    return Object.freeze({
      schema: CLUBS_STAY_STEP4_SCHEMA,
      version: "1.1.0" as const,
      status: "offer_ready" as const,
      source: "canonical_database_only" as const,
      publicQloInferred: false as const,
      propertyId: input.propertyId,
      stayUnit: input.stayUnit,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      nights: stay.nights,
      unitId: candidate.unit_id,
      ratePlanId: candidate.rate_plan_id,
      ratePlanVersionId: candidate.rate_plan_version_id,
      currency: candidate.currency,
      offerSha256,
      sellerRoutingSha256,
      availabilityAuthority: false as const,
      quoteAuthority: false as const,
      paymentAuthority: false as const,
    });
  });
}

export async function readCanonicalClubsStayStep4SourceWithClient(
  client: PoolClient,
  input: SourceInput,
): Promise<{
  receipt: ClubsStayStep4SourceReceipt;
  sellerConnectedAccountId: string;
}> {
  const result = await client.query<SourceRow>(
    `select quote.quote_snapshot_id quote_id,quote.account_id,
       quote.property_id,quote.arrival_date::text,quote.departure_date::text,
       quote.guest_count,quote.total_minor::text,
       quote.deposit_due_minor::text,quote.currency,
       quote.pricing_snapshot_sha256,quote.seller_snapshot,
       quote.cancellation_snapshot,quote.expires_at quote_expires_at,
       acceptance.accepted_pricing_sha256,
       acceptance.accepted_seller_sha256,acceptance.accepted_at,
       hold.reservation_hold_id,hold.status hold_status,
       hold.expires_at hold_expires_at,
       team.team_go_evidence_id,team.handoff_id team_go_handoff_id,
       team.party_go_receipt_id team_go_party_go_receipt_id,
       team.property_id team_go_property_id,
       team.primary_subject_account_id,team.required_person_count,
       team.approved_person_count,team.party_snapshot_sha256,
       team.decision_snapshot_sha256,team.source_contract,
       team.sandbox_evidence_scope,team.evidence_sha256,
       team.golf_sandbox_evidence_authorized,team.creates_stay_payment,
       handoff.handoff_id,handoff.account_id handoff_account_id,
       handoff.property_id handoff_property_id,
       handoff.date_mode handoff_date_mode,
       handoff.stay_unit handoff_stay_unit,
       handoff.adult_count handoff_adult_count,
       handoff.dependent_minor_count handoff_dependent_minor_count,
       handoff.intent_sha256 handoff_intent_sha256,
       handoff.intent_payload->>'propertyId' handoff_intent_property_id,
       handoff.intent_payload->>'dateMode' handoff_intent_date_mode,
       handoff.intent_payload->>'checkIn' handoff_intent_check_in,
       handoff.intent_payload->>'checkOut' handoff_intent_check_out,
       handoff.intent_payload->>'stayUnit' handoff_intent_stay_unit,
       case when jsonb_typeof(handoff.intent_payload->'guests')='number'
         then (handoff.intent_payload->>'guests')::integer end
         handoff_intent_guest_count,
       case when jsonb_typeof(handoff.intent_payload->'children')='number'
         then (handoff.intent_payload->>'children')::integer end
         handoff_intent_child_count,
       party_go.party_go_receipt_id,
       party_go.handoff_id party_go_handoff_id,
       party_go.party_snapshot_sha256 party_go_snapshot_sha256
     from crays_core.clubs_quote_snapshots quote
     join crays_core.clubs_quote_acceptances acceptance
       on acceptance.quote_snapshot_id=quote.quote_snapshot_id
      and acceptance.account_id=quote.account_id
     join crays_core.clubs_reservation_holds hold
       on hold.reservation_hold_id=acceptance.reservation_hold_id
      and hold.quote_snapshot_id=quote.quote_snapshot_id
      and hold.account_id=quote.account_id
     join crays_core.clubs_booking_party_team_go_evidence team
       on team.team_go_evidence_id=$4
      and team.primary_subject_account_id=quote.account_id
      and team.property_id=quote.property_id
     join crays_core.clubs_booking_membership_application_handoffs handoff
       on handoff.handoff_id=team.handoff_id
      and handoff.account_id=quote.account_id
      and handoff.property_id=quote.property_id
     join crays_core.clubs_booking_membership_party_go_receipts party_go
       on party_go.party_go_receipt_id=team.party_go_receipt_id
      and party_go.handoff_id=handoff.handoff_id
      and party_go.outcome='approved_for_membership_payment'
    where quote.quote_snapshot_id=$2 and quote.account_id=$1
      and quote.property_id=$5
      and hold.reservation_hold_id=$3
      and hold.status='active'
      and handoff.state='approved_for_membership_payment'
      and handoff.expires_at>now()
      and quote.expires_at>now() and hold.expires_at>now()
    limit 2
    for share of quote,acceptance,hold,team,handoff,party_go`,
    [
      input.accountId,
      input.quoteId,
      input.holdId,
      input.teamGoEvidenceId,
      input.propertyId,
    ],
  );
  if (result.rows.length !== 1) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_CANONICAL_SOURCE_NOT_READY",
    );
  }
  const row = result.rows[0]!;
  await assertPropertyAccess(client, {
    propertyId: row.property_id,
    accountId: row.account_id,
  });
  if (row.accepted_pricing_sha256 !== row.pricing_snapshot_sha256) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_ACCEPTANCE_MISMATCH",
    );
  }
  if (row.hold_status !== "active") {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_ACTIVE_HOLD_REQUIRED",
    );
  }
  const golfEvidenceExpected =
    row.property_id === CLUBS_STAY_STEP4_PROPERTIES.golf;
  let correlation;
  try {
    correlation = assertClubsStayStep4TeamGoCorrelation({
      quote: {
        accountId: row.account_id,
        propertyId: row.property_id,
        arrivalDate: row.arrival_date,
        departureDate: row.departure_date,
        guestCount: row.guest_count,
      },
      handoff: {
        handoffId: row.handoff_id,
        accountId: row.handoff_account_id,
        propertyId: row.handoff_property_id,
        dateMode: row.handoff_date_mode,
        stayUnit: row.handoff_stay_unit,
        intentPropertyId: row.handoff_intent_property_id,
        intentDateMode: row.handoff_intent_date_mode,
        intentCheckIn: row.handoff_intent_check_in,
        intentCheckOut: row.handoff_intent_check_out,
        intentStayUnit: row.handoff_intent_stay_unit,
        intentGuestCount: row.handoff_intent_guest_count,
        intentChildCount: row.handoff_intent_child_count,
        adultCount: row.handoff_adult_count,
        dependentMinorCount: row.handoff_dependent_minor_count,
        intentSha256: row.handoff_intent_sha256,
      },
      teamGo: {
        handoffId: row.team_go_handoff_id,
        partyGoReceiptId: row.team_go_party_go_receipt_id,
        primaryAccountId: row.primary_subject_account_id,
        propertyId: row.team_go_property_id,
        requiredPersonCount: row.required_person_count,
        approvedPersonCount: row.approved_person_count,
        partySnapshotSha256: row.party_snapshot_sha256,
        decisionSnapshotSha256: row.decision_snapshot_sha256,
      },
      partyGo: {
        partyGoReceiptId: row.party_go_receipt_id,
        handoffId: row.party_go_handoff_id,
        partySnapshotSha256: row.party_go_snapshot_sha256,
      },
    });
  } catch {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_TEAM_GO_REQUIRED",
    );
  }
  if (
    row.primary_subject_account_id !== row.account_id ||
    row.team_go_property_id !== row.property_id ||
    row.required_person_count !== row.approved_person_count ||
    row.source_contract !== "crays.clubs.booking-party-team-go-evidence.v1" ||
    row.sandbox_evidence_scope !==
      "forest_city_sunday_sandbox_team_go_v1" ||
    row.golf_sandbox_evidence_authorized !== golfEvidenceExpected ||
    row.creates_stay_payment !== false
  ) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_TEAM_GO_REQUIRED",
    );
  }
  const lines = await client.query<LineRow>(
    `select line_order,line_type,source_version_id,service_date::text,
       label,quantity,unit_amount_minor::text,line_total_minor::text,
       included_in_total,metadata
     from crays_core.clubs_quote_lines
    where quote_snapshot_id=$1
    order by line_order,quote_line_id`,
    [row.quote_id],
  );
  if (
    !lines.rows.some((line) => line.line_type === "accommodation") ||
    !lines.rows.some((line) => line.line_type === "tax")
  ) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_CANONICAL_SOURCE_NOT_READY",
    );
  }
  const sellerConnectedAccountId = requireConnectedAccount(
    row.seller_snapshot.stripeConnectedAccountId,
  );
  const sellerSnapshotSha256 = clubsStayStep4Sha256(row.seller_snapshot);
  if (row.accepted_seller_sha256 !== sellerSnapshotSha256) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_ACCEPTANCE_MISMATCH",
    );
  }
  const totalMinor = safeMinor(
    row.total_minor,
    "CCLUB_STAY_STEP4_PAYABLE_AMOUNT_NOT_READY",
  );
  const depositDueMinor = safeMinor(
    row.deposit_due_minor,
    "CCLUB_STAY_STEP4_PAYABLE_AMOUNT_NOT_READY",
  );
  const amountMinor =
    input.payableBasis === "TOTAL" ? totalMinor : depositDueMinor;
  if (amountMinor < 400 || !/^[A-Z]{3}$/.test(row.currency)) {
    throw new ClubsStayStep4RepositoryError(
      "CCLUB_STAY_STEP4_PAYABLE_AMOUNT_NOT_READY",
    );
  }
  const normalizeLines = (type: LineRow["line_type"]) =>
    lines.rows
      .filter((line) => line.line_type === type)
      .map((line) => ({
        order: line.line_order,
        sourceVersionId: line.source_version_id,
        serviceDate: line.service_date,
        label: line.label,
        quantity: line.quantity,
        unitAmountMinor: line.unit_amount_minor,
        lineTotalMinor: line.line_total_minor,
        includedInTotal: line.included_in_total,
        metadata: line.metadata,
      }));
  const taxSnapshotSha256 = clubsStayStep4Sha256(normalizeLines("tax"));
  const feeSnapshotSha256 = clubsStayStep4Sha256(normalizeLines("fee"));
  const depositSnapshotSha256 = clubsStayStep4Sha256({
    depositDueMinor,
    lines: normalizeLines("deposit"),
  });
  const cancellationSnapshotSha256 = clubsStayStep4Sha256(
    row.cancellation_snapshot,
  );
  const refundBoundarySha256 = clubsStayStep4Sha256({
    cancellationSnapshotSha256,
    refundExecutionAuthority: false,
    state: "policy_snapshot_only_separate_refund_authority_required",
  });
  const sourceExpiresAt =
    row.quote_expires_at.getTime() <= row.hold_expires_at.getTime()
      ? iso(row.quote_expires_at)
      : iso(row.hold_expires_at);
  const body = {
    schema: CLUBS_STAY_STEP4_SCHEMA,
    version: "1.1.0" as const,
    status: "canonical_source_ready_trusted_t5_receipt_required" as const,
    paymentAuthority: false as const,
    providerAuthority: false as const,
    productionAuthority: false as const,
    quoteId: row.quote_id,
    holdId: row.reservation_hold_id,
    teamGoEvidenceId: row.team_go_evidence_id,
    handoffId: correlation.handoffId,
    handoffIntentSha256: correlation.handoffIntentSha256,
    partyGoReceiptId: correlation.partyGoReceiptId,
    partySnapshotSha256: correlation.partySnapshotSha256,
    decisionSnapshotSha256: correlation.decisionSnapshotSha256,
    propertyId: row.property_id,
    accountId: row.account_id,
    stayUnit: correlation.stayUnit,
    arrivalDate: correlation.arrivalDate,
    departureDate: correlation.departureDate,
    adultCount: correlation.adultCount,
    dependentMinorCount: 0 as const,
    payableBasis: input.payableBasis,
    amountMinor,
    totalMinor,
    depositDueMinor,
    currency: row.currency,
    pricingSnapshotSha256: row.pricing_snapshot_sha256,
    acceptedPricingSha256: row.accepted_pricing_sha256,
    sellerSnapshotSha256,
    acceptedSellerSha256: row.accepted_seller_sha256,
    taxSnapshotSha256,
    feeSnapshotSha256,
    depositSnapshotSha256,
    cancellationSnapshotSha256,
    refundBoundarySha256,
    teamGoEvidenceSha256: row.evidence_sha256,
    sourceExpiresAt,
  };
  return {
    receipt: Object.freeze({
      ...body,
      sourceReceiptSha256: clubsStayStep4Sha256(body),
    }),
    sellerConnectedAccountId,
  };
}

export async function readCanonicalClubsStayStep4Source(input: SourceInput) {
  return withTenantClient(input.tenantId, async (client) => {
    const source = await readCanonicalClubsStayStep4SourceWithClient(client, input);
    return source.receipt;
  });
}

export async function readClubsStayStep4PaymentAuthorityStatus(
  input: SourceInput & { idempotencyKey: string; returnTo: string },
) {
  return withTenantClient(input.tenantId, async (client) => {
    const { receipt: source } = await readCanonicalClubsStayStep4SourceWithClient(
      client,
      input,
    );
    return Object.freeze({
      schema: CLUBS_STAY_STEP4_SCHEMA,
      version: "1.1.0" as const,
      status: "trusted_t5_adapter_receipt_required" as const,
      paymentAuthority: false as const,
      providerCalled: false as const,
      providerSuccessClaimed: false as const,
      productionAuthority: false as const,
      trustedAdapterReceiptRequired: true as const,
      requiredTrustedReceiptScope:
        "QUOTE_ACCEPTANCE_HOLD_TAX_SELLER_REFUND" as const,
      persistedImmutableReceiptVerified: false as const,
      productReadbackVerified: false as const,
      priceReadbackVerified: false as const,
      persistableTo0256: false as const,
      providerCallable: false as const,
      subjectReference: source.holdId,
      sourceReceiptSha256: source.sourceReceiptSha256,
      returnTo: input.returnTo,
      retryWithSameIdempotencyKeyOnly: true as const,
    });
  });
}
