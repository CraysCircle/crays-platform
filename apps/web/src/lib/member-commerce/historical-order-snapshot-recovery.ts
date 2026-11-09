import "server-only";

import type { KdsDatabase } from "@/store-operations/kds";
import {
  loadCanonicalVendureCustomerProjection,
  type CanonicalVendureCustomerProjection,
} from "./canonical-vendure-customer-projection-repository";
import type { CommerceVerticalRoot } from "./server-commerce-context-resolver";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;
const RECEIPT_KEYS = [
  "commandId", "commandState", "deploymentCellId", "eventId", "eventType",
  "operatorLegalEntityId", "orderCode", "partnerTenantId", "providerOrderId",
  "snapshotId", "snapshotSha256", "storeId", "vendureCustomerId",
  "vendureUserId", "version", "verticalRoot",
] as const;

export type HistoricalOrderSnapshotProviderReceipt = Readonly<{
  version: 1;
  deploymentCellId: string;
  verticalRoot: CommerceVerticalRoot;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  vendureCustomerId: string;
  vendureUserId: string;
  orderCode: string;
  providerOrderId: string;
  snapshotId: string;
  snapshotSha256: string;
  commandId: string;
  commandState: "PREPARED";
  eventId: string;
  eventType: "ORDER_SELLER_SNAPSHOT_PREPARED";
}>;

export interface HistoricalOrderSnapshotProvider {
  readExactReceipt(input: Readonly<{
    deploymentCellId: string;
    vendureChannelId: string;
    channelTokenSecretRef: string;
    vendureCustomerId: string;
    vendureUserId: string;
    orderCode: string;
  }>): Promise<unknown>;
}

export class HistoricalOrderSnapshotRecoveryError extends Error {
  constructor(readonly code:
    | "HISTORICAL_ORDER_RECOVERY_INPUT_INVALID"
    | "HISTORICAL_ORDER_RECOVERY_RECEIPT_INVALID"
    | "HISTORICAL_ORDER_RECOVERY_SCOPE_MISMATCH") {
    super(code);
    this.name = "HistoricalOrderSnapshotRecoveryError";
  }
}

const RECOVERY_ERROR_CODES = new Set([
  "HISTORICAL_ORDER_RECOVERY_INPUT_INVALID",
  "HISTORICAL_ORDER_RECOVERY_RECEIPT_INVALID",
  "HISTORICAL_ORDER_RECOVERY_SCOPE_MISMATCH",
]);

export function isHistoricalOrderSnapshotRecoveryError(
  error: unknown,
): error is HistoricalOrderSnapshotRecoveryError {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as Record<string, unknown>;
  const code = candidate.code;
  return candidate.name === "HistoricalOrderSnapshotRecoveryError" &&
    typeof code === "string" &&
    RECOVERY_ERROR_CODES.has(code) &&
    candidate.message === code;
}

function exactId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

export function assertHistoricalOrderSnapshotProviderReceipt(
  authority: CanonicalVendureCustomerProjection,
  orderCode: string,
  raw: unknown,
): HistoricalOrderSnapshotProviderReceipt {
  if (!exactId(orderCode)) {
    throw new HistoricalOrderSnapshotRecoveryError(
      "HISTORICAL_ORDER_RECOVERY_INPUT_INVALID",
    );
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HistoricalOrderSnapshotRecoveryError(
      "HISTORICAL_ORDER_RECOVERY_RECEIPT_INVALID",
    );
  }
  const receipt = raw as Record<string, unknown>;
  if (
    Object.keys(receipt).sort().join("|") !== [...RECEIPT_KEYS].sort().join("|") ||
    receipt.version !== 1 ||
    !exactId(receipt.providerOrderId) ||
    !exactId(receipt.snapshotId) ||
    !exactId(receipt.commandId) ||
    !exactId(receipt.eventId) ||
    typeof receipt.snapshotSha256 !== "string" ||
    !HASH.test(receipt.snapshotSha256) ||
    receipt.commandState !== "PREPARED" ||
    receipt.eventType !== "ORDER_SELLER_SNAPSHOT_PREPARED"
  ) {
    throw new HistoricalOrderSnapshotRecoveryError(
      "HISTORICAL_ORDER_RECOVERY_RECEIPT_INVALID",
    );
  }
  const context = authority.context;
  if (
    receipt.deploymentCellId !== context.vendure.deploymentCellId ||
    receipt.verticalRoot !== context.verticalRoot ||
    receipt.partnerTenantId !== context.partnerTenantId ||
    receipt.operatorLegalEntityId !== context.operatorLegalEntityId ||
    receipt.storeId !== context.storeId ||
    receipt.vendureCustomerId !== authority.vendureCustomerId ||
    receipt.vendureUserId !== authority.vendureUserId ||
    receipt.orderCode !== orderCode
  ) {
    throw new HistoricalOrderSnapshotRecoveryError(
      "HISTORICAL_ORDER_RECOVERY_SCOPE_MISMATCH",
    );
  }
  return Object.freeze(receipt as HistoricalOrderSnapshotProviderReceipt);
}

export async function recoverHistoricalOrderSnapshotReceipt(
  database: KdsDatabase,
  provider: HistoricalOrderSnapshotProvider,
  input: Readonly<{
    canonicalPersonId?: string;
    canonicalAccountId?: string;
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    orderCode: string;
    expectedAssignmentVersion?: number;
    expectedProjectionVersion?: number;
  }>,
): Promise<HistoricalOrderSnapshotProviderReceipt> {
  if (!exactId(input.orderCode)) {
    throw new HistoricalOrderSnapshotRecoveryError(
      "HISTORICAL_ORDER_RECOVERY_INPUT_INVALID",
    );
  }
  const authority = await loadCanonicalVendureCustomerProjection(database, {
    canonicalPersonId: input.canonicalPersonId,
    canonicalAccountId: input.canonicalAccountId,
    verticalRoot: input.verticalRoot,
    storeId: input.storeId,
    purpose: "order",
    use: "historical_order_recovery",
    expectedAssignmentVersion: input.expectedAssignmentVersion,
    expectedProjectionVersion: input.expectedProjectionVersion,
  });
  const raw = await provider.readExactReceipt({
    deploymentCellId: authority.context.vendure.deploymentCellId,
    vendureChannelId: authority.context.vendure.channelId,
    channelTokenSecretRef: authority.context.vendure.channelTokenSecretRef,
    vendureCustomerId: authority.vendureCustomerId,
    vendureUserId: authority.vendureUserId,
    orderCode: input.orderCode,
  });
  return assertHistoricalOrderSnapshotProviderReceipt(
    authority,
    input.orderCode,
    raw,
  );
}
