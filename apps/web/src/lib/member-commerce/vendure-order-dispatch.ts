import "server-only";

import { createHash } from "node:crypto";

import type { VendureOrderCommand } from "./vendure-order-command";

export type VendureOrderDispatchOutcome =
  | "DELIVERED"
  | "FAILED_RETRYABLE"
  | "UNKNOWN_RECONCILIATION_REQUIRED";

type VendureOrderTransportBase = Readonly<{
  commandSha256: string;
  idempotencyKey: string;
  providerResponseSha256: string;
  observedAt: string;
}>;

export type VendureOrderTransportResult =
  | (VendureOrderTransportBase &
      Readonly<{
        outcome: "DELIVERED";
        providerOrderId: string;
        providerObjectSha256: string;
        providerAckSha256: string;
        providerReadbackSha256: string;
        retryEvidenceKind: null;
        retryEvidenceSha256: null;
        unknownOutcomeEvidenceSha256: null;
      }>)
  | (VendureOrderTransportBase &
      Readonly<{
        outcome: "FAILED_RETRYABLE";
        providerOrderId: null;
        providerObjectSha256: null;
        providerAckSha256: null;
        providerReadbackSha256: null;
        retryEvidenceKind: "CONFIRMED_NOT_APPLIED" | "RETRYABLE_ERROR";
        retryEvidenceSha256: string;
        unknownOutcomeEvidenceSha256: null;
      }>)
  | (VendureOrderTransportBase &
      Readonly<{
        outcome: "UNKNOWN_RECONCILIATION_REQUIRED";
        providerOrderId: null;
        providerObjectSha256: null;
        providerAckSha256: null;
        providerReadbackSha256: null;
        retryEvidenceKind: null;
        retryEvidenceSha256: null;
        unknownOutcomeEvidenceSha256: string;
      }>);

export type VendureOrderTransport = Readonly<{
  send(command: VendureOrderCommand): Promise<VendureOrderTransportResult>;
}>;

const HASH = /^[a-f0-9]{64}$/;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("VENDURE_ORDER_DISPATCH_CANONICAL_VALUE_INVALID");
  return serialized;
}

const digest = (value: object) => createHash("sha256").update(canonical(value)).digest("hex");

function invalid(): never {
  throw new Error("VENDURE_ORDER_DISPATCH_RECEIPT_INVALID");
}

function exactInstant(value: string): boolean {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function transportEvidence(error: unknown): string {
  return digest({
    kind: error instanceof Error ? error.name : typeof error,
    code:
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "UNKNOWN")
        : "UNKNOWN",
  });
}

function validateTransportResult(
  command: Pick<VendureOrderCommand, "commandSha256" | "idempotencyKey">,
  result: VendureOrderTransportResult,
): void {
  if (
    result.commandSha256 !== command.commandSha256 ||
    result.idempotencyKey !== command.idempotencyKey ||
    !HASH.test(result.providerResponseSha256) ||
    !exactInstant(result.observedAt)
  ) invalid();

  if (result.outcome === "DELIVERED") {
    if (
      !result.providerOrderId.trim() ||
      !HASH.test(result.providerObjectSha256) ||
      !HASH.test(result.providerAckSha256) ||
      !HASH.test(result.providerReadbackSha256) ||
      result.providerResponseSha256 !== result.providerReadbackSha256 ||
      result.retryEvidenceKind !== null ||
      result.retryEvidenceSha256 !== null ||
      result.unknownOutcomeEvidenceSha256 !== null
    ) invalid();
    return;
  }

  if (
    result.providerOrderId !== null ||
    result.providerObjectSha256 !== null ||
    result.providerAckSha256 !== null ||
    result.providerReadbackSha256 !== null
  ) invalid();

  if (result.outcome === "FAILED_RETRYABLE") {
    if (
      !["CONFIRMED_NOT_APPLIED", "RETRYABLE_ERROR"].includes(result.retryEvidenceKind) ||
      !HASH.test(result.retryEvidenceSha256) ||
      result.providerResponseSha256 !== result.retryEvidenceSha256 ||
      result.unknownOutcomeEvidenceSha256 !== null
    ) invalid();
    return;
  }

  if (
    result.retryEvidenceKind !== null ||
    result.retryEvidenceSha256 !== null ||
    !HASH.test(result.unknownOutcomeEvidenceSha256) ||
    result.providerResponseSha256 !== result.unknownOutcomeEvidenceSha256
  ) invalid();
}

export async function dispatchVendureOrderCommand(
  command: VendureOrderCommand,
  transport: VendureOrderTransport,
) {
  if (!HASH.test(command.commandSha256) || !command.idempotencyKey.trim()) invalid();

  let result: VendureOrderTransportResult;
  try {
    result = await transport.send(command);
  } catch (error) {
    const evidenceSha256 = transportEvidence(error);
    result = {
      outcome: "UNKNOWN_RECONCILIATION_REQUIRED",
      commandSha256: command.commandSha256,
      idempotencyKey: command.idempotencyKey,
      providerOrderId: null,
      providerResponseSha256: evidenceSha256,
      providerObjectSha256: null,
      providerAckSha256: null,
      providerReadbackSha256: null,
      retryEvidenceKind: null,
      retryEvidenceSha256: null,
      unknownOutcomeEvidenceSha256: evidenceSha256,
      observedAt: new Date().toISOString(),
    };
  }
  validateTransportResult(command, result);
  const body = {
    version: "ncrv2-134.v1" as const,
    sourceOutboxEventId: command.sourceOutboxEventId,
    orderSnapshotId: command.orderSnapshotId,
    orderId: command.orderId,
    ...result,
  };
  return Object.freeze({ ...body, receiptSha256: digest(body) });
}

export type VendureOrderDispatchReceipt = Awaited<ReturnType<typeof dispatchVendureOrderCommand>>;

export function verifyVendureOrderDispatchReceipt(
  receipt: VendureOrderDispatchReceipt,
): VendureOrderDispatchReceipt {
  const { receiptSha256, ...body } = receipt;
  if (!HASH.test(receiptSha256) || digest(body) !== receiptSha256) invalid();
  validateTransportResult(
    { commandSha256: receipt.commandSha256, idempotencyKey: receipt.idempotencyKey },
    receipt,
  );
  return Object.freeze({ ...receipt });
}

export type VendureOrderDispatchExecutionResult = Readonly<{
  state: "provider_not_bound" | "retry" | "reconcile_required" | "delivered";
  receipt: VendureOrderDispatchReceipt | null;
  providerCallPerformed: boolean;
  providerDeliveryClaimed: boolean;
  reconciliationRequired: boolean;
  productionApplied: false;
}>;

export async function executeVendureOrderDispatch(
  command: VendureOrderCommand,
  transport?: VendureOrderTransport,
): Promise<VendureOrderDispatchExecutionResult> {
  if (!transport) {
    return Object.freeze({
      state: "provider_not_bound",
      receipt: null,
      providerCallPerformed: false,
      providerDeliveryClaimed: false,
      reconciliationRequired: false,
      productionApplied: false,
    });
  }
  const receipt = await dispatchVendureOrderCommand(command, transport);
  return Object.freeze({
    state:
      receipt.outcome === "DELIVERED"
        ? "delivered"
        : receipt.outcome === "FAILED_RETRYABLE"
          ? "retry"
          : "reconcile_required",
    receipt,
    providerCallPerformed: true,
    providerDeliveryClaimed: receipt.outcome === "DELIVERED",
    reconciliationRequired: receipt.outcome === "UNKNOWN_RECONCILIATION_REQUIRED",
    productionApplied: false,
  });
}
