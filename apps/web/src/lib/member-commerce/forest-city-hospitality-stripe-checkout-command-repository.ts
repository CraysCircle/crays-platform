import { createHash } from "node:crypto";

export type HotelStripeCheckoutPool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
    release(): void;
  }>;
};

export type PrepareHotelStripeCheckoutCommandInput = {
  tenantId: string;
  checkoutCommandId: string;
  outboxEventId: string;
  holdId: string;
  revenueAllocationReceiptId: string;
  stripeCustomerId: string;
  stripeCustomerCreatedEvidenceSha256: string;
  idempotencyKey: string;
  createdAt: string;
};

export type HotelStripeCheckoutCommand = {
  checkoutCommandId: string;
  holdId: string;
  state: "PERSISTED_PENDING_PROVIDER";
  amountTotalMinor: number;
  applicationFeeAmountMinor: number;
  operatorResidualAmountMinor: number;
  currency: string;
  stripeConnectedAccountId: string;
  stripeEnvironment: "test" | "live";
  sellerSnapshotSha256: string;
  requestSha256: string;
  performsProviderMutation: false;
  replayed: boolean;
};

type AuthorityRow = {
  hold_id: string;
  tenant_id: string;
  franchise_project_id: string;
  property_id: string;
  store_id: string;
  legal_entity_id: string;
  commercial_assignment_id: string;
  source_receipt_id: string;
  source_manifest_binding_id: string;
  room_type_id: string;
  currency: string;
  total_amount_minor: string | number;
  pricing_breakdown_sha256: string;
  hold_request_sha256: string;
  revenue_allocation_receipt_id: string;
  allocation_receipt_sha256: string;
  allocation_total_minor: string | number;
  marketing_bps: string | number;
  marketing_minor: string | number;
  technology_bps: string | number;
  technology_minor: string | number;
  global_concept_bps: string | number;
  global_concept_minor: string | number;
  operating_bps: string | number;
  operating_minor: string | number;
  global_concept_resolution_receipt_sha256: string;
  merchant_binding_id: string;
  binding_version: string | number;
  merchant_of_record_legal_entity_id: string;
  stripe_connected_account_id: string;
  stripe_environment: "test" | "live";
  capability_receipt_sha256: string;
  requirements_receipt_sha256: string;
};

type ExistingRow = {
  checkout_command_id: string;
  hold_id: string;
  merchant_binding_id: string;
  merchant_binding_version: string | number;
  revenue_allocation_receipt_id: string;
  stripe_customer_id: string;
  amount_total_minor: string | number;
  application_fee_amount_minor: string | number;
  operator_residual_amount_minor: string | number;
  currency: string;
  stripe_connected_account_id: string;
  stripe_environment: "test" | "live";
  seller_snapshot_sha256: string;
  request_sha256: string;
  command_state: "PERSISTED_PENDING_PROVIDER";
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const CUSTOMER = /^cus_[A-Za-z0-9]{8,}$/;
const ACCOUNT = /^acct_[A-Za-z0-9]{8,}$/;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("HOTEL_STRIPE_CHECKOUT_CANONICAL_VALUE_INVALID");
  return serialized;
}

const sha256 = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const nonempty = (value: string) => typeof value === "string" && value.trim().length > 0;

function normalize(input: PrepareHotelStripeCheckoutCommandInput) {
  if (![input.checkoutCommandId, input.outboxEventId, input.holdId].every((value) => UUID.test(value))) {
    throw new Error("HOTEL_STRIPE_CHECKOUT_UUID_INVALID");
  }
  if (!nonempty(input.tenantId) || !nonempty(input.revenueAllocationReceiptId) || !nonempty(input.idempotencyKey)) {
    throw new Error("HOTEL_STRIPE_CHECKOUT_SCOPE_INVALID");
  }
  if (!CUSTOMER.test(input.stripeCustomerId) || !HASH.test(input.stripeCustomerCreatedEvidenceSha256)) {
    throw new Error("HOTEL_STRIPE_CHECKOUT_CUSTOMER_EVIDENCE_INVALID");
  }
  const createdAt = new Date(input.createdAt);
  if (!Number.isFinite(createdAt.getTime())) throw new Error("HOTEL_STRIPE_CHECKOUT_TIME_INVALID");
  return Object.freeze({ ...input, tenantId: input.tenantId.trim(), idempotencyKey: input.idempotencyKey.trim(), createdAt: createdAt.toISOString() });
}

function integer(value: string | number, code: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(code);
  return parsed;
}

function mapExisting(row: ExistingRow, replayed: boolean): HotelStripeCheckoutCommand {
  return Object.freeze({
    checkoutCommandId: row.checkout_command_id,
    holdId: row.hold_id,
    state: row.command_state,
    amountTotalMinor: Number(row.amount_total_minor),
    applicationFeeAmountMinor: Number(row.application_fee_amount_minor),
    operatorResidualAmountMinor: Number(row.operator_residual_amount_minor),
    currency: row.currency,
    stripeConnectedAccountId: row.stripe_connected_account_id,
    stripeEnvironment: row.stripe_environment,
    sellerSnapshotSha256: row.seller_snapshot_sha256,
    requestSha256: row.request_sha256,
    performsProviderMutation: false,
    replayed,
  });
}

export async function prepareHotelStripeCheckoutCommand(
  pool: HotelStripeCheckoutPool,
  rawInput: PrepareHotelStripeCheckoutCommandInput,
): Promise<HotelStripeCheckoutCommand> {
  const input = normalize(rawInput);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true), set_config('crays.tenant_id', $1, true), set_config('crays.app_role', 'core_service', true)", [input.tenantId]);
    const authority = (await client.query<AuthorityRow>(
      `SELECT h.hold_id,h.tenant_id,h.franchise_project_id,h.property_id,h.store_id,
              h.legal_entity_id,h.commercial_assignment_id,h.source_receipt_id,
              h.source_manifest_binding_id,h.room_type_id,h.currency,h.total_amount_minor,
              h.pricing_breakdown_sha256,h.request_sha256 AS hold_request_sha256,
              r."id" AS revenue_allocation_receipt_id,
              r."allocation_receipt_sha256",r."total_minor" AS allocation_total_minor,
              r."marketing_bps",r."marketing_minor",r."technology_bps",r."technology_minor",
              r."global_concept_bps",r."global_concept_minor",r."operating_bps",r."operating_minor",
              r."global_concept_resolution_receipt_sha256",
              b.merchant_binding_id,b.binding_version,b.merchant_of_record_legal_entity_id,
              b.stripe_connected_account_id,b.stripe_environment,b.capability_receipt_sha256,
              b.requirements_receipt_sha256
         FROM crays_core.clubs_hotel_booking_inventory_holds h
         JOIN "CraysClubBookingRevenueAllocationReceipt" r
           ON r."id"=$3 AND r."tenant_id"::text=h.tenant_id
         JOIN crays_core.clubs_hotel_stripe_merchant_account_bindings b
           ON b.tenant_id=h.tenant_id AND b.franchise_project_id=h.franchise_project_id
          AND b.store_id=h.store_id AND b.legal_entity_id=h.legal_entity_id
          AND b.commercial_assignment_id=h.commercial_assignment_id
        WHERE h.tenant_id=$1 AND h.hold_id=$2 AND h.hold_status='held-pending-payment'
          AND h.expires_at>$4::timestamptz AND b.capability_state='ACTIVE'
          AND b.persisted_record=true AND b.synthetic_source=false
          AND b.valid_from<=$4::timestamptz AND b.valid_until>$4::timestamptz
        ORDER BY b.binding_version DESC LIMIT 1 FOR UPDATE OF h`,
      [input.tenantId, input.holdId, input.revenueAllocationReceiptId, input.createdAt],
    )).rows[0];
    if (!authority) throw new Error("HOTEL_STRIPE_CHECKOUT_AUTHORITY_NOT_READY");

    const total = integer(authority.total_amount_minor, "HOTEL_STRIPE_CHECKOUT_AMOUNT_INVALID");
    const allocationTotal = integer(authority.allocation_total_minor, "HOTEL_STRIPE_CHECKOUT_ALLOCATION_INVALID");
    const marketing = integer(authority.marketing_minor, "HOTEL_STRIPE_CHECKOUT_ALLOCATION_INVALID");
    const technology = integer(authority.technology_minor, "HOTEL_STRIPE_CHECKOUT_ALLOCATION_INVALID");
    const globalConcept = integer(authority.global_concept_minor, "HOTEL_STRIPE_CHECKOUT_ALLOCATION_INVALID");
    const operating = integer(authority.operating_minor, "HOTEL_STRIPE_CHECKOUT_ALLOCATION_INVALID");
    const applicationFee = marketing + technology + globalConcept;
    if (
      total <= 0 || allocationTotal !== total || applicationFee <= 0 || operating <= 0 || applicationFee + operating !== total ||
      Number(authority.marketing_bps) !== 1000 || Number(authority.technology_bps) !== 500 ||
      Number(authority.global_concept_bps) !== 25 || Number(authority.operating_bps) !== 8475 ||
      !HASH.test(authority.allocation_receipt_sha256) || !HASH.test(authority.global_concept_resolution_receipt_sha256) ||
      !HASH.test(authority.pricing_breakdown_sha256) || !HASH.test(authority.hold_request_sha256) ||
      !HASH.test(authority.capability_receipt_sha256) || !HASH.test(authority.requirements_receipt_sha256) ||
      !ACCOUNT.test(authority.stripe_connected_account_id) || !["test", "live"].includes(authority.stripe_environment) ||
      authority.merchant_of_record_legal_entity_id !== authority.legal_entity_id || !/^[A-Z]{3}$/.test(authority.currency)
    ) throw new Error("HOTEL_STRIPE_CHECKOUT_AUTHORITY_CONFLICT");

    const sellerSnapshot = Object.freeze({
      tenantId: authority.tenant_id,
      franchiseProjectId: authority.franchise_project_id,
      propertyId: authority.property_id,
      storeId: authority.store_id,
      legalEntityId: authority.legal_entity_id,
      commercialAssignmentId: authority.commercial_assignment_id,
      merchantBindingId: authority.merchant_binding_id,
      merchantBindingVersion: Number(authority.binding_version),
      stripeConnectedAccountId: authority.stripe_connected_account_id,
      stripeEnvironment: authority.stripe_environment,
      capabilityReceiptSha256: authority.capability_receipt_sha256,
      requirementsReceiptSha256: authority.requirements_receipt_sha256,
    });
    const sellerSnapshotSha256 = sha256(sellerSnapshot);
    const requestPayload = Object.freeze({
      contractVersion: "cclub.hotel-stripe-checkout-command.v1",
      commandKind: "CREATE_CHECKOUT_SESSION_PAYMENT",
      holdId: authority.hold_id,
      customerId: input.stripeCustomerId,
      customerCreatedEvidenceSha256: input.stripeCustomerCreatedEvidenceSha256,
      amountTotalMinor: total,
      currency: authority.currency,
      applicationFeeAmountMinor: applicationFee,
      operatorResidualAmountMinor: operating,
      stripeConnectedAccountId: authority.stripe_connected_account_id,
      stripeEnvironment: authority.stripe_environment,
      merchantOfRecordLegalEntityId: authority.merchant_of_record_legal_entity_id,
      revenueAllocationReceiptId: authority.revenue_allocation_receipt_id,
      revenueAllocationReceiptSha256: authority.allocation_receipt_sha256,
      sellerSnapshotSha256,
      pricingBreakdownSha256: authority.pricing_breakdown_sha256,
      holdRequestSha256: authority.hold_request_sha256,
      dynamicPaymentMethods: true,
      browserReturnSettlesPayment: false,
      performsProviderMutation: false,
    });
    const requestSha256 = sha256(requestPayload);
    const replay = (await client.query<ExistingRow>(
      `SELECT checkout_command_id,hold_id,merchant_binding_id,merchant_binding_version,
              revenue_allocation_receipt_id,stripe_customer_id,amount_total_minor,
              application_fee_amount_minor,operator_residual_amount_minor,currency,
              stripe_connected_account_id,stripe_environment,seller_snapshot_sha256,
              request_sha256,command_state
         FROM crays_core.clubs_hotel_stripe_checkout_commands
        WHERE tenant_id=$1 AND idempotency_key=$2 FOR UPDATE`,
      [input.tenantId, input.idempotencyKey],
    )).rows[0];
    if (replay) {
      if (replay.checkout_command_id !== input.checkoutCommandId || replay.hold_id !== input.holdId || replay.request_sha256 !== requestSha256) {
        throw new Error("HOTEL_STRIPE_CHECKOUT_IDEMPOTENCY_CONFLICT");
      }
      await client.query("COMMIT");
      return mapExisting(replay, true);
    }

    await client.query(
      `INSERT INTO crays_core.clubs_hotel_stripe_checkout_commands (
         checkout_command_id,tenant_id,hold_id,merchant_binding_id,merchant_binding_version,
         revenue_allocation_receipt_id,revenue_allocation_receipt_sha256,stripe_customer_id,
         stripe_customer_created_evidence_sha256,amount_total_minor,currency,
         application_fee_amount_minor,operator_residual_amount_minor,stripe_connected_account_id,
         stripe_environment,merchant_of_record_legal_entity_id,seller_snapshot_sha256,
         idempotency_key,request_payload,request_sha256,command_state,provider_mutation_performed,created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,'PERSISTED_PENDING_PROVIDER',false,$21)`,
      [input.checkoutCommandId,input.tenantId,input.holdId,authority.merchant_binding_id,Number(authority.binding_version),
        authority.revenue_allocation_receipt_id,authority.allocation_receipt_sha256,input.stripeCustomerId,
        input.stripeCustomerCreatedEvidenceSha256,total,authority.currency,applicationFee,operating,
        authority.stripe_connected_account_id,authority.stripe_environment,authority.merchant_of_record_legal_entity_id,
        sellerSnapshotSha256,input.idempotencyKey,JSON.stringify(requestPayload),requestSha256,input.createdAt],
    );
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_stripe_checkout_outbox (
         outbox_event_id,tenant_id,checkout_command_id,stripe_connected_account_id,
         request_payload,request_sha256,idempotency_key,delivery_state,attempt_count,
         next_attempt_at,created_at,updated_at
       ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,'PENDING',0,$8,$8,$8)`,
      [input.outboxEventId,input.tenantId,input.checkoutCommandId,authority.stripe_connected_account_id,
        JSON.stringify(requestPayload),requestSha256,input.idempotencyKey,input.createdAt],
    );
    await client.query("COMMIT");
    return Object.freeze({
      checkoutCommandId: input.checkoutCommandId,
      holdId: input.holdId,
      state: "PERSISTED_PENDING_PROVIDER",
      amountTotalMinor: total,
      applicationFeeAmountMinor: applicationFee,
      operatorResidualAmountMinor: operating,
      currency: authority.currency,
      stripeConnectedAccountId: authority.stripe_connected_account_id,
      stripeEnvironment: authority.stripe_environment,
      sellerSnapshotSha256,
      requestSha256,
      performsProviderMutation: false,
      replayed: false,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
