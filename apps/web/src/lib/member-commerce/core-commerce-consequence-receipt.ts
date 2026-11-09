import {createHash, createHmac} from "node:crypto";

export const CORE_COMMERCE_CONSEQUENCE_SCHEMA =
  "crays.core.commerce-consequence-receipt.v1" as const;

export type CoreCommerceConsequenceSource = Readonly<{
  consequenceId: string;
  tenantId: string;
  sourceType: "RETURN" | "PARTNER_FEE";
  sourceId: string;
  sourceVersion: number;
  causingRecordType: "CRAYS_CORE_RETURN" | "CRAYS_CORE_PARTNER_FEE";
  causingRecordId: string;
  causingRecordVersion: number;
  occurredAt: string;
  orderId: string;
  orderCode: string;
  orderSellerSnapshotId: string;
  orderSellerSnapshotSha256: string;
  payload: Readonly<Record<string, string | number>>;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;
const FORBIDDEN_ROUTING_FIELDS = [
  "deploymentCellId", "partnerTenantId", "operatorTenantId",
  "operatorLegalEntityId", "storeId", "vendureSellerId",
  "vendureChannelId", "erpBindingId", "erpSiteId", "erpCompanyId",
  "erpWarehouseId",
] as const;

export function canonicalCommerceJson(value: unknown): string {
  if (value === null || typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalCommerceJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalCommerceJson(record[key])}`).join(",")}}`;
  }
  throw new Error("CORE_COMMERCE_NON_CANONICAL_VALUE");
}

const digest = (value: unknown) =>
  createHash("sha256").update(canonicalCommerceJson(value)).digest("hex");

function assertId(value: string, code: string) {
  if (!ID.test(value)) throw new Error(code);
}

export function prepareCoreCommerceConsequencePersistence(
  input: CoreCommerceConsequenceSource,
) {
  for (const [value, code] of [
    [input.consequenceId, "CORE_CONSEQUENCE_ID_INVALID"],
    [input.tenantId, "CORE_CONSEQUENCE_TENANT_INVALID"],
    [input.sourceId, "CORE_CONSEQUENCE_SOURCE_ID_INVALID"],
    [input.causingRecordId, "CORE_CONSEQUENCE_CAUSING_RECORD_ID_INVALID"],
    [input.orderId, "CORE_CONSEQUENCE_ORDER_ID_INVALID"],
    [input.orderCode, "CORE_CONSEQUENCE_ORDER_CODE_INVALID"],
    [input.orderSellerSnapshotId, "CORE_CONSEQUENCE_SNAPSHOT_ID_INVALID"],
  ] as const) assertId(value, code);
  if (!HASH.test(input.orderSellerSnapshotSha256)) {
    throw new Error("CORE_CONSEQUENCE_SNAPSHOT_HASH_INVALID");
  }
  if (!Number.isSafeInteger(input.sourceVersion) || input.sourceVersion < 1 ||
      !Number.isSafeInteger(input.causingRecordVersion) || input.causingRecordVersion < 1 ||
      !Number.isFinite(Date.parse(input.occurredAt))) {
    throw new Error("CORE_CONSEQUENCE_VERSION_OR_TIME_INVALID");
  }
  if (
    (input.sourceType === "RETURN" && input.causingRecordType !== "CRAYS_CORE_RETURN") ||
    (input.sourceType === "PARTNER_FEE" && input.causingRecordType !== "CRAYS_CORE_PARTNER_FEE")
  ) throw new Error("CORE_CONSEQUENCE_AUTHORITY_MISMATCH");
  for (const field of FORBIDDEN_ROUTING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      throw new Error("CORE_CONSEQUENCE_ROUTING_OVERRIDE_DENIED");
    }
  }
  const payload = input.sourceType === "RETURN"
    ? validateReturnPayload(input.payload)
    : validatePartnerFeePayload(input.payload);
  const sourceRecord = Object.freeze({...input, payload});
  const sourceRecordSha256 = digest(sourceRecord);
  return Object.freeze({
    sourceRecord,
    payloadSha256: digest(payload),
    sourceRecordSha256,
    deliveryRecord: Object.freeze({
      deliveryId: `delivery:${input.consequenceId}`,
      consequenceId: input.consequenceId,
      tenantId: input.tenantId,
      destination: "vendure_commerce_consequence" as const,
      deliveryState: "PENDING" as const,
      attemptCount: 0,
      availableAt: input.occurredAt,
    }),
  });
}

function validateReturnPayload(payload: CoreCommerceConsequenceSource["payload"]) {
  const {orderLineId, fulfillmentId, quantity, reasonCode} = payload;
  if (![orderLineId, fulfillmentId, reasonCode].every((value) => typeof value === "string" && ID.test(value)) ||
      !Number.isSafeInteger(quantity) || Number(quantity) < 1 ||
      "amountMinor" in payload || "currency" in payload) {
    throw new Error("CORE_RETURN_PAYLOAD_INVALID");
  }
  return Object.freeze({orderLineId, fulfillmentId, quantity, reasonCode});
}

function validatePartnerFeePayload(payload: CoreCommerceConsequenceSource["payload"]) {
  const {amountMinor, currency} = payload;
  if (!Number.isSafeInteger(amountMinor) || Number(amountMinor) < 1 ||
      typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency) ||
      ["orderLineId", "fulfillmentId", "quantity", "reasonCode"].some((key) => key in payload)) {
    throw new Error("CORE_PARTNER_FEE_PAYLOAD_INVALID");
  }
  return Object.freeze({amountMinor, currency});
}

export function issueSignedCoreCommerceConsequenceReceipt(input: Readonly<{
  persisted: ReturnType<typeof prepareCoreCommerceConsequencePersistence>;
  signingKeyId: string;
  signingSecret: string;
  issuedAt: string;
  lifetimeSeconds?: number;
}>) {
  assertId(input.signingKeyId, "CORE_CONSEQUENCE_SIGNING_KEY_ID_INVALID");
  if (Buffer.byteLength(input.signingSecret) < 32) throw new Error("CORE_CONSEQUENCE_SIGNING_SECRET_INVALID");
  const issuedMs = Date.parse(input.issuedAt);
  const lifetimeSeconds = input.lifetimeSeconds ?? 300;
  if (!Number.isFinite(issuedMs) || !Number.isSafeInteger(lifetimeSeconds) || lifetimeSeconds < 1 || lifetimeSeconds > 300) {
    throw new Error("CORE_CONSEQUENCE_SIGNING_WINDOW_INVALID");
  }
  const source = input.persisted.sourceRecord;
  const receipt = Object.freeze({
    schema: CORE_COMMERCE_CONSEQUENCE_SCHEMA,
    authority: "CRAYS_CORE" as const,
    purpose: "commerce_consequence" as const,
    signingKeyId: input.signingKeyId,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    sourceVersion: source.sourceVersion,
    causingRecordType: source.causingRecordType,
    causingRecordId: source.causingRecordId,
    causingRecordVersion: source.causingRecordVersion,
    sourceReceiptId: source.consequenceId,
    sourceRecordSha256: input.persisted.sourceRecordSha256,
    issuedAt: new Date(issuedMs).toISOString(),
    expiresAt: new Date(issuedMs + lifetimeSeconds * 1000).toISOString(),
    occurredAt: new Date(source.occurredAt).toISOString(),
    orderId: source.orderId,
    orderCode: source.orderCode,
    orderSellerSnapshotId: source.orderSellerSnapshotId,
    orderSellerSnapshotSha256: source.orderSellerSnapshotSha256,
    payload: source.payload,
  });
  const canonical = canonicalCommerceJson(receipt);
  return Object.freeze({
    receipt,
    receiptSha256: createHash("sha256").update(canonical).digest("hex"),
    signature: createHmac("sha256", input.signingSecret).update(canonical).digest("base64url"),
  });
}
