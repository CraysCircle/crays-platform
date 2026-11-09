import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { CommerceVerticalRoot } from "./server-commerce-context-resolver";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{43}$/;
const RECEIPT_KEYS = new Set([
  "contractVersion", "receiptId", "commandId", "verticalRoot",
  "partnerTenantId", "operatorLegalEntityId", "storeId", "canonicalPersonId",
  "relationshipId", "relationshipVersion", "projectionId",
  "projectionVersion", "providerVersion", "guestBindingSha256",
  "sourceCartId", "sourceCartVersion", "claimedCartId", "claimedCartVersion",
  "lineSnapshotSha256", "sellerContextSha256",
  "classificationSnapshotSha256", "checkoutAuthority",
  "reservationAuthorityState", "issuedAt", "expiresAt",
  "idempotencyKey", "payloadSha256", "signature",
]);

export const CUSTOMER_GUEST_MERGE_RECEIPT_VERSION =
  "ncrv2-122.guest-merge.v2" as const;

export type CustomerGuestMergeReceiptPayload = Readonly<{
  contractVersion: typeof CUSTOMER_GUEST_MERGE_RECEIPT_VERSION;
  receiptId: string;
  commandId: string;
  verticalRoot: CommerceVerticalRoot;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  canonicalPersonId: string;
  relationshipId: string;
  relationshipVersion: number;
  projectionId: string;
  projectionVersion: number;
  providerVersion: string;
  guestBindingSha256: string;
  sourceCartId: string;
  sourceCartVersion: number;
  claimedCartId: string;
  claimedCartVersion: number;
  lineSnapshotSha256: string;
  sellerContextSha256: string;
  classificationSnapshotSha256: string;
  checkoutAuthority: "ordinary_vendure_only";
  reservationAuthorityState: "none";
  issuedAt: string;
  expiresAt: string;
  idempotencyKey: string;
}>;

export type SignedCustomerGuestMergeReceipt = CustomerGuestMergeReceiptPayload &
  Readonly<{ payloadSha256: string; signature: string }>;

export type CustomerGuestMergeExpectedAuthority = Readonly<{
  verticalRoot: CommerceVerticalRoot;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  canonicalPersonId: string;
  relationshipId: string;
  relationshipVersion: number;
  projectionId: string;
  projectionVersion: number;
  providerVersion: string;
  sellerContextSha256: string;
  classificationSnapshotSha256: string;
}>;

export class CustomerGuestMergeReceiptError extends Error {
  constructor(readonly code:
    | "CUSTOMER_GUEST_MERGE_RECEIPT_INPUT_INVALID"
    | "CUSTOMER_GUEST_MERGE_RECEIPT_SECRET_INVALID"
    | "CUSTOMER_GUEST_MERGE_RECEIPT_TIME_INVALID"
    | "CUSTOMER_GUEST_MERGE_RECEIPT_EXPIRED"
    | "CUSTOMER_GUEST_MERGE_RECEIPT_HASH_MISMATCH"
    | "CUSTOMER_GUEST_MERGE_RECEIPT_SIGNATURE_INVALID"
    | "CUSTOMER_GUEST_MERGE_RECEIPT_SCOPE_MISMATCH") {
    super(code);
    this.name = "CustomerGuestMergeReceiptError";
  }
}

function validatePayload(payload: CustomerGuestMergeReceiptPayload) {
  const ids = [
    payload.receiptId, payload.commandId, payload.partnerTenantId,
    payload.operatorLegalEntityId, payload.storeId, payload.canonicalPersonId,
    payload.relationshipId, payload.projectionId, payload.providerVersion,
    payload.sourceCartId, payload.claimedCartId, payload.idempotencyKey,
  ];
  if (
    payload.contractVersion !== CUSTOMER_GUEST_MERGE_RECEIPT_VERSION ||
    !["coffee", "retail", "gym", "clubs"].includes(payload.verticalRoot) ||
    ids.some((value) => !ID.test(value)) ||
    !Number.isSafeInteger(payload.relationshipVersion) ||
    payload.relationshipVersion < 1 ||
    !Number.isSafeInteger(payload.projectionVersion) ||
    payload.projectionVersion < 1 ||
    !Number.isSafeInteger(payload.sourceCartVersion) ||
    payload.sourceCartVersion < 1 ||
    !Number.isSafeInteger(payload.claimedCartVersion) ||
    payload.claimedCartVersion <= payload.sourceCartVersion ||
    !HASH.test(payload.guestBindingSha256) ||
    !HASH.test(payload.lineSnapshotSha256) ||
    !HASH.test(payload.sellerContextSha256) ||
    !HASH.test(payload.classificationSnapshotSha256) ||
    payload.checkoutAuthority !== "ordinary_vendure_only" ||
    payload.reservationAuthorityState !== "none"
  ) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_INPUT_INVALID",
    );
  }
}

function canonicalPayload(payload: CustomerGuestMergeReceiptPayload) {
  validatePayload(payload);
  return JSON.stringify({
    contractVersion: payload.contractVersion,
    receiptId: payload.receiptId,
    commandId: payload.commandId,
    verticalRoot: payload.verticalRoot,
    partnerTenantId: payload.partnerTenantId,
    operatorLegalEntityId: payload.operatorLegalEntityId,
    storeId: payload.storeId,
    canonicalPersonId: payload.canonicalPersonId,
    relationshipId: payload.relationshipId,
    relationshipVersion: payload.relationshipVersion,
    projectionId: payload.projectionId,
    projectionVersion: payload.projectionVersion,
    providerVersion: payload.providerVersion,
    guestBindingSha256: payload.guestBindingSha256,
    sourceCartId: payload.sourceCartId,
    sourceCartVersion: payload.sourceCartVersion,
    claimedCartId: payload.claimedCartId,
    claimedCartVersion: payload.claimedCartVersion,
    lineSnapshotSha256: payload.lineSnapshotSha256,
    sellerContextSha256: payload.sellerContextSha256,
    classificationSnapshotSha256: payload.classificationSnapshotSha256,
    checkoutAuthority: payload.checkoutAuthority,
    reservationAuthorityState: payload.reservationAuthorityState,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    idempotencyKey: payload.idempotencyKey,
  });
}

function secretBytes(secret: string) {
  const bytes = Buffer.from(secret, "utf8");
  if (bytes.length < 32) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_SECRET_INVALID",
    );
  }
  return bytes;
}

export function customerGuestMergePayloadSha256(
  payload: CustomerGuestMergeReceiptPayload,
) {
  return createHash("sha256").update(canonicalPayload(payload), "utf8")
    .digest("hex");
}

export function signCustomerGuestMergeReceipt(
  payload: CustomerGuestMergeReceiptPayload,
  secret: string,
): SignedCustomerGuestMergeReceipt {
  const payloadSha256 = customerGuestMergePayloadSha256(payload);
  const signature = createHmac("sha256", secretBytes(secret))
    .update(payloadSha256, "utf8").digest("base64url");
  return Object.freeze({ ...payload, payloadSha256, signature });
}

export function verifyCustomerGuestMergeReceipt(
  receipt: SignedCustomerGuestMergeReceipt,
  input: Readonly<{
    secret: string;
    maxLifetimeMs: number;
    authorityNow: Date;
    expected: CustomerGuestMergeExpectedAuthority;
  }>,
): Readonly<CustomerGuestMergeReceiptPayload> {
  if (
    !receipt || typeof receipt !== "object" || Array.isArray(receipt) ||
    Object.keys(receipt).length !== RECEIPT_KEYS.size ||
    Object.keys(receipt).some((key) => !RECEIPT_KEYS.has(key))
  ) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_INPUT_INVALID",
    );
  }
  if (!Number.isSafeInteger(input.maxLifetimeMs) || input.maxLifetimeMs < 1) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_TIME_INVALID",
    );
  }
  const payload = {
    contractVersion: receipt.contractVersion,
    receiptId: receipt.receiptId,
    commandId: receipt.commandId,
    verticalRoot: receipt.verticalRoot,
    partnerTenantId: receipt.partnerTenantId,
    operatorLegalEntityId: receipt.operatorLegalEntityId,
    storeId: receipt.storeId,
    canonicalPersonId: receipt.canonicalPersonId,
    relationshipId: receipt.relationshipId,
    relationshipVersion: receipt.relationshipVersion,
    projectionId: receipt.projectionId,
    projectionVersion: receipt.projectionVersion,
    providerVersion: receipt.providerVersion,
    guestBindingSha256: receipt.guestBindingSha256,
    sourceCartId: receipt.sourceCartId,
    sourceCartVersion: receipt.sourceCartVersion,
    claimedCartId: receipt.claimedCartId,
    claimedCartVersion: receipt.claimedCartVersion,
    lineSnapshotSha256: receipt.lineSnapshotSha256,
    sellerContextSha256: receipt.sellerContextSha256,
    classificationSnapshotSha256: receipt.classificationSnapshotSha256,
    checkoutAuthority: receipt.checkoutAuthority,
    reservationAuthorityState: receipt.reservationAuthorityState,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    idempotencyKey: receipt.idempotencyKey,
  } as const;
  const issuedAt = new Date(payload.issuedAt);
  const expiresAt = new Date(payload.expiresAt);
  const authorityNow = input.authorityNow;
  if (
    Number.isNaN(issuedAt.getTime()) || Number.isNaN(expiresAt.getTime()) ||
    Number.isNaN(authorityNow.getTime()) || issuedAt > authorityNow ||
    expiresAt <= issuedAt ||
    expiresAt.getTime() - issuedAt.getTime() > input.maxLifetimeMs
  ) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_TIME_INVALID",
    );
  }
  if (authorityNow >= expiresAt) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_EXPIRED",
    );
  }
  const payloadSha256 = customerGuestMergePayloadSha256(payload);
  if (receipt.payloadSha256 !== payloadSha256) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_HASH_MISMATCH",
    );
  }
  if (!SIGNATURE.test(receipt.signature)) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_SIGNATURE_INVALID",
    );
  }
  const expectedSignature = createHmac("sha256", secretBytes(input.secret))
    .update(payloadSha256, "utf8").digest();
  const actualSignature = Buffer.from(receipt.signature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_SIGNATURE_INVALID",
    );
  }
  const expected = input.expected;
  if (
    payload.verticalRoot !== expected.verticalRoot ||
    payload.partnerTenantId !== expected.partnerTenantId ||
    payload.operatorLegalEntityId !== expected.operatorLegalEntityId ||
    payload.storeId !== expected.storeId ||
    payload.canonicalPersonId !== expected.canonicalPersonId ||
    payload.relationshipId !== expected.relationshipId ||
    payload.relationshipVersion !== expected.relationshipVersion ||
    payload.projectionId !== expected.projectionId ||
    payload.projectionVersion !== expected.projectionVersion ||
    payload.providerVersion !== expected.providerVersion ||
    payload.sellerContextSha256 !== expected.sellerContextSha256 ||
    payload.classificationSnapshotSha256 !==
      expected.classificationSnapshotSha256
  ) {
    throw new CustomerGuestMergeReceiptError(
      "CUSTOMER_GUEST_MERGE_RECEIPT_SCOPE_MISMATCH",
    );
  }
  return Object.freeze({ ...payload });
}
