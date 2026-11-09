import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

type QuoteIssueInput = {
  accountId: string;
  propertyId: string;
  unitId: string;
  ratePlanId: string;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  requestedCapacity: number;
  idempotencyKey: string;
  correlationId: string;
};

export type QuoteIssueReceipt = {
  receiptId: string;
  requestId: string;
  outcome: "issued" | "conflict" | "denied" | "invalid";
  reason: string | null;
  quoteId: string | null;
  publicReference: string | null;
  pricingSnapshotSha256: string | null;
  totalMinor: string | null;
  currency: string | null;
  expiresAt: string | null;
  replayed: boolean;
};

type QuoteLine = {
  lineType: "accommodation" | "tax" | "fee" | "deposit";
  sourceVersionId: string;
  serviceDate: string | null;
  label: string;
  quantity: number;
  unitAmountMinor: bigint;
  lineTotalMinor: bigint;
  includedInTotal: boolean;
  metadata: Record<string, unknown>;
};

const QUOTE_TTL_MINUTES = 15;

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function publicReference() {
  return `CQ-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function nightsBetween(arrival: string, departure: string) {
  return Math.round(
    (Date.parse(`${departure}T00:00:00.000Z`)
      - Date.parse(`${arrival}T00:00:00.000Z`))
      / 86_400_000,
  );
}

function roundRatio(amount: bigint, numerator: bigint, denominator: bigint) {
  return (amount * numerator + denominator / BigInt(2)) / denominator;
}

function fixedMultiplier(
  appliesPer: string,
  nights: number,
  guests: number,
  capacity: number,
) {
  if (appliesPer === "night") return nights;
  if (appliesPer === "guest") return guests;
  if (appliesPer === "guest_night") return guests * nights;
  if (appliesPer === "unit") return capacity;
  return 1;
}

function validateInput(input: QuoteIssueInput) {
  for (const [label, value] of [
    ["Property", input.propertyId],
    ["Unit", input.unitId],
    ["Rate Plan", input.ratePlanId],
  ] as const) {
    if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(value)) {
      throw new Error(`${label} is invalid.`);
    }
  }
  if (!isIsoDate(input.arrivalDate) || !isIsoDate(input.departureDate)) {
    throw new Error("Arrival and departure must be real ISO calendar dates.");
  }
  const nights = nightsBetween(input.arrivalDate, input.departureDate);
  if (nights < 1 || nights > 365) throw new Error("Quote stay must contain 1 to 365 nights.");
  if (!Number.isSafeInteger(input.guestCount) || input.guestCount < 1 || input.guestCount > 10_000) {
    throw new Error("Guest count is invalid.");
  }
  if (
    !Number.isSafeInteger(input.requestedCapacity)
    || input.requestedCapacity < 1
    || input.requestedCapacity > 10_000
  ) {
    throw new Error("Requested capacity is invalid.");
  }
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(input.idempotencyKey)) {
    throw new Error("A strong idempotency key is required.");
  }
  return nights;
}

async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin isolation level repeatable read");
    const value = await run(client);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function appendReceipt(
  client: PoolClient,
  input: Omit<QuoteIssueReceipt, "receiptId" | "replayed">,
) {
  const receiptId = id("clubs_quote_receipt");
  await client.query(
    `insert into crays_core.clubs_quote_command_receipts
      (quote_command_receipt_id,quote_command_request_id,outcome,reason,
       quote_snapshot_id,public_reference,pricing_snapshot_sha256,total_minor,
       currency,expires_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      receiptId,
      input.requestId,
      input.outcome,
      input.reason,
      input.quoteId,
      input.publicReference,
      input.pricingSnapshotSha256,
      input.totalMinor,
      input.currency,
      input.expiresAt,
    ],
  );
  return { ...input, receiptId, replayed: false } satisfies QuoteIssueReceipt;
}

export async function issueClubsQuote(
  input: QuoteIssueInput,
): Promise<QuoteIssueReceipt> {
  const nights = validateInput(input);
  const payloadSha256 = hash({
    propertyId: input.propertyId,
    unitId: input.unitId,
    ratePlanId: input.ratePlanId,
    arrivalDate: input.arrivalDate,
    departureDate: input.departureDate,
    guestCount: input.guestCount,
    requestedCapacity: input.requestedCapacity,
  });
  return transaction(async (client) => {
    const requestId = id("clubs_quote_command");
    const inserted = await client.query(
      `insert into crays_core.clubs_quote_command_requests
        (quote_command_request_id,idempotency_key,correlation_id,
         actor_account_id,payload_sha256)
       values ($1,$2,$3,$4,$5)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning quote_command_request_id`,
      [
        requestId,
        input.idempotencyKey,
        input.correlationId,
        input.accountId,
        payloadSha256,
      ],
    );
    if ((inserted.rowCount ?? 0) === 0) {
      const replay = await client.query<{
        quote_command_request_id: string;
        payload_sha256: string;
        quote_command_receipt_id: string;
        outcome: QuoteIssueReceipt["outcome"];
        reason: string | null;
        quote_snapshot_id: string | null;
        public_reference: string | null;
        pricing_snapshot_sha256: string | null;
        total_minor: string | null;
        currency: string | null;
        expires_at: Date | null;
      }>(
        `select request.quote_command_request_id,request.payload_sha256,
           receipt.quote_command_receipt_id,receipt.outcome,receipt.reason,
           receipt.quote_snapshot_id,receipt.public_reference,
           receipt.pricing_snapshot_sha256,receipt.total_minor,receipt.currency,
           receipt.expires_at
         from crays_core.clubs_quote_command_requests request
         join lateral (
           select * from crays_core.clubs_quote_command_receipts
           where quote_command_request_id=request.quote_command_request_id
           order by occurred_at desc limit 1
         ) receipt on true
         where request.actor_account_id=$1 and request.idempotency_key=$2`,
        [input.accountId, input.idempotencyKey],
      );
      const row = replay.rows[0];
      if (!row || row.payload_sha256 !== payloadSha256) {
        throw new ClubsIdempotencyReplayConflictError();
      }
      return {
        receiptId: row.quote_command_receipt_id,
        requestId: row.quote_command_request_id,
        outcome: row.outcome,
        reason: row.reason,
        quoteId: row.quote_snapshot_id,
        publicReference: row.public_reference,
        pricingSnapshotSha256: row.pricing_snapshot_sha256,
        totalMinor: row.total_minor,
        currency: row.currency,
        expiresAt: row.expires_at?.toISOString() ?? null,
        replayed: true,
      };
    }

    const commercial = await client.query<{
      rate_plan_id: string;
      currency: string;
      rate_plan_version_id: string;
      base_nightly_minor: string;
      minimum_stay_nights: number;
      maximum_stay_nights: number | null;
      deposit_policy_version_id: string | null;
      cancellation_policy_version_id: string;
      assignment_id: string;
      assignment_version: number;
      partner_tenant_id: string;
      operator_legal_entity_id: string;
      vendure_seller_id: string;
      vendure_channel_id: string;
      stripe_connected_account_id: string;
      erp_site_id: string;
      erp_company_id: string;
      qlo_shop_id: string;
      qlo_hotel_id: string;
      binding_version: number;
    }>(
      `select rate.rate_plan_id,rate.currency,version.rate_plan_version_id,
         version.base_nightly_minor,version.minimum_stay_nights,
         version.maximum_stay_nights,version.deposit_policy_version_id,
         version.cancellation_policy_version_id,
         assignment.assignment_id,assignment.version assignment_version,
         assignment.partner_tenant_id,assignment.operator_legal_entity_id,
         binding.vendure_seller_id,binding.vendure_channel_id,
         binding.stripe_connected_account_id,binding.erp_site_id,
         binding.erp_company_id,binding.qlo_shop_id,binding.qlo_hotel_id,
         binding.binding_version
       from crays_core.crays_accounts account
       join crays_core.clubs_properties property
         on property.property_id=$2 and property.lifecycle='published'
       join crays_core.clubs_units unit
         on unit.unit_id=$3 and unit.property_id=property.property_id
        and unit.lifecycle='published'
       join crays_core.clubs_rate_plans rate
         on rate.rate_plan_id=$4 and rate.unit_id=unit.unit_id
        and rate.lifecycle='published'
       join crays_core.clubs_rate_plan_versions version
         on version.rate_plan_id=rate.rate_plan_id
        and version.version=rate.current_version
        and version.valid_from<=$5::date
        and (version.valid_until is null or version.valid_until>=$6::date-1)
       join crays_core.clubs_cancellation_policy_versions cancellation
         on cancellation.cancellation_policy_version_id=version.cancellation_policy_version_id
       join crays_core.clubs_cancellation_policies cancellation_root
         on cancellation_root.cancellation_policy_id=cancellation.cancellation_policy_id
        and cancellation_root.property_id=property.property_id
        and cancellation_root.lifecycle='published'
        and cancellation_root.current_version=cancellation.version
       left join crays_core.clubs_deposit_policy_versions deposit
         on deposit.deposit_policy_version_id=version.deposit_policy_version_id
       left join crays_core.clubs_deposit_policies deposit_root
         on deposit_root.deposit_policy_id=deposit.deposit_policy_id
        and deposit_root.property_id=property.property_id
        and deposit_root.lifecycle='published'
        and deposit_root.current_version=deposit.version
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=property.store_id
        and assignment.partner_tenant_id=property.partner_tenant_id
        and assignment.operator_legal_entity_id=property.operator_legal_entity_id
        and assignment.vertical_root='clubs'
        and assignment.status='active'
        and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       join lateral (
         select binding.*
         from crays_core.provider_scope_bindings binding
         where binding.assignment_id=assignment.assignment_id
           and binding.assignment_version=assignment.version
           and binding.status='active'
           and binding.vendure_seller_id is not null
           and binding.vendure_channel_id is not null
           and binding.stripe_connected_account_id is not null
           and binding.erp_site_id is not null
           and binding.erp_company_id is not null
           and binding.qlo_shop_id is not null
           and binding.qlo_hotel_id is not null
         order by binding.binding_version desc
         limit 1
       ) binding on true
       where account.account_id=$1 and account.status='active'
         and (
           version.deposit_policy_version_id is null
           or deposit_root.deposit_policy_id is not null
         )
       limit 1
       for share of property,unit,rate,version,assignment`,
      [
        input.accountId,
        input.propertyId,
        input.unitId,
        input.ratePlanId,
        input.arrivalDate,
        input.departureDate,
      ],
    );
    const source = commercial.rows[0];
    if (!source) {
      await client.query(
        `update crays_core.clubs_quote_command_requests
         set status='denied',completed_at=now()
         where quote_command_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "denied",
        reason: "published_rate_policies_and_exact_seller_routing_required",
        quoteId: null,
        publicReference: null,
        pricingSnapshotSha256: null,
        totalMinor: null,
        currency: null,
        expiresAt: null,
      });
    }
    if (
      nights < source.minimum_stay_nights
      || (source.maximum_stay_nights !== null && nights > source.maximum_stay_nights)
    ) {
      await client.query(
        `update crays_core.clubs_quote_command_requests
         set status='conflict',completed_at=now()
         where quote_command_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "conflict",
        reason: "rate_plan_stay_constraint",
        quoteId: null,
        publicReference: null,
        pricingSnapshotSha256: null,
        totalMinor: null,
        currency: source.currency,
        expiresAt: null,
      });
    }

    const nightly = await client.query<{
      service_date: string;
      nightly_minor: string;
      source_version_id: string;
      label: string;
      minimum_stay_nights: number | null;
      maximum_stay_nights: number | null;
    }>(
      `select day.service_date::text,
         coalesce(season.nightly_minor,$4::bigint)::text nightly_minor,
         coalesce(season.rate_season_id,$3) source_version_id,
         coalesce(season.name,'Base nightly rate') label,
         season.minimum_stay_nights,season.maximum_stay_nights
       from generate_series($1::date,$2::date-1,interval '1 day') day(service_date)
       left join lateral (
         select rate_season_id,name,nightly_minor,minimum_stay_nights,
           maximum_stay_nights
         from crays_core.clubs_rate_seasons
         where rate_plan_version_id=$3
           and day.service_date::date between starts_on and ends_on
         order by priority desc,rate_season_id asc
         limit 1
       ) season on true
       order by day.service_date`,
      [
        input.arrivalDate,
        input.departureDate,
        source.rate_plan_version_id,
        source.base_nightly_minor,
      ],
    );
    const incompatibleSeason = nightly.rows.find((row) =>
      (row.minimum_stay_nights !== null && nights < row.minimum_stay_nights)
      || (row.maximum_stay_nights !== null && nights > row.maximum_stay_nights));
    if (nightly.rows.length !== nights || incompatibleSeason) {
      await client.query(
        `update crays_core.clubs_quote_command_requests
         set status='conflict',completed_at=now()
         where quote_command_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "conflict",
        reason: incompatibleSeason ? "season_stay_constraint" : "nightly_rate_gap",
        quoteId: null,
        publicReference: null,
        pricingSnapshotSha256: null,
        totalMinor: null,
        currency: source.currency,
        expiresAt: null,
      });
    }

    const taxRules = await client.query<{
      tax_rule_version_id: string;
      rule_key: string;
      calculation_type: "percentage" | "fixed";
      percentage_basis_points: number | null;
      amount_minor: string | null;
      currency: string | null;
      inclusive: boolean;
      applies_per: string;
    }>(
      `select distinct on (rule_key) tax_rule_version_id,rule_key,
         calculation_type,percentage_basis_points,amount_minor,currency,
         inclusive,applies_per
       from crays_core.clubs_tax_rule_versions
       where property_id=$1 and lifecycle='published'
         and valid_from<=$2::date
         and (valid_until is null or valid_until>=$3::date-1)
       order by rule_key,version desc`,
      [input.propertyId, input.arrivalDate, input.departureDate],
    );
    if (!taxRules.rows.length) {
      await client.query(
        `update crays_core.clubs_quote_command_requests
         set status='invalid',completed_at=now()
         where quote_command_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "invalid",
        reason: "published_tax_policy_required",
        quoteId: null,
        publicReference: null,
        pricingSnapshotSha256: null,
        totalMinor: null,
        currency: source.currency,
        expiresAt: null,
      });
    }
    const feeRules = await client.query<{
      fee_rule_version_id: string;
      rule_key: string;
      label: string;
      calculation_type: "percentage" | "fixed";
      percentage_basis_points: number | null;
      amount_minor: string | null;
      currency: string | null;
      mandatory: boolean;
      applies_per: string;
    }>(
      `select distinct on (rule_key) fee_rule_version_id,rule_key,label,
         calculation_type,percentage_basis_points,amount_minor,currency,
         mandatory,applies_per
       from crays_core.clubs_fee_rule_versions
       where property_id=$1 and lifecycle='published'
         and valid_from<=$2::date
         and (valid_until is null or valid_until>=$3::date-1)
       order by rule_key,version desc`,
      [input.propertyId, input.arrivalDate, input.departureDate],
    );
    const deposit = source.deposit_policy_version_id
      ? await client.query<{
          deposit_policy_version_id: string;
          calculation_type: "none" | "fixed" | "percentage";
          amount_minor: string | null;
          percentage_basis_points: number | null;
          currency: string | null;
          due_event: string;
          due_offset_hours: number | null;
          refundable: boolean;
        }>(
          `select deposit_policy_version_id,calculation_type,amount_minor,
             percentage_basis_points,currency,due_event,due_offset_hours,refundable
           from crays_core.clubs_deposit_policy_versions
           where deposit_policy_version_id=$1`,
          [source.deposit_policy_version_id],
        )
      : null;
    const cancellation = await client.query<{
      cancellation_policy_version_id: string;
      name: string;
      no_show_refund_basis_points: number;
      tier_order: number | null;
      minimum_hours_before_arrival: number | null;
      refund_basis_points: number | null;
      fee_minor: string | null;
      fee_currency: string | null;
    }>(
      `select policy.cancellation_policy_version_id,policy.name,
         policy.no_show_refund_basis_points,tier.tier_order,
         tier.minimum_hours_before_arrival,tier.refund_basis_points,
         tier.fee_minor,tier.fee_currency
       from crays_core.clubs_cancellation_policy_versions policy
       left join crays_core.clubs_cancellation_policy_tiers tier
         on tier.cancellation_policy_version_id=policy.cancellation_policy_version_id
       where policy.cancellation_policy_version_id=$1
       order by tier.tier_order`,
      [source.cancellation_policy_version_id],
    );

    const accommodationSubtotal = nightly.rows.reduce(
      (sum, row) => sum + BigInt(row.nightly_minor),
      BigInt(0),
    );
    const lines: QuoteLine[] = nightly.rows.map((row) => ({
      lineType: "accommodation",
      sourceVersionId: row.source_version_id,
      serviceDate: row.service_date,
      label: row.label,
      quantity: 1,
      unitAmountMinor: BigInt(row.nightly_minor),
      lineTotalMinor: BigInt(row.nightly_minor),
      includedInTotal: true,
      metadata: {},
    }));
    let inclusiveTax = BigInt(0);
    let exclusiveTax = BigInt(0);
    for (const rule of taxRules.rows) {
      if (
        rule.calculation_type === "fixed"
        && rule.currency !== source.currency
      ) {
        throw new Error("Fixed tax currency differs from the Rate Plan currency.");
      }
      const amount =
        rule.calculation_type === "percentage"
          ? rule.inclusive
            ? roundRatio(
                accommodationSubtotal,
                BigInt(rule.percentage_basis_points ?? 0),
                BigInt(10_000) + BigInt(rule.percentage_basis_points ?? 0),
              )
            : roundRatio(
                accommodationSubtotal,
                BigInt(rule.percentage_basis_points ?? 0),
                BigInt(10_000),
              )
          : BigInt(rule.amount_minor ?? "0")
            * BigInt(fixedMultiplier(
              rule.applies_per,
              nights,
              input.guestCount,
              input.requestedCapacity,
            ));
      if (rule.inclusive) inclusiveTax += amount;
      else exclusiveTax += amount;
      lines.push({
        lineType: "tax",
        sourceVersionId: rule.tax_rule_version_id,
        serviceDate: null,
        label: rule.rule_key,
        quantity: 1,
        unitAmountMinor: amount,
        lineTotalMinor: amount,
        includedInTotal: !rule.inclusive,
        metadata: {
          inclusive: rule.inclusive,
          calculationType: rule.calculation_type,
          appliesPer: rule.applies_per,
        },
      });
    }
    let mandatoryFees = BigInt(0);
    for (const rule of feeRules.rows.filter((candidate) => candidate.mandatory)) {
      if (
        rule.calculation_type === "fixed"
        && rule.currency !== source.currency
      ) {
        throw new Error("Fixed fee currency differs from the Rate Plan currency.");
      }
      const amount =
        rule.calculation_type === "percentage"
          ? roundRatio(
              accommodationSubtotal,
              BigInt(rule.percentage_basis_points ?? 0),
              BigInt(10_000),
            )
          : BigInt(rule.amount_minor ?? "0")
            * BigInt(fixedMultiplier(
              rule.applies_per,
              nights,
              input.guestCount,
              input.requestedCapacity,
            ));
      mandatoryFees += amount;
      lines.push({
        lineType: "fee",
        sourceVersionId: rule.fee_rule_version_id,
        serviceDate: null,
        label: rule.label,
        quantity: 1,
        unitAmountMinor: amount,
        lineTotalMinor: amount,
        includedInTotal: true,
        metadata: {
          mandatory: true,
          calculationType: rule.calculation_type,
          appliesPer: rule.applies_per,
        },
      });
    }
    const total = accommodationSubtotal + exclusiveTax + mandatoryFees;
    const depositRow = deposit?.rows[0] ?? null;
    if (
      depositRow?.calculation_type === "fixed"
      && depositRow.currency !== source.currency
    ) {
      throw new Error("Deposit currency differs from the Rate Plan currency.");
    }
    const depositDue =
      !depositRow || depositRow.calculation_type === "none"
        ? BigInt(0)
        : depositRow.calculation_type === "fixed"
          ? BigInt(depositRow.amount_minor ?? "0")
          : roundRatio(
              total,
              BigInt(depositRow.percentage_basis_points ?? 0),
              BigInt(10_000),
            );
    if (depositRow) {
      lines.push({
        lineType: "deposit",
        sourceVersionId: depositRow.deposit_policy_version_id,
        serviceDate: null,
        label: "Deposit due",
        quantity: 1,
        unitAmountMinor: depositDue,
        lineTotalMinor: depositDue,
        includedInTotal: false,
        metadata: {
          dueEvent: depositRow.due_event,
          dueOffsetHours: depositRow.due_offset_hours,
          refundable: depositRow.refundable,
        },
      });
    }
    const cancellationSnapshot = {
      versionId: source.cancellation_policy_version_id,
      name: cancellation.rows[0]?.name ?? "",
      noShowRefundBasisPoints:
        cancellation.rows[0]?.no_show_refund_basis_points ?? 0,
      tiers: cancellation.rows
        .filter((row) => row.tier_order !== null)
        .map((row) => ({
          order: row.tier_order,
          minimumHoursBeforeArrival: row.minimum_hours_before_arrival,
          refundBasisPoints: row.refund_basis_points,
          feeMinor: row.fee_minor,
          feeCurrency: row.fee_currency,
        })),
    };
    const sellerSnapshot = {
      verticalRoot: "clubs",
      propertyId: input.propertyId,
      assignmentId: source.assignment_id,
      assignmentVersion: source.assignment_version,
      partnerTenantId: source.partner_tenant_id,
      operatorLegalEntityId: source.operator_legal_entity_id,
      providerBindingVersion: source.binding_version,
      vendureSellerId: source.vendure_seller_id,
      vendureChannelId: source.vendure_channel_id,
      stripeConnectedAccountId: source.stripe_connected_account_id,
      erpSiteId: source.erp_site_id,
      erpCompanyId: source.erp_company_id,
      qloShopId: source.qlo_shop_id,
      qloHotelId: source.qlo_hotel_id,
    };
    const snapshotBody = {
      accountId: input.accountId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      ratePlanId: input.ratePlanId,
      ratePlanVersionId: source.rate_plan_version_id,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      guestCount: input.guestCount,
      requestedCapacity: input.requestedCapacity,
      nights,
      currency: source.currency,
      accommodationSubtotalMinor: accommodationSubtotal.toString(),
      inclusiveTaxMinor: inclusiveTax.toString(),
      exclusiveTaxMinor: exclusiveTax.toString(),
      mandatoryFeeMinor: mandatoryFees.toString(),
      totalMinor: total.toString(),
      depositDueMinor: depositDue.toString(),
      sellerSnapshot,
      cancellationSnapshot,
      lines: lines.map((line) => ({
        ...line,
        unitAmountMinor: line.unitAmountMinor.toString(),
        lineTotalMinor: line.lineTotalMinor.toString(),
      })),
    };
    const pricingSnapshotSha256 = hash(snapshotBody);
    const quoteId = id("clubs_quote");
    const reference = publicReference();
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000);
    await client.query(
      `insert into crays_core.clubs_quote_snapshots
        (quote_snapshot_id,public_reference,account_id,property_id,unit_id,
         rate_plan_id,rate_plan_version_id,deposit_policy_version_id,
         cancellation_policy_version_id,arrival_date,departure_date,guest_count,
         requested_capacity,night_count,currency,accommodation_subtotal_minor,
         inclusive_tax_minor,exclusive_tax_minor,mandatory_fee_minor,total_minor,
         deposit_due_minor,seller_snapshot,cancellation_snapshot,
         pricing_snapshot_sha256,expires_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,$22::jsonb,$23::jsonb,$24,$25)`,
      [
        quoteId,
        reference,
        input.accountId,
        input.propertyId,
        input.unitId,
        input.ratePlanId,
        source.rate_plan_version_id,
        source.deposit_policy_version_id,
        source.cancellation_policy_version_id,
        input.arrivalDate,
        input.departureDate,
        input.guestCount,
        input.requestedCapacity,
        nights,
        source.currency,
        accommodationSubtotal.toString(),
        inclusiveTax.toString(),
        exclusiveTax.toString(),
        mandatoryFees.toString(),
        total.toString(),
        depositDue.toString(),
        JSON.stringify(sellerSnapshot),
        JSON.stringify(cancellationSnapshot),
        pricingSnapshotSha256,
        expiresAt,
      ],
    );
    for (const [index, line] of lines.entries()) {
      await client.query(
        `insert into crays_core.clubs_quote_lines
          (quote_line_id,quote_snapshot_id,line_order,line_type,
           source_version_id,service_date,label,quantity,unit_amount_minor,
           line_total_minor,included_in_total,metadata)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
        [
          `${quoteId}:line:${String(index + 1).padStart(3, "0")}`,
          quoteId,
          index,
          line.lineType,
          line.sourceVersionId,
          line.serviceDate,
          line.label,
          line.quantity,
          line.unitAmountMinor.toString(),
          line.lineTotalMinor.toString(),
          line.includedInTotal,
          JSON.stringify(line.metadata),
        ],
      );
    }
    await client.query(
      `update crays_core.clubs_quote_command_requests
       set status='issued',quote_snapshot_id=$2,completed_at=now()
       where quote_command_request_id=$1`,
      [requestId, quoteId],
    );
    return appendReceipt(client, {
      requestId,
      outcome: "issued",
      reason: null,
      quoteId,
      publicReference: reference,
      pricingSnapshotSha256,
      totalMinor: total.toString(),
      currency: source.currency,
      expiresAt: expiresAt.toISOString(),
    });
  });
}

export async function readOwnClubsQuotes(accountId: string) {
  const pool = getCorePgPool();
  const result = await pool.query<{
    quote_snapshot_id: string;
    public_reference: string;
    property_id: string;
    unit_id: string;
    rate_plan_id: string;
    arrival_date: string;
    departure_date: string;
    guest_count: number;
    requested_capacity: number;
    night_count: number;
    currency: string;
    accommodation_subtotal_minor: string;
    inclusive_tax_minor: string;
    exclusive_tax_minor: string;
    mandatory_fee_minor: string;
    total_minor: string;
    deposit_due_minor: string;
    seller_snapshot: Record<string, unknown>;
    cancellation_snapshot: Record<string, unknown>;
    pricing_snapshot_sha256: string;
    issued_at: Date;
    expires_at: Date;
    accepted_at: Date | null;
    reservation_hold_id: string | null;
  }>(
    `select quote.quote_snapshot_id,quote.public_reference,quote.property_id,
       quote.unit_id,quote.rate_plan_id,quote.arrival_date::text,
       quote.departure_date::text,quote.guest_count,quote.requested_capacity,
       quote.night_count,quote.currency,quote.accommodation_subtotal_minor,
       quote.inclusive_tax_minor,quote.exclusive_tax_minor,
       quote.mandatory_fee_minor,quote.total_minor,quote.deposit_due_minor,
       quote.seller_snapshot,quote.cancellation_snapshot,
       quote.pricing_snapshot_sha256,quote.issued_at,quote.expires_at,
       acceptance.accepted_at,acceptance.reservation_hold_id
     from crays_core.clubs_quote_snapshots quote
     left join crays_core.clubs_quote_acceptances acceptance
       on acceptance.quote_snapshot_id=quote.quote_snapshot_id
     where quote.account_id=$1
     order by quote.issued_at desc
     limit 50`,
    [accountId],
  );
  const quoteIds = result.rows.map((row) => row.quote_snapshot_id);
  const lineResult = quoteIds.length
    ? await pool.query<{
        quote_snapshot_id: string;
        line_order: number;
        line_type: QuoteLine["lineType"];
        source_version_id: string;
        service_date: string | null;
        label: string;
        quantity: number;
        unit_amount_minor: string;
        line_total_minor: string;
        included_in_total: boolean;
        metadata: Record<string, unknown>;
      }>(
        `select line.quote_snapshot_id,line.line_order,line.line_type,
           line.source_version_id,line.service_date::text,line.label,
           line.quantity,line.unit_amount_minor,line.line_total_minor,
           line.included_in_total,line.metadata
         from crays_core.clubs_quote_lines line
         join crays_core.clubs_quote_snapshots quote
           on quote.quote_snapshot_id=line.quote_snapshot_id
          and quote.account_id=$1
         where line.quote_snapshot_id=any($2::text[])
         order by line.quote_snapshot_id,line.line_order`,
        [accountId, quoteIds],
      )
    : { rows: [] };
  const linesByQuote = new Map<string, typeof lineResult.rows>();
  for (const line of lineResult.rows) {
    const current = linesByQuote.get(line.quote_snapshot_id) ?? [];
    current.push(line);
    linesByQuote.set(line.quote_snapshot_id, current);
  }
  const now = Date.now();
  return result.rows.map((row) => {
    const operatorLegalEntityId =
      typeof row.seller_snapshot.operatorLegalEntityId === "string"
        ? row.seller_snapshot.operatorLegalEntityId
        : null;
    const partnerTenantId =
      typeof row.seller_snapshot.partnerTenantId === "string"
        ? row.seller_snapshot.partnerTenantId
        : null;
    return {
      quoteId: row.quote_snapshot_id,
      publicReference: row.public_reference,
      propertyId: row.property_id,
      unitId: row.unit_id,
      ratePlanId: row.rate_plan_id,
      arrivalDate: row.arrival_date,
      departureDate: row.departure_date,
      guestCount: row.guest_count,
      requestedCapacity: row.requested_capacity,
      nights: row.night_count,
      currency: row.currency,
      accommodationSubtotalMinor: row.accommodation_subtotal_minor,
      inclusiveTaxMinor: row.inclusive_tax_minor,
      exclusiveTaxMinor: row.exclusive_tax_minor,
      mandatoryFeeMinor: row.mandatory_fee_minor,
      totalMinor: row.total_minor,
      depositDueMinor: row.deposit_due_minor,
      pricingSnapshotSha256: row.pricing_snapshot_sha256,
      merchantOfRecord: { operatorLegalEntityId, partnerTenantId },
      cancellationPolicy: row.cancellation_snapshot,
      lines: (linesByQuote.get(row.quote_snapshot_id) ?? []).map((line) => ({
        order: line.line_order,
        type: line.line_type,
        sourceVersionId: line.source_version_id,
        serviceDate: line.service_date,
        label: line.label,
        quantity: line.quantity,
        unitAmountMinor: line.unit_amount_minor,
        lineTotalMinor: line.line_total_minor,
        includedInTotal: line.included_in_total,
        metadata: line.metadata,
      })),
      issuedAt: row.issued_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      status: row.accepted_at
        ? "accepted"
        : row.expires_at.getTime() <= now
          ? "expired"
          : "active",
      acceptedAt: row.accepted_at?.toISOString() ?? null,
      holdId: row.reservation_hold_id,
    };
  });
}
