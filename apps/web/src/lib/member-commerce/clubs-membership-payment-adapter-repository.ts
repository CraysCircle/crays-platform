import "server-only";

import type { PoolClient } from "pg";

import { getCorePgPool } from "@/db/client";
import {
  clubsStripeSha256,
  prepareClubsStripeSandboxPayment,
  type ClubsStripeSandboxPaymentAuthority,
} from "./clubs-stripe-sandbox-contract";
import {
  ClubsMembershipPaymentAdapterReplayConflictError,
  ClubsMembershipPaymentAdapterStateConflictError,
  assertClubsMembershipPaymentIdempotencyKey,
  clubsMembershipPaymentPrepareRequestSha,
  clubsMembershipPaymentSetupPending,
  clubsMembershipPaymentSha256,
  clubsMembershipPaymentStructurallyReady,
  deriveClubsMembershipPaymentPrepareIds,
  type ClubsMembershipPaymentPrepareResult,
} from "./clubs-membership-payment-adapter-contract";

type CandidateRow = {
  tenant_id: string;
  member_account_id: string;
  handoff_id: string;
  party_member_id: string;
  canonical_application_id: string;
  team_go_evidence_id: string;
  team_go_evidence_sha256: string;
  person_decision_evidence_id: string;
  person_decision_version: number;
  person_decision_sha256: string;
  person_review_command_receipt_id: string;
  person_review_command_receipt_sha256: string;
};

type SetupRow = CandidateRow & {
  setup_receipt_id: string;
  setup_receipt_sha256: string;
  payment_authority_id: string;
  fee_offer_id: string;
  fee_offer_version: number;
  fee_offer_sha256: string;
  amount_minor: string | number;
  currency: string;
  project_id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  product_readback_sha256: string;
  price_readback_sha256: string;
  provider_readback_sha256: string;
  operator_connected_account_id: string;
  ambassador_connected_account_id: string;
  software_connected_account_id: string;
  global_concept_test_connected_account_id: string;
  beneficiary_binding_sha256: string;
  authority_expires_at: Date | string;
};

type PrepareReplayRow = {
  prepare_receipt_id: string;
  prepare_receipt_sha256: string;
  setup_receipt_id: string;
  setup_receipt_sha256: string;
  payment_authority_id: string;
  payment_id: string;
  request_sha256: string;
  authority_sha256: string;
  allocation_plan_sha256: string;
  provider_call_authorized: boolean;
  provider_called: boolean;
  provider_success_claimed: boolean;
  payment_success_claimed: boolean;
  membership_granted: boolean;
  livemode: boolean;
};

type PaymentRow = {
  payment_id: string;
  payment_authority_id: string;
  authority_sha256: string;
  allocation_plan_sha256: string;
  stripe_payment_intent_id: string | null;
  payment_state: string;
};

const MAX_CANONICAL_CANDIDATES = 8;

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
}

function numericMinor(value: string | number) {
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 400) {
    throw new ClubsMembershipPaymentAdapterStateConflictError();
  }
  return normalized;
}

function instant(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ClubsMembershipPaymentAdapterStateConflictError();
  }
  return date.toISOString();
}

async function setCoreRole(client: PoolClient) {
  await client.query("select set_config('crays.app_role','core_service',true)");
}

async function setCoreTenant(client: PoolClient, tenantId: string) {
  await client.query("select set_config('crays.tenant_id',$1,true)", [tenantId]);
}

async function resolveCanonicalCandidates(
  client: PoolClient,
  memberAccountId: string,
) {
  const result = await client.query<CandidateRow>(
    `with latest_decision as (
       select distinct on (decision.party_member_id)
              decision.decision_evidence_id,
              decision.handoff_id,
              decision.party_member_id,
              decision.subject_account_id,
              decision.application_id,
              decision.decision_version,
              decision.outcome,
              decision.reason_code,
              decision.decision_sha256,
              decision.creates_membership,
              decision.creates_membership_payment,
              decision.creates_stay_payment,
              decision.creates_property_admission,
              decision.creates_booking
         from crays_core.clubs_booking_party_team_person_decision_evidence decision
        where decision.subject_account_id=$1
        order by decision.party_member_id,decision.decision_version desc
     )
     select team_go.actor_organization_id tenant_id,
            decision.subject_account_id member_account_id,
            team_go.handoff_id,
            decision.party_member_id,
            decision.application_id canonical_application_id,
            team_go.team_go_evidence_id,
            team_go.evidence_sha256 team_go_evidence_sha256,
            decision.decision_evidence_id person_decision_evidence_id,
            decision.decision_version person_decision_version,
            decision.decision_sha256 person_decision_sha256,
            review.command_receipt_id person_review_command_receipt_id,
            review.command_receipt_sha256 person_review_command_receipt_sha256
       from latest_decision decision
       join crays_core.clubs_booking_party_team_go_evidence team_go
         on team_go.handoff_id=decision.handoff_id
        and team_go.required_person_count=team_go.approved_person_count
        and not team_go.creates_membership
        and not team_go.creates_membership_payment
        and not team_go.creates_stay_payment
        and not team_go.creates_property_admission
        and not team_go.creates_booking
       join crays_core.clubs_booking_membership_application_party_members person
         on person.party_member_id=decision.party_member_id
        and person.handoff_id=decision.handoff_id
        and person.account_id=decision.subject_account_id
        and person.party_role in ('primary_applicant','additional_adult')
        and person.identity_state='ready'
        and person.status='approved_for_membership_payment'
        and person.consent_statement_version=
            'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1'
        and person.consent_at is not null
       join lateral (
         select command_receipt_id,command_receipt_sha256
           from crays_core.clubs_team_membership_person_review_command_receipts command
          where command.party_member_id=decision.party_member_id
            and command.handoff_id=decision.handoff_id
            and command.command_type='approve'
            and command.person_status_after='approved_for_membership_payment'
            and command.decision_version_after=decision.decision_version
            and command.persisted_record=true
            and command.synthetic_source=false
            and command.payment_authority_granted=false
            and command.provider_authority_granted=false
          order by command.recorded_at desc
          limit 1
       ) review on true
      where decision.outcome='approved_for_membership_payment'
        and decision.reason_code='membership_requirements_satisfied'
        and not decision.creates_membership
        and not decision.creates_membership_payment
        and not decision.creates_stay_payment
        and not decision.creates_property_admission
        and not decision.creates_booking
      order by team_go.issued_at desc
      limit ${MAX_CANONICAL_CANDIDATES + 1}`,
    [memberAccountId],
  );
  if (result.rows.length > MAX_CANONICAL_CANDIDATES) {
    throw new ClubsMembershipPaymentAdapterStateConflictError();
  }
  return result.rows;
}

async function findReplay(
  client: PoolClient,
  tenantId: string,
  memberAccountId: string,
  idempotencyKey: string,
) {
  await setCoreTenant(client, tenantId);
  const result = await client.query<PrepareReplayRow>(
    `select prepare_receipt_id,prepare_receipt_sha256,setup_receipt_id,
            setup_receipt_sha256,payment_authority_id,payment_id,request_sha256,
            authority_sha256,allocation_plan_sha256,provider_call_authorized,
            provider_called,provider_success_claimed,payment_success_claimed,
            membership_granted,livemode
       from crays_core.clubs_membership_payment_adapter_prepare_receipts
      where tenant_id=$1 and member_account_id=$2 and idempotency_key=$3
      limit 2
      for share`,
    [tenantId, memberAccountId, idempotencyKey],
  );
  if (result.rows.length > 1) {
    throw new ClubsMembershipPaymentAdapterStateConflictError();
  }
  return result.rows[0] ?? null;
}

function assertReplay(
  row: PrepareReplayRow,
  memberAccountId: string,
  idempotencyKey: string,
) {
  const requestSha = clubsMembershipPaymentPrepareRequestSha({
    memberAccountId,
    idempotencyKey,
    setupReceiptSha256: row.setup_receipt_sha256,
    paymentAuthorityId: row.payment_authority_id,
  });
  if (
    row.request_sha256 !== requestSha ||
    row.livemode !== false ||
    row.provider_call_authorized !== false ||
    row.provider_called !== false ||
    row.provider_success_claimed !== false ||
    row.payment_success_claimed !== false ||
    row.membership_granted !== false
  ) {
    throw new ClubsMembershipPaymentAdapterReplayConflictError();
  }
}

async function resolveActiveSetups(
  client: PoolClient,
  candidates: readonly CandidateRow[],
  now: Date,
) {
  const unique = new Map<string, SetupRow>();
  for (const candidate of candidates) {
    await setCoreTenant(client, candidate.tenant_id);
    const result = await client.query<SetupRow>(
      `select setup.tenant_id,setup.member_account_id,setup.handoff_id,
              setup.party_member_id,setup.canonical_application_id,
              setup.team_go_evidence_id,setup.team_go_evidence_sha256,
              setup.person_decision_evidence_id,setup.person_decision_version,
              setup.person_decision_sha256,
              setup.person_review_command_receipt_id,
              setup.person_review_command_receipt_sha256,
              setup.setup_receipt_id,setup.setup_receipt_sha256,
              setup.payment_authority_id,setup.fee_offer_id,
              setup.fee_offer_version,setup.fee_offer_sha256,
              setup.amount_minor,setup.currency,setup.project_id,
              setup.stripe_product_id,setup.stripe_price_id,
              setup.product_readback_sha256,setup.price_readback_sha256,
              setup.provider_readback_sha256,
              setup.operator_connected_account_id,
              setup.ambassador_connected_account_id,
              setup.software_connected_account_id,
              setup.global_concept_test_connected_account_id,
              setup.beneficiary_binding_sha256,
              least(setup.fee_offer_expires_at,
                    setup.owner_authority_expires_at) authority_expires_at
         from crays_core.clubs_membership_payment_adapter_setup_receipts setup
        where setup.tenant_id=$1
          and setup.member_account_id=$2
          and setup.handoff_id=$3
          and setup.party_member_id=$4
          and setup.canonical_application_id=$5
          and setup.team_go_evidence_id=$6
          and setup.team_go_evidence_sha256=$7
          and setup.person_decision_evidence_id=$8
          and setup.person_decision_version=$9
          and setup.person_decision_sha256=$10
          and setup.person_review_command_receipt_id=$11
          and setup.person_review_command_receipt_sha256=$12
          and setup.fee_offer_valid_from<=$13
          and setup.fee_offer_expires_at>$13
          and setup.owner_authority_expires_at>$13
          and setup.owner_authority_verified=true
          and setup.provider_readback_verified=true
          and setup.allocation_policy='CCLUB_SANDBOX_8475_1000_500_25_V1'
          and setup.stripe_platform_account_id='acct_1TvjKnPonqvDpQ1m'
          and setup.livemode=false
          and setup.provider_called=false
          and setup.provider_success_claimed=false
          and setup.payment_success_claimed=false
          and setup.membership_granted=false
        order by setup.created_at desc
        limit 2
        for share`,
      [
        candidate.tenant_id,
        candidate.member_account_id,
        candidate.handoff_id,
        candidate.party_member_id,
        candidate.canonical_application_id,
        candidate.team_go_evidence_id,
        candidate.team_go_evidence_sha256,
        candidate.person_decision_evidence_id,
        candidate.person_decision_version,
        candidate.person_decision_sha256,
        candidate.person_review_command_receipt_id,
        candidate.person_review_command_receipt_sha256,
        now.toISOString(),
      ],
    );
    if (result.rows.length > 1) {
      throw new ClubsMembershipPaymentAdapterStateConflictError();
    }
    const row = result.rows[0];
    if (row) {
      unique.set(`${row.tenant_id}:${row.setup_receipt_id}`, row);
    }
  }
  return [...unique.values()];
}

async function insertPaymentAuthority(
  client: PoolClient,
  setup: SetupRow,
  createdAt: string,
) {
  const expiresAt = instant(setup.authority_expires_at);
  await client.query(
    `insert into crays_core.clubs_stripe_sandbox_payment_authorities(
       tenant_id,payment_authority_id,member_account_id,project_id,payment_kind,
       subject_reference,source_authority_kind,source_authority_id,
       source_authority_sha256,stripe_product_id,stripe_price_id,amount_minor,
       currency,operator_connected_account_id,ambassador_connected_account_id,
       software_connected_account_id,global_concept_test_connected_account_id,
       production_global_concept_binding_available,authority_state,livemode,
       expires_at,created_at,trusted_membership_setup_receipt_id,
       trusted_membership_setup_receipt_sha256,membership_fee_offer_sha256,
       membership_product_readback_sha256,membership_price_readback_sha256,
       membership_beneficiary_binding_sha256
     ) values(
       $1,$2,$3,$4,'MEMBERSHIP',$5,'MEMBERSHIP_APPROVAL',$6,$7,$8,$9,$10,$11,
       $12,$13,$14,$15,false,'READY',false,$16,$17,$18,$19,$20,$21,$22,$23
     ) on conflict (tenant_id,payment_kind,subject_reference) do nothing`,
    [
      setup.tenant_id,
      setup.payment_authority_id,
      setup.member_account_id,
      setup.project_id,
      setup.fee_offer_id,
      setup.team_go_evidence_id,
      setup.setup_receipt_sha256,
      setup.stripe_product_id,
      setup.stripe_price_id,
      numericMinor(setup.amount_minor),
      setup.currency,
      setup.operator_connected_account_id,
      setup.ambassador_connected_account_id,
      setup.software_connected_account_id,
      setup.global_concept_test_connected_account_id,
      expiresAt,
      createdAt,
      setup.setup_receipt_id,
      setup.setup_receipt_sha256,
      setup.fee_offer_sha256,
      setup.product_readback_sha256,
      setup.price_readback_sha256,
      setup.beneficiary_binding_sha256,
    ],
  );
  const result = await client.query<{
    payment_authority_id: string;
    source_authority_sha256: string;
    trusted_membership_setup_receipt_id: string;
    trusted_membership_setup_receipt_sha256: string;
  }>(
    `select payment_authority_id,source_authority_sha256,
            trusted_membership_setup_receipt_id,
            trusted_membership_setup_receipt_sha256
       from crays_core.clubs_stripe_sandbox_payment_authorities
      where tenant_id=$1 and payment_kind='MEMBERSHIP' and subject_reference=$2
      for share`,
    [setup.tenant_id, setup.fee_offer_id],
  );
  const row = result.rows[0];
  if (
    result.rows.length !== 1 ||
    row?.payment_authority_id !== setup.payment_authority_id ||
    row.source_authority_sha256 !== setup.setup_receipt_sha256 ||
    row.trusted_membership_setup_receipt_id !== setup.setup_receipt_id ||
    row.trusted_membership_setup_receipt_sha256 !== setup.setup_receipt_sha256
  ) {
    throw new ClubsMembershipPaymentAdapterReplayConflictError();
  }
}

async function persistPreparedPayment(
  client: PoolClient,
  authority: ClubsStripeSandboxPaymentAuthority,
  createdAt: string,
) {
  const authoritySha256 = clubsStripeSha256(authority);
  const inserted = await client.query(
    `insert into crays_core.clubs_stripe_sandbox_payments(
       tenant_id,payment_id,payment_authority_id,project_id,payment_kind,
       billing_ledger_domain,subject_reference,amount_minor,currency,
       operator_connected_account_id,application_fee_amount_minor,
       allocation_plan_sha256,authority_json,authority_sha256,idempotency_key,
       payment_state,livemode,created_at,updated_at
     ) values(
       $1,$2,$3,$4,'MEMBERSHIP','clubs-membership',$5,$6,$7,$8,$9,$10,
       $11::jsonb,$12,$13,'PREPARED',false,$14,$14
     ) on conflict (tenant_id,payment_id) do nothing
     returning payment_id`,
    [
      authority.tenantId,
      authority.paymentId,
      authority.paymentAuthorityId,
      authority.projectId,
      authority.subjectReference,
      authority.amountMinor,
      authority.currency,
      authority.operatorConnectedAccountId,
      authority.applicationFeeAmountMinor,
      authority.allocationPlanSha256,
      JSON.stringify(authority),
      authoritySha256,
      authority.idempotencyKey,
      createdAt,
    ],
  );
  const payment = await client.query<PaymentRow>(
    `select payment_id,payment_authority_id,authority_sha256,
            allocation_plan_sha256,stripe_payment_intent_id,payment_state
       from crays_core.clubs_stripe_sandbox_payments
      where tenant_id=$1 and payment_id=$2
      for update`,
    [authority.tenantId, authority.paymentId],
  );
  const row = payment.rows[0];
  if (
    payment.rows.length !== 1 ||
    row?.payment_authority_id !== authority.paymentAuthorityId ||
    row.authority_sha256 !== authoritySha256 ||
    row.allocation_plan_sha256 !== authority.allocationPlanSha256 ||
    row.stripe_payment_intent_id !== null ||
    row.payment_state !== "PREPARED"
  ) {
    throw new ClubsMembershipPaymentAdapterReplayConflictError();
  }
  const created = (inserted.rowCount ?? inserted.rows.length) === 1;
  if (created) {
    for (const line of authority.allocation) {
      await client.query(
        `insert into crays_core.clubs_stripe_sandbox_ledger_entries(
           tenant_id,ledger_entry_id,payment_id,payment_kind,
           billing_ledger_domain,beneficiary_kind,entry_type,direction,
           amount_minor,currency,evidence_sha256,idempotency_key,occurred_at
         ) values(
           $1,$2,$3,'MEMBERSHIP','clubs-membership',$4,'ALLOCATION','CREDIT',
           $5,$6,$7,$8,$9
         )`,
        [
          authority.tenantId,
          `${authority.paymentId}:allocation:${line.beneficiaryKind}`,
          authority.paymentId,
          line.beneficiaryKind,
          line.amountMinor,
          authority.currency,
          authority.allocationPlanSha256,
          `${authority.idempotencyKey}:allocation:${line.beneficiaryKind}`,
          createdAt,
        ],
      );
      if (line.beneficiaryKind !== "operator_or_franchise") {
        await client.query(
          `insert into crays_core.clubs_stripe_sandbox_transfer_commands(
             tenant_id,transfer_command_id,payment_id,beneficiary_kind,
             destination_connected_account_id,basis_points,amount_minor,currency,
             idempotency_key,transfer_state,available_at,created_at,updated_at
           ) values(
             $1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10,$10,$10
           )`,
          [
            authority.tenantId,
            `${authority.paymentId}:transfer:${line.beneficiaryKind}`,
            authority.paymentId,
            line.beneficiaryKind,
            line.destinationConnectedAccountId,
            line.basisPoints,
            line.amountMinor,
            authority.currency,
            `${authority.idempotencyKey}:transfer:${line.beneficiaryKind}`,
            createdAt,
          ],
        );
      }
    }
  }
  return { authoritySha256, paymentReplayed: !created };
}

async function persistPrepareReceipt(
  client: PoolClient,
  input: Readonly<{
    setup: SetupRow;
    authority: ClubsStripeSandboxPaymentAuthority;
    memberAccountId: string;
    idempotencyKey: string;
    requestSha256: string;
    authoritySha256: string;
    prepareReceiptId: string;
    createdAt: string;
  }>,
) {
  const existingForSetup = await client.query<PrepareReplayRow>(
    `select prepare_receipt_id,prepare_receipt_sha256,setup_receipt_id,
            setup_receipt_sha256,payment_authority_id,payment_id,request_sha256,
            authority_sha256,allocation_plan_sha256,provider_call_authorized,
            provider_called,provider_success_claimed,payment_success_claimed,
            membership_granted,livemode
       from crays_core.clubs_membership_payment_adapter_prepare_receipts
      where tenant_id=$1 and setup_receipt_id=$2
      limit 2
      for update`,
    [input.setup.tenant_id, input.setup.setup_receipt_id],
  );
  if (existingForSetup.rows.length > 1) {
    throw new ClubsMembershipPaymentAdapterStateConflictError();
  }
  const existing = existingForSetup.rows[0];
  if (existing) {
    assertReplay(existing, input.memberAccountId, input.idempotencyKey);
    if (
      existing.request_sha256 !== input.requestSha256 ||
      existing.payment_id !== input.authority.paymentId
    ) {
      throw new ClubsMembershipPaymentAdapterReplayConflictError();
    }
    return true;
  }

  const receiptCore = {
    prepareReceiptId: input.prepareReceiptId,
    setupReceiptId: input.setup.setup_receipt_id,
    setupReceiptSha256: input.setup.setup_receipt_sha256,
    paymentAuthorityId: input.setup.payment_authority_id,
    paymentId: input.authority.paymentId,
    memberAccountId: input.memberAccountId,
    requestSha256: input.requestSha256,
    authoritySha256: input.authoritySha256,
    allocationPlanSha256: input.authority.allocationPlanSha256,
    reconcileState: "PREPARED_NO_PROVIDER_CALL" as const,
    livemode: false as const,
    providerCallAuthorized: false as const,
    providerCalled: false as const,
    providerSuccessClaimed: false as const,
    paymentSuccessClaimed: false as const,
    membershipGranted: false as const,
    createdAt: input.createdAt,
  };
  const prepareReceiptSha256 = clubsMembershipPaymentSha256(receiptCore);
  const receiptJson = { ...receiptCore, prepareReceiptSha256 };
  const inserted = await client.query(
    `insert into crays_core.clubs_membership_payment_adapter_prepare_receipts(
       tenant_id,prepare_receipt_id,prepare_receipt_sha256,setup_receipt_id,
       setup_receipt_sha256,payment_authority_id,payment_id,member_account_id,
       idempotency_key,request_sha256,authority_sha256,allocation_plan_sha256,
       reconcile_state,livemode,provider_call_authorized,provider_called,
       provider_success_claimed,payment_success_claimed,membership_granted,
       prepare_receipt_json,created_at
     ) values(
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
       'PREPARED_NO_PROVIDER_CALL',false,false,false,false,false,false,$13::jsonb,$14
     ) on conflict (tenant_id,member_account_id,idempotency_key) do nothing
     returning prepare_receipt_id`,
    [
      input.setup.tenant_id,
      input.prepareReceiptId,
      prepareReceiptSha256,
      input.setup.setup_receipt_id,
      input.setup.setup_receipt_sha256,
      input.setup.payment_authority_id,
      input.authority.paymentId,
      input.memberAccountId,
      input.idempotencyKey,
      input.requestSha256,
      input.authoritySha256,
      input.authority.allocationPlanSha256,
      JSON.stringify(receiptJson),
      input.createdAt,
    ],
  );
  const replay = await findReplay(
    client,
    input.setup.tenant_id,
    input.memberAccountId,
    input.idempotencyKey,
  );
  if (!replay) {
    throw new ClubsMembershipPaymentAdapterStateConflictError();
  }
  assertReplay(replay, input.memberAccountId, input.idempotencyKey);
  if (
    replay.prepare_receipt_id !== input.prepareReceiptId ||
    replay.prepare_receipt_sha256 !== prepareReceiptSha256 ||
    replay.payment_id !== input.authority.paymentId ||
    replay.authority_sha256 !== input.authoritySha256 ||
    replay.allocation_plan_sha256 !== input.authority.allocationPlanSha256
  ) {
    throw new ClubsMembershipPaymentAdapterReplayConflictError();
  }
  return (inserted.rowCount ?? inserted.rows.length) === 0;
}

export async function prepareClubsMembershipPaymentAdapter(input: Readonly<{
  memberAccountId: string;
  idempotencyKey: string;
  now?: Date;
}>): Promise<ClubsMembershipPaymentPrepareResult> {
  assertClubsMembershipPaymentIdempotencyKey(input.idempotencyKey);
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    throw new ClubsMembershipPaymentAdapterStateConflictError();
  }
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin isolation level serializable");
    await setCoreRole(client);
    const candidates = await resolveCanonicalCandidates(
      client,
      input.memberAccountId,
    );
    if (candidates.length === 0) {
      await client.query("rollback");
      return clubsMembershipPaymentSetupPending("team_go_not_ready");
    }

    const tenantIds: string[] = [
      ...new Set<string>(candidates.map((row) => row.tenant_id)),
    ];
    const replays: PrepareReplayRow[] = [];
    for (const tenantId of tenantIds) {
      const replay = await findReplay(
        client,
        tenantId,
        input.memberAccountId,
        input.idempotencyKey,
      );
      if (replay) replays.push(replay);
    }
    if (replays.length > 1) {
      throw new ClubsMembershipPaymentAdapterStateConflictError();
    }
    if (replays[0]) {
      assertReplay(replays[0], input.memberAccountId, input.idempotencyKey);
      await client.query("commit");
      return clubsMembershipPaymentStructurallyReady(true);
    }

    const setups = await resolveActiveSetups(client, candidates, now);
    if (setups.length === 0) {
      await client.query("rollback");
      return clubsMembershipPaymentSetupPending("membership_setup_not_ready");
    }
    if (setups.length !== 1) {
      await client.query("rollback");
      return clubsMembershipPaymentSetupPending("membership_setup_ambiguous");
    }
    const setup = setups[0]!;
    await setCoreTenant(client, setup.tenant_id);
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      `cclub-membership-prepare:${setup.tenant_id}:${input.memberAccountId}:${input.idempotencyKey}`,
    ]);

    const lockedReplay = await findReplay(
      client,
      setup.tenant_id,
      input.memberAccountId,
      input.idempotencyKey,
    );
    if (lockedReplay) {
      assertReplay(lockedReplay, input.memberAccountId, input.idempotencyKey);
      await client.query("commit");
      return clubsMembershipPaymentStructurallyReady(true);
    }

    const createdAt = now.toISOString();
    await insertPaymentAuthority(client, setup, createdAt);
    const ids = deriveClubsMembershipPaymentPrepareIds({
      tenantId: setup.tenant_id,
      memberAccountId: input.memberAccountId,
      feeOfferId: setup.fee_offer_id,
      idempotencyKey: input.idempotencyKey,
    });
    const requestSha256 = clubsMembershipPaymentPrepareRequestSha({
      memberAccountId: input.memberAccountId,
      idempotencyKey: input.idempotencyKey,
      setupReceiptSha256: setup.setup_receipt_sha256,
      paymentAuthorityId: setup.payment_authority_id,
    });
    const authority = prepareClubsStripeSandboxPayment({
      tenantId: setup.tenant_id,
      projectId: setup.project_id,
      paymentAuthorityId: setup.payment_authority_id,
      sourceAuthoritySha256: setup.setup_receipt_sha256,
      stripeProductId: setup.stripe_product_id,
      stripePriceId: setup.stripe_price_id,
      paymentId: ids.paymentId,
      paymentKind: "MEMBERSHIP",
      subjectReference: setup.fee_offer_id,
      amountMinor: numericMinor(setup.amount_minor),
      currency: setup.currency,
      idempotencyKey: ids.paymentIdempotencyKey,
      recipientAccounts: {
        operatorOrFranchise: setup.operator_connected_account_id,
        ambassador: setup.ambassador_connected_account_id,
        software: setup.software_connected_account_id,
        globalConceptTestOnly: setup.global_concept_test_connected_account_id,
        globalConceptProductionBindingAvailable: false,
      },
      testMode: true,
    });
    const payment = await persistPreparedPayment(client, authority, createdAt);
    const receiptReplayed = await persistPrepareReceipt(client, {
      setup,
      authority,
      memberAccountId: input.memberAccountId,
      idempotencyKey: input.idempotencyKey,
      requestSha256,
      authoritySha256: payment.authoritySha256,
      prepareReceiptId: ids.prepareReceiptId,
      createdAt,
    });
    await client.query("commit");
    return clubsMembershipPaymentStructurallyReady(
      payment.paymentReplayed || receiptReplayed,
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (["42P01", "42703", "42704"].includes(postgresCode(error))) {
      return clubsMembershipPaymentSetupPending("schema_not_ready");
    }
    throw error;
  } finally {
    client.release();
  }
}
