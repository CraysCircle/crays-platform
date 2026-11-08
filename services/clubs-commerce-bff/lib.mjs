import {
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const CONTRACT_VERSION = "cclub068.clubs-booking-consequence-bff.v1";
export const CONTRACT_ID = "cclub065-crays-clubs-commerce-bff-v1";
export const BOOKING_CONTRACT_ID = "cclub066-clubs-booking-commerce-bff-v1";
export const ORDER_COMMAND_CONTRACT_ID =
  "cclub067-clubs-order-command-bff-v1";
export const CONSEQUENCE_CONTRACT_ID =
  "cclub068-clubs-booking-consequence-bff-v1";
export const EXPECTED_MANIFEST_SHA256 =
  "2ebc0109d3b611ef0047f66ded6f39108d975f26636ab152662e0758357f2a21";
export const EXPECTED_MODEL_COUNT = 6;
export const EXPECTED_ACTIVATION_GATE = "CCLUB-066";
export const ALLOWED_OPERATION = "prepared_models.read";
export const BASE_BOOKING_OPERATIONS = Object.freeze([
  "prepared_models.read",
  "test_hold.issue",
  "hold_bound_cart.create",
]);
export const BOOKING_OPERATIONS = Object.freeze([
  ...BASE_BOOKING_OPERATIONS,
  "test_checkout.settle",
  "order.cancel",
  "test_refund.create",
]);
export const ORDER_COMMAND_OPERATIONS = Object.freeze([
  "test_checkout.settle",
  "order.cancel",
  "test_refund.create",
]);
export const ALLOWED_PRODUCT_TYPES = Object.freeze([
  "booking",
  "membership",
  "ticket",
]);

export const BASE_FORBIDDEN_BROWSER_KEYS = Object.freeze([
  "adminSecret",
  "adminToken",
  "authorization",
  "channelToken",
  "commerceContext",
  "commerceContextSignature",
  "operatorLegalEntityId",
  "partnerTenantId",
  "providerScopeBindingId",
  "sellerChannelMappingId",
  "storeId",
  "vendureChannelId",
  "vendureChannelToken",
  "vendureSellerId",
  "vendure-token",
  "x-crays-commerce-context",
  "x-crays-commerce-context-signature",
]);
export const FORBIDDEN_BROWSER_KEYS = Object.freeze([
  ...BASE_FORBIDDEN_BROWSER_KEYS,
  "returnUrl",
  "paymentAmount",
  "refundAmount",
  "paymentState",
  "refundState",
  "providerPaymentId",
  "providerRefundId",
  "providerStatus",
]);

const ALLOWED_BODY_KEYS = new Set([
  "operation",
  "websiteProductType",
  "inventoryKey",
  "holdReference",
  "idempotencyKey",
  "cartReference",
]);
const ACCOUNT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const ASSERTION_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,199}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const INVENTORY_KEY = /^clubs\.fc\.(?:golf|marina)\.qlo-room-type-[0-9]{2}$/;
const HOLD_REFERENCE = /^th_[0-9a-f]{32}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,199}$/;
const CART_REFERENCE = /^cart_[0-9a-f]{40}$/;
const EXPECTED_QUOTE_FIELDS = Object.freeze([
  "quoteUrn",
  "quoteVersion",
  "quoteSha256",
  "quoteLineId",
  "currencyCode",
  "unitAmountMinor",
]);

export class ClubsCommerceBffError extends Error {
  constructor(code, status = 503) {
    super(code);
    this.name = "ClubsCommerceBffError";
    this.code = code;
    this.status = status;
  }
}

export function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function canonicalJson(value) {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new ClubsCommerceBffError("BFF_NON_CANONICAL_VALUE", 400);
}

function constantTimeTextEqual(left, right) {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes);
}

function exactObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ClubsCommerceBffError(code, 400);
  }
  return value;
}

export function parseBrowserRequest(value) {
  const raw = exactObject(value, "BFF_REQUEST_INVALID");
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_BROWSER_KEYS.includes(key)) {
      throw new ClubsCommerceBffError("BFF_BROWSER_AUTHORITY_DENIED", 400);
    }
    if (!ALLOWED_BODY_KEYS.has(key)) {
      throw new ClubsCommerceBffError("BFF_BROWSER_FIELD_DENIED", 400);
    }
  }
  if (!BOOKING_OPERATIONS.includes(raw.operation)) {
    throw new ClubsCommerceBffError("BFF_OPERATION_DENIED", 400);
  }
  if (raw.operation === "prepared_models.read") {
    if (
      raw.websiteProductType !== undefined &&
      !ALLOWED_PRODUCT_TYPES.includes(raw.websiteProductType)
    ) {
      throw new ClubsCommerceBffError("BFF_PRODUCT_TYPE_INVALID", 400);
    }
    if (raw.inventoryKey !== undefined || raw.holdReference !== undefined ||
        raw.idempotencyKey !== undefined || raw.cartReference !== undefined) {
      throw new ClubsCommerceBffError("BFF_BROWSER_FIELD_DENIED", 400);
    }
    return Object.freeze({
      operation: ALLOWED_OPERATION,
      ...(raw.websiteProductType === undefined
        ? {}
        : { websiteProductType: raw.websiteProductType }),
    });
  }
  if (raw.websiteProductType !== undefined ||
      typeof raw.idempotencyKey !== "string" ||
      !IDEMPOTENCY_KEY.test(raw.idempotencyKey)) {
    throw new ClubsCommerceBffError("BFF_BROWSER_FIELD_DENIED", 400);
  }
  if (raw.operation === "test_hold.issue") {
    if (typeof raw.inventoryKey !== "string" ||
        !INVENTORY_KEY.test(raw.inventoryKey) ||
        raw.holdReference !== undefined || raw.cartReference !== undefined) {
      throw new ClubsCommerceBffError("BFF_BROWSER_FIELD_DENIED", 400);
    }
    return Object.freeze({
      operation: raw.operation,
      inventoryKey: raw.inventoryKey,
      idempotencyKey: raw.idempotencyKey,
    });
  }
  if (ORDER_COMMAND_OPERATIONS.includes(raw.operation)) {
    if (typeof raw.cartReference !== "string" ||
        !CART_REFERENCE.test(raw.cartReference) ||
        raw.inventoryKey !== undefined || raw.holdReference !== undefined) {
      throw new ClubsCommerceBffError("BFF_BROWSER_FIELD_DENIED", 400);
    }
    return Object.freeze({
      operation: raw.operation,
      cartReference: raw.cartReference,
      idempotencyKey: raw.idempotencyKey,
    });
  }
  if (typeof raw.holdReference !== "string" ||
      !HOLD_REFERENCE.test(raw.holdReference) ||
      raw.inventoryKey !== undefined || raw.cartReference !== undefined) {
    throw new ClubsCommerceBffError("BFF_BROWSER_FIELD_DENIED", 400);
  }
  return Object.freeze({
    operation: raw.operation,
    holdReference: raw.holdReference,
    idempotencyKey: raw.idempotencyKey,
  });
}

export function issueTrustedB2cAssertion(input, secret) {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new ClubsCommerceBffError("BFF_ASSERTION_SECRET_INVALID");
  }
  const claims = Object.freeze({
    v: 1,
    iss: "crays-storefront-server",
    aud: "crays-clubs-commerce-bff",
    sub: input.accountId,
    identityProvider: "auth0-crays",
    identityConnection: "google-oauth2",
    purpose: "b2c-customer",
    iat: input.issuedAtEpochSeconds,
    exp: input.expiresAtEpochSeconds,
    jti: input.assertionId,
  });
  const encoded = Buffer.from(canonicalJson(claims), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", secret)
    .update(encoded, "utf8")
    .digest("base64url");
  return Object.freeze({ encoded, signature });
}

async function prepareVendureOrderSellerSnapshot(
  endpoint,
  channelToken,
  commerceContextSecret,
  sessionToken,
  authority,
  prepared,
  order,
) {
  const signed = signCommerceContext(
    prepared,
    authority,
    channelToken,
    commerceContextSecret,
    "checkout-preflight",
    "cclub068-booking-core-consequence-v1",
    "CCLUB068_SELLER_SNAPSHOT_REQUIRED",
    prepared.cart_id,
  );
  const snapshotPayload = Object.freeze({
    version: 1,
    deploymentCellId: signed.envelope.deploymentCellId,
    verticalRoot: signed.envelope.verticalRoot,
    operatorTenantId: signed.envelope.operatorTenantId,
    operatorLegalEntityId: signed.envelope.operatorLegalEntityId,
    storeId: signed.envelope.storeId,
    storeOperatorAssignmentId: signed.envelope.storeOperatorAssignmentId,
    assignmentVersion: signed.envelope.assignmentVersion,
    bindingId: signed.envelope.bindingId,
    bindingVersion: signed.envelope.bindingVersion,
    vendureSellerId: signed.envelope.vendureSellerId,
    vendureChannelId: signed.envelope.vendureChannelId,
    primaryVendureStockLocationId:
      signed.envelope.primaryVendureStockLocationId,
    sellerSnapshot: signed.envelope.sellerSnapshot,
  });
  const commandPayload = Object.freeze({
    version: 1,
    orderCode: order.code,
    providerOrderId: String(order.id),
    contextId: signed.envelope.contextId,
    deploymentCellId: signed.envelope.deploymentCellId,
    verticalRoot: signed.envelope.verticalRoot,
    operatorTenantId: signed.envelope.operatorTenantId,
    operatorLegalEntityId: signed.envelope.operatorLegalEntityId,
    storeId: signed.envelope.storeId,
    storeOperatorAssignmentId: signed.envelope.storeOperatorAssignmentId,
    assignmentVersion: signed.envelope.assignmentVersion,
    bindingId: signed.envelope.bindingId,
    bindingVersion: signed.envelope.bindingVersion,
    vendureSellerId: signed.envelope.vendureSellerId,
    vendureChannelId: signed.envelope.vendureChannelId,
    snapshotSha256: sha256(canonicalJson(snapshotPayload)),
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json",
      "vendure-token": channelToken,
      "x-crays-commerce-context": signed.encoded,
      "x-crays-commerce-context-signature": signed.signature,
    },
    body: JSON.stringify({
      operationName: "PrepareOrderSellerSnapshot",
      query: `mutation PrepareOrderSellerSnapshot($input:CraysPrepareOrderSellerSnapshotInput!){
        craysPrepareOrderSellerSnapshot(input:$input){commandId snapshotId state}
      }`,
      variables: {
        input: {
          orderCode: order.code,
          providerOrderId: String(order.id),
          idempotencyKey: `cclub068-snapshot:${prepared.cart_id}`,
          payloadSha256: sha256(canonicalJson(commandPayload)),
        },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  const receipt = body?.data?.craysPrepareOrderSellerSnapshot;
  if (
    !response.ok ||
    body.errors ||
    !/^\d+$/.test(String(receipt?.commandId ?? "")) ||
    !/^oss_[0-9a-f-]{36}$/.test(String(receipt?.snapshotId ?? "")) ||
    receipt?.state !== "PREPARED"
  ) {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  return Object.freeze({
    commandId: String(receipt.commandId),
    snapshotId: receipt.snapshotId,
  });
}

export function verifyTrustedB2cAssertion(input, secret, nowEpochSeconds) {
  if (
    Buffer.byteLength(secret, "utf8") < 32 ||
    typeof input.encoded !== "string" ||
    typeof input.signature !== "string" ||
    input.encoded.length < 20 ||
    input.encoded.length > 4_000 ||
    input.signature.length < 20 ||
    input.signature.length > 300 ||
    !BASE64URL.test(input.encoded) ||
    !BASE64URL.test(input.signature)
  ) {
    throw new ClubsCommerceBffError("BFF_AUTHENTICATION_REQUIRED", 401);
  }
  const expected = createHmac("sha256", secret)
    .update(input.encoded, "utf8")
    .digest("base64url");
  if (!constantTimeTextEqual(input.signature, expected)) {
    throw new ClubsCommerceBffError("BFF_AUTHENTICATION_REQUIRED", 401);
  }
  let claims;
  try {
    const decoded = Buffer.from(input.encoded, "base64url");
    if (decoded.toString("base64url") !== input.encoded) throw new Error();
    claims = exactObject(
      JSON.parse(decoded.toString("utf8")),
      "BFF_AUTHENTICATION_REQUIRED",
    );
  } catch {
    throw new ClubsCommerceBffError("BFF_AUTHENTICATION_REQUIRED", 401);
  }
  if (
    claims.v !== 1 ||
    claims.iss !== "crays-storefront-server" ||
    claims.aud !== "crays-clubs-commerce-bff" ||
    claims.identityProvider !== "auth0-crays" ||
    claims.identityConnection !== "google-oauth2" ||
    claims.purpose !== "b2c-customer" ||
    typeof claims.sub !== "string" ||
    !ACCOUNT_ID.test(claims.sub) ||
    typeof claims.jti !== "string" ||
    !ASSERTION_ID.test(claims.jti) ||
    !Number.isSafeInteger(claims.iat) ||
    !Number.isSafeInteger(claims.exp) ||
    claims.iat > nowEpochSeconds + 5 ||
    claims.iat < nowEpochSeconds - 65 ||
    claims.exp < nowEpochSeconds ||
    claims.exp > claims.iat + 60
  ) {
    throw new ClubsCommerceBffError("BFF_AUTHENTICATION_REQUIRED", 401);
  }
  return Object.freeze({
    accountId: claims.sub,
    identityProvider: "auth0-crays",
    identityConnection: "google-oauth2",
    purpose: "b2c-customer",
    assertionId: claims.jti,
  });
}

function jsonArray(value, code) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) throw new ClubsCommerceBffError(code);
  return parsed;
}

function exactSortedStrings(value, expected, code) {
  const parsed = jsonArray(value, code);
  if (
    parsed.some((item) => typeof item !== "string") ||
    JSON.stringify([...parsed].sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new ClubsCommerceBffError(code);
  }
  return Object.freeze([...parsed]);
}

function exactPositive(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new ClubsCommerceBffError(code);
  }
  return number;
}

function assertContract(row, channelToken) {
  if (
    !row ||
    row.contract_id !== CONTRACT_ID ||
    exactPositive(row.contract_version, "BFF_CONTRACT_CORRUPT") !== 1 ||
    row.vertical_root !== "clubs" ||
    row.identity_provider !== "auth0-crays" ||
    row.identity_connection !== "google-oauth2" ||
    row.identity_purpose !== "b2c-customer" ||
    row.provider_api_surface !== "shop-api" ||
    row.admin_api_allowed !== false ||
    row.browser_receives_channel_token !== false ||
    row.browser_receives_admin_token !== false ||
    row.browser_receives_signed_context !== false ||
    row.product_manifest_sha256 !== EXPECTED_MANIFEST_SHA256 ||
    exactPositive(row.required_model_count, "BFF_CONTRACT_CORRUPT") !==
      EXPECTED_MODEL_COUNT ||
    row.sellable_activation_gate !== EXPECTED_ACTIVATION_GATE ||
    row.live_money_allowed !== false ||
    row.build_host_role !== "XXL" ||
    row.runtime_host_role !== "XL" ||
    row.lifecycle_state !== "active" ||
    typeof row.vendure_channel_token_sha256 !== "string" ||
    !SHA256.test(row.vendure_channel_token_sha256) ||
    !constantTimeTextEqual(
      sha256(channelToken),
      row.vendure_channel_token_sha256,
    )
  ) {
    throw new ClubsCommerceBffError("BFF_CONTRACT_CORRUPT");
  }
  exactSortedStrings(
    row.allowed_browser_operations,
    [ALLOWED_OPERATION],
    "BFF_CONTRACT_CORRUPT",
  );
  exactSortedStrings(
    row.forbidden_browser_authority_keys,
    BASE_FORBIDDEN_BROWSER_KEYS,
    "BFF_CONTRACT_CORRUPT",
  );
}

function publicModel(row) {
  const references = jsonArray(
    row.required_booking_core_reference_types,
    "BFF_MODEL_BINDING_CORRUPT",
  );
  const quoteFields = jsonArray(
    row.required_quote_fields,
    "BFF_MODEL_BINDING_CORRUPT",
  );
  if (
    !ALLOWED_PRODUCT_TYPES.includes(row.website_product_type) ||
    !["booking", "deposit", "fee", "add_on", "access"].includes(
      row.commerce_role,
    ) ||
    references.length < 3 ||
    !references.includes("Quote") ||
    references.some(
      (item) => typeof item !== "string" || !/^[A-Z][A-Za-z0-9]{2,63}$/.test(item),
    ) ||
    JSON.stringify(quoteFields) !== JSON.stringify(EXPECTED_QUOTE_FIELDS) ||
    row.quote_correlation_policy_version !==
      "booking-core-immutable-quote-v1" ||
    row.price_authority !== "BOOKING_CORE_IMMUTABLE_QUOTE" ||
    row.sellable_activation_gate !== EXPECTED_ACTIVATION_GATE ||
    row.vendure_product_enabled !== false ||
    Number(row.vendure_variant_count) !== 0 ||
    row.ordinary_checkout_allowed !== false ||
    row.lifecycle_state !== "prepared" ||
    row.manifest_sha256 !== EXPECTED_MANIFEST_SHA256
  ) {
    throw new ClubsCommerceBffError("BFF_MODEL_BINDING_CORRUPT");
  }
  return Object.freeze({
    websiteProductType: row.website_product_type,
    commerceRole: row.commerce_role,
    requiredBookingCoreReferenceTypes: Object.freeze([...references]),
    quoteCorrelationPolicyVersion: row.quote_correlation_policy_version,
    requiredQuoteFields: EXPECTED_QUOTE_FIELDS,
    priceAuthority: "BOOKING_CORE_IMMUTABLE_QUOTE",
    activationState: "prepared",
    activationGate: EXPECTED_ACTIVATION_GATE,
    ordinaryCheckoutAllowed: false,
  });
}

async function beginReadOnly(client) {
  await client.query("begin isolation level repeatable read read only");
  await client.query("select set_config('crays.app_role','core_service',true)");
  await client.query("set local statement_timeout = '5000ms'");
}

async function rollbackQuietly(client) {
  try {
    await client.query("rollback");
  } catch {
    // The original error is authoritative.
  }
}

async function loadContract(client) {
  const result = await client.query(
    `select contract_id,contract_version,vertical_root,
            identity_provider,identity_connection,identity_purpose,
            provider_api_surface,admin_api_allowed,
            browser_receives_channel_token,browser_receives_admin_token,
            browser_receives_signed_context,allowed_browser_operations,
            forbidden_browser_authority_keys,product_manifest_sha256,
            required_model_count,sellable_activation_gate,
            vendure_channel_token_sha256,live_money_allowed,
            build_host_role,runtime_host_role,lifecycle_state
       from crays_core.clubs_commerce_bff_contracts
      where contract_id=$1 and lifecycle_state='active'
      limit 2`,
    [CONTRACT_ID],
  );
  if (result.rows.length !== 1) {
    throw new ClubsCommerceBffError("BFF_CONTRACT_UNRESOLVED");
  }
  return result.rows[0];
}

async function loadBookingContract(client) {
  const result = await client.query(
    `select contract_id,contract_version,parent_contract_id,
            seller_channel_mapping_id,allowed_browser_operations,
            server_signs_commerce_context,browser_receives_signed_context,
            browser_receives_vendure_session,
            encrypted_server_session_required,inventory_evidence_class,
            simulated_snapshot_count,live_money_allowed,
            real_channel_manager_cutover_gate,runtime_image_reference,
            runtime_image_id_sha256,adapter_source_bundle_sha256,
            lifecycle_state
       from crays_core.clubs_booking_bff_contracts
      where contract_id=$1 and lifecycle_state='active'
      limit 2`,
    [BOOKING_CONTRACT_ID],
  );
  if (result.rows.length !== 1) {
    throw new ClubsCommerceBffError("BFF_BOOKING_CONTRACT_UNRESOLVED");
  }
  return result.rows[0];
}

async function loadOrderCommandContract(client) {
  const result = await client.query(
    `select contract_id,contract_version,parent_contract_id,
            seller_channel_mapping_id,allowed_browser_operations,
            server_signs_commerce_context,browser_receives_signed_context,
            browser_receives_vendure_session,
            encrypted_server_session_required,inventory_evidence_class,
            simulated_snapshot_count,live_money_allowed,
            real_channel_manager_cutover_gate,runtime_image_reference,
            runtime_image_id_sha256,adapter_source_bundle_sha256,
            lifecycle_state
       from crays_core.clubs_booking_bff_contracts
      where contract_id=$1 and lifecycle_state='active'
      limit 2`,
    [ORDER_COMMAND_CONTRACT_ID],
  );
  if (result.rows.length !== 1) {
    throw new ClubsCommerceBffError("BFF_ORDER_COMMAND_CONTRACT_UNRESOLVED");
  }
  return result.rows[0];
}

async function loadConsequenceContract(client) {
  const result = await client.query(
    `select contract_id,contract_version,parent_contract_id,
            predecessor_booking_contract_id,
            seller_channel_mapping_id,allowed_browser_operations,
            server_signs_commerce_context,browser_receives_signed_context,
            browser_receives_vendure_session,
            encrypted_server_session_required,inventory_evidence_class,
            simulated_snapshot_count,live_money_allowed,
            real_channel_manager_cutover_gate,runtime_image_reference,
            runtime_image_id_sha256,adapter_source_bundle_sha256,
            lifecycle_state
       from crays_core.clubs_booking_bff_contracts
      where contract_id=$1 and lifecycle_state='active'
      limit 2`,
    [CONSEQUENCE_CONTRACT_ID],
  );
  if (result.rows.length !== 1) {
    throw new ClubsCommerceBffError("BFF_CONSEQUENCE_CONTRACT_UNRESOLVED");
  }
  return result.rows[0];
}

function assertBookingContract(row) {
  if (
    row.contract_id !== BOOKING_CONTRACT_ID ||
    Number(row.contract_version) !== 1 ||
    row.parent_contract_id !== CONTRACT_ID ||
    row.seller_channel_mapping_id !== "cscm-crays-club-forest-city-v1" ||
    row.server_signs_commerce_context !== true ||
    row.browser_receives_signed_context !== false ||
    row.browser_receives_vendure_session !== false ||
    row.encrypted_server_session_required !== true ||
    row.inventory_evidence_class !== "test_only" ||
    Number(row.simulated_snapshot_count) !== 14 ||
    row.live_money_allowed !== false ||
    row.real_channel_manager_cutover_gate !== "CCLUB-120" ||
    row.lifecycle_state !== "active" ||
    !/^crays\/clubs-commerce-bff:1\.1\.0-cclub066-rc[0-9]+$/.test(
      row.runtime_image_reference,
    ) ||
    !/^sha256:[0-9a-f]{64}$/.test(row.runtime_image_id_sha256) ||
    !SHA256.test(row.adapter_source_bundle_sha256)
  ) {
    throw new ClubsCommerceBffError("BFF_BOOKING_CONTRACT_CORRUPT");
  }
  exactSortedStrings(
    row.allowed_browser_operations,
    BASE_BOOKING_OPERATIONS,
    "BFF_BOOKING_CONTRACT_CORRUPT",
  );
}

function assertOrderCommandContract(row) {
  if (
    row.contract_id !== ORDER_COMMAND_CONTRACT_ID ||
    Number(row.contract_version) !== 2 ||
    row.parent_contract_id !== CONTRACT_ID ||
    row.seller_channel_mapping_id !== "cscm-crays-club-forest-city-v1" ||
    row.server_signs_commerce_context !== true ||
    row.browser_receives_signed_context !== false ||
    row.browser_receives_vendure_session !== false ||
    row.encrypted_server_session_required !== true ||
    row.inventory_evidence_class !== "test_only" ||
    Number(row.simulated_snapshot_count) !== 14 ||
    row.live_money_allowed !== false ||
    row.real_channel_manager_cutover_gate !== "CCLUB-120" ||
    row.lifecycle_state !== "active" ||
    row.runtime_image_reference !==
      "crays/clubs-commerce-bff:1.2.0-cclub067" ||
    !/^sha256:[0-9a-f]{64}$/.test(row.runtime_image_id_sha256) ||
    !SHA256.test(row.adapter_source_bundle_sha256)
  ) {
    throw new ClubsCommerceBffError("BFF_ORDER_COMMAND_CONTRACT_CORRUPT");
  }
  exactSortedStrings(
    row.allowed_browser_operations,
    BOOKING_OPERATIONS,
    "BFF_ORDER_COMMAND_CONTRACT_CORRUPT",
  );
}

function assertConsequenceContract(row) {
  if (
    row.contract_id !== CONSEQUENCE_CONTRACT_ID ||
    Number(row.contract_version) !== 3 ||
    row.parent_contract_id !== CONTRACT_ID ||
    row.predecessor_booking_contract_id !== ORDER_COMMAND_CONTRACT_ID ||
    row.seller_channel_mapping_id !== "cscm-crays-club-forest-city-v1" ||
    row.server_signs_commerce_context !== true ||
    row.browser_receives_signed_context !== false ||
    row.browser_receives_vendure_session !== false ||
    row.encrypted_server_session_required !== true ||
    row.inventory_evidence_class !== "test_only" ||
    Number(row.simulated_snapshot_count) !== 14 ||
    row.live_money_allowed !== false ||
    row.real_channel_manager_cutover_gate !== "CCLUB-120" ||
    row.lifecycle_state !== "active" ||
    row.runtime_image_reference !==
      "crays/clubs-commerce-bff:1.3.0-cclub068" ||
    !/^sha256:[0-9a-f]{64}$/.test(row.runtime_image_id_sha256) ||
    !SHA256.test(row.adapter_source_bundle_sha256)
  ) {
    throw new ClubsCommerceBffError("BFF_CONSEQUENCE_CONTRACT_CORRUPT");
  }
  exactSortedStrings(
    row.allowed_browser_operations,
    BOOKING_OPERATIONS,
    "BFF_CONSEQUENCE_CONTRACT_CORRUPT",
  );
}

export async function readAdapterHealth(pool, channelToken) {
  const client = await pool.connect();
  try {
    await beginReadOnly(client);
    const contract = await loadContract(client);
    assertContract(contract, channelToken);
    const bookingContract = await loadBookingContract(client);
    assertBookingContract(bookingContract);
    const orderCommandContract = await loadOrderCommandContract(client);
    assertOrderCommandContract(orderCommandContract);
    const consequenceContract = await loadConsequenceContract(client);
    assertConsequenceContract(consequenceContract);
    const count = await client.query(
      `select count(*)::integer model_count
         from crays_core.clubs_vendure_product_model_bindings
        where lifecycle_state='prepared'
          and manifest_sha256=$1
          and sellable_activation_gate=$2
          and vendure_product_enabled=false
          and vendure_variant_count=0
          and ordinary_checkout_allowed=false`,
      [EXPECTED_MANIFEST_SHA256, EXPECTED_ACTIVATION_GATE],
    );
    if (Number(count.rows[0]?.model_count) !== EXPECTED_MODEL_COUNT) {
      throw new ClubsCommerceBffError("BFF_MODEL_BINDING_COUNT_MISMATCH");
    }
    const booking = await client.query(
      `select
         (select count(*)::integer
            from crays_core.clubs_booking_inventory_snapshots
           where evidence_class='test_only' and not provider_confirmed)
           simulated_snapshot_count,
         (select count(*)::integer
            from crays_core.clubs_booking_sellable_bindings
           where lifecycle_state='active' and price_exposure='test_only'
             and not live_money_allowed) booking_sellable_count`,
    );
    if (Number(booking.rows[0]?.simulated_snapshot_count) !== 14 ||
        Number(booking.rows[0]?.booking_sellable_count) !== 1) {
      throw new ClubsCommerceBffError("BFF_BOOKING_ACTIVATION_MISMATCH");
    }
    await client.query("commit");
    return Object.freeze({
      contractVersion: CONTRACT_VERSION,
      state: "ready",
      block: "CCLUB-068",
      runtimeHostRole: "XL",
      providerBoundary: "server-only",
      activationState: "test_only_booking_core_consequence_inbox",
      realChannelManagerCutoverGate: "CCLUB-120",
      liveMoneyAllowed: false,
    });
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function readPreparedModels(
  pool,
  channelToken,
  authority,
  request,
) {
  const client = await pool.connect();
  try {
    await beginReadOnly(client);
    const contract = await loadContract(client);
    assertContract(contract, channelToken);
    const bookingContract = await loadBookingContract(client);
    assertBookingContract(bookingContract);
    const consequenceContract = await loadConsequenceContract(client);
    assertConsequenceContract(consequenceContract);
    const relationship = await client.query(
      `select r.commerce_customer_relationship_id
         from crays_core.crays_accounts a
         join crays_core.canonical_people p on p.account_id=a.account_id
         join crays_core.commerce_customer_relationships r
           on r.canonical_person_id=p.canonical_person_id
        where a.account_id=$1 and a.status='active'
          and p.lifecycle_state='active'
          and r.vertical_root='clubs'
          and r.lifecycle_state='active'
          and r.purposes @> '["account"]'::jsonb
          and r.effective_from<=transaction_timestamp()
          and (r.effective_until is null or
               r.effective_until>transaction_timestamp())
        limit 2`,
      [authority.accountId],
    );
    if (relationship.rows.length !== 1) {
      throw new ClubsCommerceBffError("BFF_CUSTOMER_ACCESS_DENIED", 403);
    }
    const parameters = [EXPECTED_MANIFEST_SHA256];
    let productTypeFilter = "";
    if (request.websiteProductType !== undefined) {
      parameters.push(request.websiteProductType);
      productTypeFilter = "and website_product_type=$2";
    }
    const models = await client.query(
      `select website_product_type,commerce_role,
              required_booking_core_reference_types,
              quote_correlation_policy_version,required_quote_fields,
              price_authority,sellable_activation_gate,
              vendure_product_enabled,vendure_variant_count,
              ordinary_checkout_allowed,manifest_sha256,lifecycle_state
         from crays_core.clubs_vendure_product_model_bindings
        where manifest_sha256=$1 and lifecycle_state='prepared'
          ${productTypeFilter}
        order by website_product_type,commerce_role`,
      parameters,
    );
    const expectedCount = request.websiteProductType === undefined
      ? EXPECTED_MODEL_COUNT
      : request.websiteProductType === "booking" ? 4 : 1;
    if (models.rows.length !== expectedCount) {
      throw new ClubsCommerceBffError("BFF_MODEL_BINDING_COUNT_MISMATCH");
    }
    const publicModels = Object.freeze(models.rows.map(publicModel));
    await client.query("commit");
    const response = Object.freeze({
      contractVersion: CONTRACT_VERSION,
      state: "prepared",
      identityScope: Object.freeze({
        provider: "auth0-crays",
        connection: "google-oauth2",
        purpose: "b2c-customer",
      }),
      commerce: Object.freeze({
        defaultCurrencyCode: "CHF",
        availableCurrencyCodes: Object.freeze(["CHF", "EUR", "USD"]),
        productTypes: ALLOWED_PRODUCT_TYPES,
        models: publicModels,
        activationGate: EXPECTED_ACTIVATION_GATE,
        bookingTestSellableNow: true,
        inventoryEvidenceClass: "test_only",
        providerConfirmed: false,
        realChannelManagerCutoverGate: "CCLUB-120",
        liveMoneyAllowed: false,
      }),
    });
    assertSafePublicResponse(response);
    return response;
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

async function beginWrite(client) {
  await client.query("begin isolation level serializable");
  await client.query("select set_config('crays.app_role','core_service',true)");
  await client.query("set local statement_timeout = '8000ms'");
  const contract = await loadBookingContract(client);
  assertBookingContract(contract);
  const orderCommandContract = await loadOrderCommandContract(client);
  assertOrderCommandContract(orderCommandContract);
  const consequenceContract = await loadConsequenceContract(client);
  assertConsequenceContract(consequenceContract);
}

function databaseBoundaryError(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (message.includes("CCLUB066_STALE_PRICE_OR_SNAPSHOT")) {
    return new ClubsCommerceBffError("BFF_BOOKING_PRICE_STALE", 409);
  }
  if (message.includes("CCLUB066_CAPACITY_CHANGED") ||
      message.includes("CCLUB066_TEST_INVENTORY_NOT_ADMISSIBLE")) {
    return new ClubsCommerceBffError("BFF_BOOKING_CAPACITY_CHANGED", 409);
  }
  if (message.includes("CCLUB066_CROSS_CHANNEL_OR_SELLABLE_DENIED")) {
    return new ClubsCommerceBffError("BFF_BOOKING_SCOPE_DENIED", 403);
  }
  if (message.includes("CCLUB066_HOLD_INVALID_OR_EXPIRED")) {
    return new ClubsCommerceBffError("BFF_BOOKING_HOLD_INVALID", 409);
  }
  if (message.includes("CCLUB066_PROVIDER_RECONCILIATION_REQUIRED") ||
      message.includes("CCLUB066_UNKNOWN_MARK_CLAIM_MISMATCH")) {
    return new ClubsCommerceBffError("BFF_BOOKING_RECONCILIATION_REQUIRED", 503);
  }
  if (message.includes("CCLUB067_ORDER_COMMAND_SEQUENCE_INVALID")) {
    return new ClubsCommerceBffError("BFF_ORDER_COMMAND_SEQUENCE_INVALID", 409);
  }
  if (message.includes("CCLUB067_ORDER_COMMAND_ALREADY_APPLIED")) {
    return new ClubsCommerceBffError("BFF_ORDER_COMMAND_ALREADY_APPLIED", 409);
  }
  if (message.includes("CCLUB067_ORDER_SCOPE_DENIED")) {
    return new ClubsCommerceBffError("BFF_BOOKING_SCOPE_DENIED", 403);
  }
  if (message.includes("CCLUB067_ORDER_COMMAND_RECONCILIATION_REQUIRED") ||
      message.includes("CCLUB067_UNKNOWN_MARK_CLAIM_MISMATCH")) {
    return new ClubsCommerceBffError(
      "BFF_BOOKING_RECONCILIATION_REQUIRED",
      503,
    );
  }
  return error instanceof ClubsCommerceBffError
    ? error
    : new ClubsCommerceBffError("BFF_TEMPORARILY_UNAVAILABLE", 503);
}

export async function issueTestHold(pool, authority, request) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    const result = await client.query(
      `select * from crays_core.cclub066_issue_test_hold($1,$2,$3)`,
      [authority.accountId, request.inventoryKey, request.idempotencyKey],
    );
    if (result.rows.length !== 1 ||
        result.rows[0].evidence_class !== "test_only" ||
        result.rows[0].provider_confirmed !== false) {
      throw new ClubsCommerceBffError("BFF_BOOKING_HOLD_CORRUPT");
    }
    await client.query("commit");
    const row = result.rows[0];
    return Object.freeze({
      contractVersion: CONTRACT_VERSION,
      state: "held",
      holdReference: row.hold_public_ref,
      expiresAt: new Date(row.hold_expires_at).toISOString(),
      inventory: Object.freeze({
        inventoryKey: row.inventory_key,
        propertyCode: row.property_code,
        accommodationCode: row.accommodation_code,
        serviceDate: row.service_date instanceof Date
          ? row.service_date.toISOString().slice(0, 10)
          : String(row.service_date),
      }),
      price: Object.freeze({
        currencyCode: row.currency_code,
        unitAmountMinor: Number(row.unit_amount_minor),
        evidenceClass: "test_only",
        providerConfirmed: false,
      }),
      realChannelManagerCutoverGate: "CCLUB-120",
      liveMoneyAllowed: false,
    });
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

export async function prepareHoldBoundCart(pool, authority, request) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    const result = await client.query(
      `select * from crays_core.cclub066_prepare_hold_bound_cart($1,$2,$3)`,
      [authority.accountId, request.holdReference, request.idempotencyKey],
    );
    if (result.rows.length !== 1) {
      throw new ClubsCommerceBffError("BFF_BOOKING_CART_CORRUPT");
    }
    await client.query("commit");
    return Object.freeze({ ...result.rows[0] });
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

export async function claimHoldBoundCart(
  pool,
  authority,
  cartId,
  claimTokenSha256,
  leaseExpiresAt,
) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    const result = await client.query(
      `select crays_core.cclub066_claim_hold_bound_cart($1,$2,$3,$4)
         provider_state`,
      [authority.accountId, cartId, claimTokenSha256, leaseExpiresAt],
    );
    await client.query("commit");
    return result.rows[0]?.provider_state;
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

export async function completeHoldBoundCart(
  pool,
  authority,
  prepared,
  claimTokenSha256,
  provider,
  encryptedSession,
) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    const result = await client.query(
      `select * from crays_core.cclub066_complete_hold_bound_cart(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )`,
      [
        authority.accountId,
        prepared.cart_id,
        claimTokenSha256,
        provider.orderId,
        provider.orderCode,
        encryptedSession.tokenSha256,
        encryptedSession.ciphertext,
        encryptedSession.iv,
        encryptedSession.authTag,
        provider.payloadSha256,
      ],
    );
    if (result.rows.length !== 1 ||
        result.rows[0].provider_state !== "APPLIED" ||
        result.rows[0].evidence_class !== "test_only" ||
        result.rows[0].live_money_allowed !== false) {
      throw new ClubsCommerceBffError("BFF_BOOKING_CART_CORRUPT");
    }
    await client.query("commit");
    return result.rows[0];
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

export async function markHoldBoundCartUnknown(
  pool,
  authority,
  cartId,
  claimTokenSha256,
) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    await client.query(
      `select crays_core.cclub066_mark_cart_unknown($1,$2,$3)`,
      [authority.accountId, cartId, claimTokenSha256],
    );
    await client.query("commit");
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

function commandKindForOperation(operation) {
  const kinds = new Map([
    ["test_checkout.settle", "TEST_CHECKOUT_SETTLE"],
    ["order.cancel", "CANCEL_ORDER"],
    ["test_refund.create", "TEST_REFUND"],
  ]);
  const commandKind = kinds.get(operation);
  if (!commandKind) {
    throw new ClubsCommerceBffError("BFF_OPERATION_DENIED", 400);
  }
  return commandKind;
}

export async function prepareOrderCommand(pool, authority, request) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    const result = await client.query(
      `select * from crays_core.cclub067_prepare_order_command($1,$2,$3,$4)`,
      [
        authority.accountId,
        request.cartReference,
        commandKindForOperation(request.operation),
        request.idempotencyKey,
      ],
    );
    if (result.rows.length !== 1 ||
        result.rows[0].evidence_class !== "test_only" ||
        result.rows[0].live_money_allowed !== false ||
        !/^[^\s]{3,255}$/.test(
          result.rows[0].vendure_payment_method_code ?? "",
        ) ||
        result.rows[0].vendure_payment_handler_code !==
          "crays-test-payment") {
      throw new ClubsCommerceBffError("BFF_ORDER_COMMAND_CORRUPT");
    }
    await client.query("commit");
    return Object.freeze({ ...result.rows[0] });
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

export async function claimOrderCommand(
  pool,
  authority,
  commandReceiptId,
  claimTokenSha256,
  leaseExpiresAt,
) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    const result = await client.query(
      `select crays_core.cclub067_claim_order_command($1,$2,$3,$4)
         provider_state`,
      [
        authority.accountId,
        commandReceiptId,
        claimTokenSha256,
        leaseExpiresAt,
      ],
    );
    await client.query("commit");
    return result.rows[0]?.provider_state;
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

export async function completeOrderCommand(
  pool,
  authority,
  prepared,
  claimTokenSha256,
  provider,
) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    const result = await client.query(
      `select * from crays_core.cclub067_complete_order_command(
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )`,
      [
        authority.accountId,
        prepared.command_receipt_id,
        claimTokenSha256,
        provider.orderState,
        provider.paymentId ?? null,
        provider.refundId ?? null,
        provider.amountMinor,
        provider.currencyCode,
        provider.payloadSha256,
      ],
    );
    if (result.rows.length !== 1 ||
        result.rows[0].provider_state !== "APPLIED") {
      throw new ClubsCommerceBffError("BFF_ORDER_COMMAND_CORRUPT");
    }
    await client.query("commit");
    return result.rows[0];
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

export async function markOrderCommandUnknown(
  pool,
  authority,
  commandReceiptId,
  claimTokenSha256,
) {
  const client = await pool.connect();
  try {
    await beginWrite(client);
    await client.query(
      `select crays_core.cclub067_mark_order_command_unknown($1,$2,$3)`,
      [authority.accountId, commandReceiptId, claimTokenSha256],
    );
    await client.query("commit");
  } catch (error) {
    await rollbackQuietly(client);
    throw databaseBoundaryError(error);
  } finally {
    client.release();
  }
}

export function encryptVendureSession(token, encryptionKey) {
  if (typeof token !== "string" || token.length < 16 || token.length > 2_000 ||
      !Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32) {
    throw new ClubsCommerceBffError("BFF_PROVIDER_SESSION_INVALID");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return Object.freeze({
    tokenSha256: sha256(token),
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
  });
}

export function decryptVendureSession(prepared, encryptionKey) {
  if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32) {
    throw new ClubsCommerceBffError("BFF_PROVIDER_SESSION_INVALID");
  }
  try {
    const iv = Buffer.from(prepared.vendure_session_iv, "base64url");
    const authTag = Buffer.from(
      prepared.vendure_session_auth_tag,
      "base64url",
    );
    const ciphertext = Buffer.from(
      prepared.vendure_session_ciphertext,
      "base64url",
    );
    if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length < 1) {
      throw new Error();
    }
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(authTag);
    const token = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    if (sha256(token) !== prepared.vendure_session_token_sha256) {
      throw new Error();
    }
    return token;
  } catch {
    throw new ClubsCommerceBffError("BFF_PROVIDER_SESSION_INVALID");
  }
}

function signCommerceContext(
  prepared,
  authority,
  channelToken,
  secret,
  purpose = "cart-mutation",
  policyVersion = "cclub066-hold-bound-cart-v1",
  reasonCode = "CCLUB066_VALID_TEST_ONLY_HOLD",
  commandSeed = prepared.cart_id,
) {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new ClubsCommerceBffError("BFF_COMMERCE_CONTEXT_SECRET_INVALID");
  }
  const issuedAt = Math.floor(Date.now() / 1_000);
  const sellerSnapshot = Object.freeze({
    sellerDisplayName: "CRAYS Club Forest City",
    sellerLegalName: "Crays Business Nomads Club Association",
    sellerRegisteredAddressLine1: "Gartenstrasse 6",
    sellerRegisteredPostalCode: "6300",
    sellerRegisteredCity: "Zug",
    sellerAddressCountryCode: "CH",
    sellerTaxRegistrationRef: "tax-registration-pending",
    sellerBindingVersion: Number(prepared.seller_binding_version),
    paymentBindingId: "cclub067-clubs-test-payment-v1",
    erpBindingId: "erp-binding-pending",
  });
  const fingerprint = sha256(
    `${commandSeed}|${purpose}|${authority.assertionId}|${issuedAt}`,
  );
  const envelope = Object.freeze({
    version: 2,
    contextId: `ctx_${fingerprint.slice(0, 40)}`,
    requestId: `req_${fingerprint.slice(8, 48)}`,
    issuedAtEpochSeconds: issuedAt,
    expiresAtEpochSeconds: issuedAt + 45,
    actorReference: authority.accountId,
    verticalRoot: "clubs",
    deploymentCellId: prepared.deployment_cell_id,
    operatorTenantId: prepared.operator_tenant_id,
    operatorLegalEntityId: prepared.operator_legal_entity_id,
    storeId: prepared.store_id,
    storeOperatorAssignmentId: prepared.store_operator_assignment_id,
    assignmentVersion: Number(prepared.assignment_version),
    bindingId: prepared.binding_id,
    bindingVersion: Number(prepared.binding_version),
    vendureSellerId: prepared.vendure_seller_id,
    vendureChannelId: prepared.vendure_channel_id,
    vendureChannelTokenSha256: sha256(channelToken),
    primaryVendureStockLocationId: prepared.primary_stock_location_id,
    sellerSnapshot,
    sellerSnapshotSha256: sha256(canonicalJson(sellerSnapshot)),
    commerceAdmission: Object.freeze({
      decision: "ADMIT",
      purpose,
      evaluatedAtEpochSeconds: issuedAt,
      validUntilEpochSeconds: issuedAt + 45,
      policyVersion,
      reasonCode,
      availabilitySnapshotSha256: prepared.availability_snapshot_sha256,
      targetSetSha256: prepared.target_set_sha256,
    }),
  });
  const encoded = Buffer.from(canonicalJson(envelope), "utf8")
    .toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(encoded, "utf8")
    .digest("base64url");
  return Object.freeze({ encoded, signature, envelope });
}

export async function addHeldItemToVendure(
  endpoint,
  channelToken,
  commerceContextSecret,
  authority,
  prepared,
) {
  const signed = signCommerceContext(
    prepared,
    authority,
    channelToken,
    commerceContextSecret,
  );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "vendure-token": channelToken,
      "x-crays-commerce-context": signed.encoded,
      "x-crays-commerce-context-signature": signed.signature,
    },
    body: JSON.stringify({
      operationName: "AddHeldBooking",
      query: `mutation AddHeldBooking($variantId:ID!){
        addItemToOrder(productVariantId:$variantId,quantity:1){
          __typename
          ... on Order{
            id code active state currencyCode totalWithTax
            lines{id quantity productVariant{id sku}}
          }
          ... on ErrorResult{errorCode message}
        }
      }`,
      variables: { variantId: prepared.vendure_variant_id },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  const order = body?.data?.addItemToOrder;
  const sessionToken = response.headers.get("vendure-auth-token");
  const exactLines = Array.isArray(order?.lines)
    ? order.lines.filter((line) =>
      String(line?.productVariant?.id) === String(prepared.vendure_variant_id) &&
      Number(line?.quantity) === 1)
    : [];
  if (!response.ok || body.errors || order?.__typename !== "Order" ||
      order.active !== true || order.currencyCode !== prepared.currency_code ||
      Number(order.totalWithTax) !== Number(prepared.unit_amount_minor) ||
      exactLines.length !== 1 || !sessionToken) {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  const snapshot = await prepareVendureOrderSellerSnapshot(
    endpoint,
    channelToken,
    commerceContextSecret,
    sessionToken,
    authority,
    prepared,
    order,
  );
  const publicProvider = {
    orderId: String(order.id),
    orderCode: order.code,
    state: order.state,
    currencyCode: order.currencyCode,
    totalWithTax: Number(order.totalWithTax),
    variantId: String(prepared.vendure_variant_id),
    quantity: 1,
  };
  return Object.freeze({
    ...publicProvider,
    sessionToken,
    orderSellerSnapshotCommandId: snapshot.commandId,
    orderSellerSnapshotId: snapshot.snapshotId,
    payloadSha256: sha256(canonicalJson(publicProvider)),
  });
}

async function vendureGraphql(
  endpoint,
  channelToken,
  signed,
  query,
  variables,
  bearer,
) {
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "vendure-token": channelToken,
    ...(signed ? {
      "x-crays-commerce-context": signed.encoded,
      "x-crays-commerce-context-signature": signed.signature,
    } : {}),
    ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  if (!response.ok || body.errors) {
    if (process.env.CCLUB067_DIAGNOSTIC_MODE === "true") {
      process.stderr.write(`${JSON.stringify({
        event: "cclub067-vendure-graphql-denied",
        status: response.status,
        errors: Array.isArray(body.errors)
          ? body.errors.map((error) => ({
            message: error?.message,
            code: error?.extensions?.code,
          }))
          : [],
      })}\n`);
    }
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  return { body, response };
}

function exactOrderOutcome(
  order,
  prepared,
  expectedState,
  expectedTotalMinor = prepared.unit_amount_minor,
) {
  if (order?.__typename !== "Order" ||
      String(order.id) !== String(prepared.vendure_order_id) ||
      order.code !== prepared.vendure_order_code ||
      order.state !== expectedState ||
      order.currencyCode !== prepared.currency_code ||
      Number(order.totalWithTax) !== Number(expectedTotalMinor)) {
    if (process.env.CCLUB067_DIAGNOSTIC_MODE === "true") {
      process.stderr.write(`${JSON.stringify({
        event: "cclub067-vendure-order-outcome-mismatch",
        received: order ? {
          typename: order.__typename,
          id: String(order.id),
          code: order.code,
          state: order.state,
          currencyCode: order.currencyCode,
          totalWithTax: Number(order.totalWithTax),
          errorCode: order.errorCode,
          message: order.message,
          transitionError: order.transitionError,
        } : null,
        expected: {
          id: String(prepared.vendure_order_id),
          code: prepared.vendure_order_code,
          state: expectedState,
          currencyCode: prepared.currency_code,
          totalWithTax: Number(prepared.unit_amount_minor),
        },
      })}\n`);
    }
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  return order;
}

export async function settleTestCheckoutInVendure(
  endpoint,
  channelToken,
  commerceContextSecret,
  sessionToken,
  authority,
  prepared,
) {
  const checkoutContext = signCommerceContext(
    prepared,
    authority,
    channelToken,
    commerceContextSecret,
    "checkout-preflight",
    "cclub067-test-checkout-transition-v1",
    "CCLUB067_SERVER_DERIVED_CHECKOUT_TRANSITION",
    prepared.command_receipt_id,
  );
  const customerBound = await vendureGraphql(
    endpoint,
    channelToken,
    checkoutContext,
    `mutation Cclub067BindCustomer($input:CraysBindCanonicalCustomerInput!){
       craysBindCanonicalCustomerToActiveOrder(input:$input){
         orderId orderCode customerId state
       }
     }`,
    {
      input: {
        orderCode: prepared.vendure_order_code,
        vendureCustomerId: prepared.vendure_customer_id,
        vendureUserId: prepared.vendure_user_id,
      },
    },
    sessionToken,
  );
  const binding = customerBound.body?.data
    ?.craysBindCanonicalCustomerToActiveOrder;
  if (String(binding?.orderId) !== String(prepared.vendure_order_id) ||
      binding?.orderCode !== prepared.vendure_order_code ||
      String(binding?.customerId) !== String(prepared.vendure_customer_id) ||
      binding?.state !== "AddingItems") {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  const shippingContext = signCommerceContext(
    prepared,
    authority,
    channelToken,
    commerceContextSecret,
    "cart-mutation",
    "cclub067-booking-virtual-delivery-v1",
    "CCLUB067_SERVER_DERIVED_ZERO_RATE_BOOKING_DELIVERY",
    prepared.command_receipt_id,
  );
  const shipping = await vendureGraphql(
    endpoint,
    channelToken,
    shippingContext,
    `mutation Cclub067SetBookingDelivery($shippingMethodId:[ID!]!){
       setOrderShippingMethod(shippingMethodId:$shippingMethodId){
         __typename
         ... on Order{id code state active currencyCode totalWithTax}
         ... on ErrorResult{errorCode message}
       }
     }`,
    { shippingMethodId: [prepared.vendure_shipping_method_id] },
    sessionToken,
  );
  exactOrderOutcome(
    shipping.body?.data?.setOrderShippingMethod,
    prepared,
    "AddingItems",
  );
  const transitioned = await vendureGraphql(
    endpoint,
    channelToken,
    checkoutContext,
    `mutation Cclub067ArrangePayment($state:String!){
       transitionOrderToState(state:$state){
         __typename
         ... on Order{id code state active currencyCode totalWithTax}
         ... on ErrorResult{errorCode message}
         ... on OrderStateTransitionError{
           fromState toState transitionError
         }
       }
     }`,
    { state: "ArrangingPayment" },
    sessionToken,
  );
  exactOrderOutcome(
    transitioned.body?.data?.transitionOrderToState,
    prepared,
    "ArrangingPayment",
  );

  const paymentContext = signCommerceContext(
    prepared,
    authority,
    channelToken,
    commerceContextSecret,
    "payment-admission",
    "cclub067-clubs-test-payment-v1",
    "CCLUB067_TEST_ONLY_PAYMENT_NO_RETURN_URL",
    prepared.command_receipt_id,
  );
  const intentId = `pi_crays_test_${sha256(prepared.command_receipt_id).slice(0, 32)}`;
  const paid = await vendureGraphql(
    endpoint,
    channelToken,
    paymentContext,
    `mutation Cclub067TestPayment($input:PaymentInput!){
       addPaymentToOrder(input:$input){
         __typename
         ... on Order{
           id code state active currencyCode totalWithTax
           payments{id state amount method}
         }
       }
     }`,
    {
      input: {
        method: prepared.vendure_payment_method_code,
        metadata: {
          stripePaymentIntentId: intentId,
          craysIdempotencyKey: prepared.idempotency_key,
          paymentDomain: "clubs-booking-test-only",
          evidenceClass: "test_only",
          liveMoneyAllowed: false,
        },
      },
    },
    sessionToken,
  );
  const order = exactOrderOutcome(
    paid.body?.data?.addPaymentToOrder,
    prepared,
    "PaymentSettled",
  );
  const payments = Array.isArray(order.payments)
    ? order.payments.filter((payment) =>
      payment.state === "Settled" &&
      payment.method === prepared.vendure_payment_method_code &&
      Number(payment.amount) === Number(prepared.unit_amount_minor))
    : [];
  if (payments.length !== 1) {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  const publicOutcome = {
    orderState: order.state,
    paymentId: String(payments[0].id),
    refundId: null,
    amountMinor: Number(payments[0].amount),
    currencyCode: order.currencyCode,
  };
  return Object.freeze({
    ...publicOutcome,
    payloadSha256: sha256(canonicalJson(publicOutcome)),
  });
}

async function loginVendureAdmin(
  endpoint,
  channelToken,
  username,
  password,
) {
  const login = await vendureGraphql(
    endpoint,
    channelToken,
    null,
    `mutation Cclub067AdminLogin($username:String!,$password:String!){
       login(username:$username,password:$password,rememberMe:false){
         __typename ... on CurrentUser{id}
       }
     }`,
    { username, password },
  );
  if (login.body?.data?.login?.__typename !== "CurrentUser") {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  const token = login.response.headers.get("vendure-auth-token");
  if (!token) {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  return token;
}

function orderCommandContext(
  prepared,
  authority,
  channelToken,
  commerceContextSecret,
) {
  return signCommerceContext(
    prepared,
    authority,
    channelToken,
    commerceContextSecret,
    "order-command",
    "cclub067-order-command-v1",
    "CCLUB067_SERVER_DERIVED_ORDER_COMMAND",
    prepared.command_receipt_id,
  );
}

export async function cancelOrderInVendure(
  endpoint,
  channelToken,
  commerceContextSecret,
  adminUsername,
  adminPassword,
  authority,
  prepared,
) {
  const bearer = await loginVendureAdmin(
    endpoint,
    channelToken,
    adminUsername,
    adminPassword,
  );
  const cancelled = await vendureGraphql(
    endpoint,
    channelToken,
    orderCommandContext(
      prepared,
      authority,
      channelToken,
      commerceContextSecret,
    ),
    `mutation Cclub067Cancel($input:CancelOrderInput!){
       cancelOrder(input:$input){
         __typename
         ... on Order{id code state active currencyCode totalWithTax}
       }
     }`,
    {
      input: {
        orderId: prepared.vendure_order_id,
        cancelShipping: true,
        reason: "CCLUB067_TEST_ONLY_SERVER_COMMAND",
      },
    },
    bearer,
  );
  const order = exactOrderOutcome(
    cancelled.body?.data?.cancelOrder,
    prepared,
    "Cancelled",
    0,
  );
  const publicOutcome = {
    orderState: order.state,
    paymentId: prepared.provider_payment_id ?? null,
    refundId: null,
    amountMinor: Number(prepared.unit_amount_minor),
    currencyCode: order.currencyCode,
  };
  return Object.freeze({
    ...publicOutcome,
    payloadSha256: sha256(canonicalJson(publicOutcome)),
  });
}

export async function refundTestPaymentInVendure(
  endpoint,
  channelToken,
  commerceContextSecret,
  adminUsername,
  adminPassword,
  authority,
  prepared,
) {
  if (!prepared.provider_payment_id) {
    throw new ClubsCommerceBffError("BFF_ORDER_COMMAND_CORRUPT");
  }
  const bearer = await loginVendureAdmin(
    endpoint,
    channelToken,
    adminUsername,
    adminPassword,
  );
  const refunded = await vendureGraphql(
    endpoint,
    channelToken,
    orderCommandContext(
      prepared,
      authority,
      channelToken,
      commerceContextSecret,
    ),
    `mutation Cclub067Refund($input:RefundOrderInput!){
       refundOrder(input:$input){
         __typename
         ... on Refund{id state total}
       }
     }`,
    {
      input: {
        paymentId: prepared.provider_payment_id,
        amount: Number(prepared.unit_amount_minor),
        lines: [],
        shipping: 0,
        adjustment: 0,
        reason: "CCLUB067_TEST_ONLY_SERVER_COMMAND",
      },
    },
    bearer,
  );
  const refund = refunded.body?.data?.refundOrder;
  if (refund?.__typename !== "Refund" || refund.state !== "Settled" ||
      Number(refund.total) !== Number(prepared.unit_amount_minor)) {
    throw new ClubsCommerceBffError("BFF_PROVIDER_OUTCOME_UNKNOWN");
  }
  const publicOutcome = {
    orderState: "Cancelled",
    paymentId: String(prepared.provider_payment_id),
    refundId: String(refund.id),
    amountMinor: Number(refund.total),
    currencyCode: prepared.currency_code,
  };
  return Object.freeze({
    ...publicOutcome,
    payloadSha256: sha256(canonicalJson(publicOutcome)),
  });
}

export function publicOrderCommand(prepared) {
  const states = {
    TEST_CHECKOUT_SETTLE: "test_payment_settled",
    CANCEL_ORDER: "order_cancelled",
    TEST_REFUND: "test_refund_settled",
  };
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    state: states[prepared.command_kind],
    commandReference: prepared.command_receipt_id,
    cartReference: prepared.cart_id,
    orderCode: prepared.vendure_order_code,
    price: Object.freeze({
      currencyCode: prepared.currency_code,
      unitAmountMinor: Number(prepared.unit_amount_minor),
      evidenceClass: "test_only",
      providerConfirmed: false,
    }),
    settlementAuthority: "server_test_only",
    browserReturnUrlCanSettle: false,
    realChannelManagerCutoverGate: "CCLUB-120",
    liveMoneyAllowed: false,
  });
}

export function publicAppliedCart(prepared, orderCode) {
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    state: "cart_created",
    cartReference: prepared.cart_id,
    orderCode,
    price: Object.freeze({
      currencyCode: prepared.currency_code,
      unitAmountMinor: Number(prepared.unit_amount_minor),
      evidenceClass: "test_only",
      providerConfirmed: false,
    }),
    channelManagerState: "simulated_test_only",
    realChannelManagerCutoverGate: "CCLUB-120",
    liveMoneyAllowed: false,
  });
}

export function assertSafePublicResponse(response) {
  const serialized = JSON.stringify(response);
  const lower = serialized.toLowerCase();
  const deniedFragments = [
    "vendure-token",
    "admintoken",
    "adminsecret",
    "channeltoken",
    "commercecontextsignature",
    "x-crays-commerce-context",
    "providerscopebindingid",
    "sellerchannelmappingid",
    "partnerTenantId".toLowerCase(),
    "operatorLegalEntityId".toLowerCase(),
    "venduresellerid",
    "vendurechannelid",
    "@crays.org",
    "tb@",
  ];
  if (deniedFragments.some((fragment) => lower.includes(fragment))) {
    throw new ClubsCommerceBffError("BFF_RESPONSE_AUTHORITY_LEAK");
  }
  return response;
}

export function publicError(error) {
  const source = error instanceof ClubsCommerceBffError
    ? error
    : new ClubsCommerceBffError("BFF_TEMPORARILY_UNAVAILABLE", 503);
  const allowed = new Map([
    ["BFF_AUTHENTICATION_REQUIRED", [401, "BFF_SIGN_IN_REQUIRED"]],
    ["BFF_CUSTOMER_ACCESS_DENIED", [403, "BFF_CUSTOMER_ACCESS_DENIED"]],
    ["BFF_BROWSER_AUTHORITY_DENIED", [400, "BFF_REQUEST_INVALID"]],
    ["BFF_BROWSER_FIELD_DENIED", [400, "BFF_REQUEST_INVALID"]],
    ["BFF_OPERATION_DENIED", [400, "BFF_REQUEST_INVALID"]],
    ["BFF_PRODUCT_TYPE_INVALID", [400, "BFF_REQUEST_INVALID"]],
    ["BFF_BOOKING_PRICE_STALE", [409, "BFF_BOOKING_PRICE_STALE"]],
    ["BFF_BOOKING_CAPACITY_CHANGED", [409, "BFF_BOOKING_CAPACITY_CHANGED"]],
    ["BFF_BOOKING_SCOPE_DENIED", [403, "BFF_BOOKING_SCOPE_DENIED"]],
    ["BFF_BOOKING_HOLD_INVALID", [409, "BFF_BOOKING_HOLD_INVALID"]],
    ["BFF_BOOKING_RECONCILIATION_REQUIRED", [503, "BFF_BOOKING_RECONCILIATION_REQUIRED"]],
    ["BFF_ORDER_COMMAND_SEQUENCE_INVALID", [409, "BFF_ORDER_COMMAND_SEQUENCE_INVALID"]],
    ["BFF_ORDER_COMMAND_ALREADY_APPLIED", [409, "BFF_ORDER_COMMAND_ALREADY_APPLIED"]],
    ["BFF_REQUEST_INVALID", [400, "BFF_REQUEST_INVALID"]],
    ["BFF_REQUEST_TOO_LARGE", [413, "BFF_REQUEST_INVALID"]],
    ["BFF_ORIGIN_DENIED", [403, "BFF_ORIGIN_DENIED"]],
  ]);
  const [status, code] = allowed.get(source.code) ?? [
    source.status >= 400 && source.status < 500 ? source.status : 503,
    "BFF_TEMPORARILY_UNAVAILABLE",
  ];
  const payload = Object.freeze({
    contractVersion: CONTRACT_VERSION,
    state: "denied",
    code,
  });
  assertSafePublicResponse(payload);
  return Object.freeze({ status, payload });
}
