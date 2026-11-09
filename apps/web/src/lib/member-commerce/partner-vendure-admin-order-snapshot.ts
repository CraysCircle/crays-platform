import "server-only";

import type { ServerCommerceContext } from
  "./server-commerce-context-resolver";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const CUSTOM_FIELD_KEYS = [
  "craysContextId",
  "craysDataClass",
  "craysOperatorLegalEntityId",
  "craysOrderSellerSnapshotId",
  "craysOrderSellerSnapshotSha256",
  "craysPartnerTenantId",
  "craysPersonReferenceSha256",
  "craysStoreId",
  "craysStoreOperatorAssignmentId",
  "craysVerticalRoot",
] as const;

export type PartnerOrderSnapshotProviderRecord = Readonly<{
  providerOrderId: string;
  orderCode: string;
  channels: readonly Readonly<{
    channelId: string;
    sellerId: string;
  }>[];
  customFields: Readonly<Record<(typeof CUSTOM_FIELD_KEYS)[number], unknown>>;
}>;

export type PartnerOrderSnapshotProjection = Readonly<{
  orderCode: string;
  contextId: string;
  snapshotId: string;
  snapshotSha256: string;
  dataClass: "restricted_commerce_correlation";
  scope: Readonly<{
    verticalRoot: ServerCommerceContext["verticalRoot"];
    partnerTenantId: string;
    operatorLegalEntityId: string;
    storeId: string;
    storeOperatorAssignmentId: string;
    storeOperatorAssignmentVersion: number;
    providerBindingVersion: number;
  }>;
}>;

export interface PartnerOrderSnapshotProvider {
  readExact(input: Readonly<{
    deploymentCellId: string;
    vendureSellerId: string;
    vendureChannelId: string;
    channelTokenSecretRef: string;
    orderCode: string;
  }>): Promise<unknown>;
}

export class PartnerOrderSnapshotProjectionError extends Error {
  constructor(readonly outcome: "not_found" | "unknown", readonly code: string) {
    super(code);
    this.name = "PartnerOrderSnapshotProjectionError";
  }
}

function exactId(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && ID.test(value);
}

export function projectPartnerOrderSnapshot(
  context: ServerCommerceContext,
  orderCode: string,
  raw: unknown,
): PartnerOrderSnapshotProjection {
  if (!exactId(orderCode)) {
    throw new PartnerOrderSnapshotProjectionError(
      "unknown", "PARTNER_ORDER_SNAPSHOT_INPUT_INVALID",
    );
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PartnerOrderSnapshotProjectionError(
      "unknown", "PARTNER_ORDER_SNAPSHOT_RESPONSE_INVALID",
    );
  }
  const record = raw as Record<string, unknown>;
  if (
    Object.keys(record).sort().join("|") !==
      ["channels", "customFields", "orderCode", "providerOrderId"].join("|") ||
    !exactId(record.providerOrderId) || !exactId(record.orderCode) ||
    record.orderCode !== orderCode || !Array.isArray(record.channels) ||
    record.channels.length !== 1 ||
    !record.customFields || typeof record.customFields !== "object" ||
    Array.isArray(record.customFields)
  ) {
    throw new PartnerOrderSnapshotProjectionError(
      "unknown", "PARTNER_ORDER_SNAPSHOT_RESPONSE_INVALID",
    );
  }
  const channel = record.channels[0] as Record<string, unknown>;
  if (
    Object.keys(channel).sort().join("|") !== "channelId|sellerId" ||
    channel.channelId !== context.vendure.channelId ||
    channel.sellerId !== context.vendure.sellerId
  ) {
    throw new PartnerOrderSnapshotProjectionError(
      "not_found", "PARTNER_ORDER_SNAPSHOT_SCOPE_MISMATCH",
    );
  }
  const fields = record.customFields as Record<string, unknown>;
  if (
    Object.keys(fields).sort().join("|") !== CUSTOM_FIELD_KEYS.join("|")
  ) {
    throw new PartnerOrderSnapshotProjectionError(
      "unknown", "PARTNER_ORDER_SNAPSHOT_FIELDS_INVALID",
    );
  }
  const values = CUSTOM_FIELD_KEYS.map((key) => fields[key]);
  if (values.every((value) => value === null)) {
    throw new PartnerOrderSnapshotProjectionError(
      "not_found", "PARTNER_ORDER_SNAPSHOT_NOT_FROZEN",
    );
  }
  if (values.some((value) => value === null || value === undefined)) {
    throw new PartnerOrderSnapshotProjectionError(
      "unknown", "PARTNER_ORDER_SNAPSHOT_FIELDS_PARTIAL",
    );
  }
  if (
    !exactId(fields.craysContextId) ||
    !exactId(fields.craysOrderSellerSnapshotId) ||
    typeof fields.craysPersonReferenceSha256 !== "string" ||
    !SHA256.test(fields.craysPersonReferenceSha256) ||
    typeof fields.craysOrderSellerSnapshotSha256 !== "string" ||
    !SHA256.test(fields.craysOrderSellerSnapshotSha256) ||
    fields.craysDataClass !== "restricted_commerce_correlation"
  ) {
    throw new PartnerOrderSnapshotProjectionError(
      "unknown", "PARTNER_ORDER_SNAPSHOT_FIELDS_INVALID",
    );
  }
  if (
    fields.craysVerticalRoot !== context.verticalRoot ||
    fields.craysPartnerTenantId !== context.partnerTenantId ||
    fields.craysOperatorLegalEntityId !== context.operatorLegalEntityId ||
    fields.craysStoreId !== context.storeId ||
    fields.craysStoreOperatorAssignmentId !==
      context.storeOperatorAssignmentId
  ) {
    throw new PartnerOrderSnapshotProjectionError(
      "not_found", "PARTNER_ORDER_SNAPSHOT_SCOPE_MISMATCH",
    );
  }
  return Object.freeze({
    orderCode,
    contextId: fields.craysContextId,
    snapshotId: fields.craysOrderSellerSnapshotId,
    snapshotSha256: fields.craysOrderSellerSnapshotSha256,
    dataClass: "restricted_commerce_correlation" as const,
    scope: Object.freeze({
      verticalRoot: context.verticalRoot,
      partnerTenantId: context.partnerTenantId,
      operatorLegalEntityId: context.operatorLegalEntityId,
      storeId: context.storeId,
      storeOperatorAssignmentId: context.storeOperatorAssignmentId,
      storeOperatorAssignmentVersion: context.storeOperatorAssignmentVersion,
      providerBindingVersion: context.providerBindingVersion,
    }),
  });
}
