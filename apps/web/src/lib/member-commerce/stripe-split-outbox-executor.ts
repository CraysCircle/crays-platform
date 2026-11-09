import "server-only";

import {
  createStripePlatformTransfer,
  StripeConnectProviderError,
  type StripePlatformTransferReceipt,
} from "./stripe-connect-direct-charge-provider";

const REQUIRED_BASIS_POINTS = {
  ambassador_or_marketing: 1_000,
  technology_software: 500,
  global_concept: 25,
} as const;

export type StripeSplitBeneficiaryKind = keyof typeof REQUIRED_BASIS_POINTS;

export type StripeSplitTransferLine = {
  lineId: string;
  beneficiaryKind: StripeSplitBeneficiaryKind;
  destinationConnectedAccountId: string;
  amountMinor: number;
  basisPoints: number;
  idempotencyKey: string;
  transferState: "pending" | "retryable" | "submitted" | "confirmed";
};

export type StripeSplitOutboxBatch = {
  commandId: string;
  tenantId: string;
  projectId: string;
  bookingId: string;
  operatorConnectedAccountId: string;
  paymentIntentId: string;
  chargeId: string;
  grossAmountMinor: number;
  applicationFeeAmountMinor: number;
  currency: string;
  allocationPlanDigest: string;
  transferGroup: string;
  attempt: number;
  lines: readonly StripeSplitTransferLine[];
};

export type StripeSplitOutboxStore = {
  claimNextBatch(input: { workerId: string; now: Date; leaseSeconds: number }): Promise<StripeSplitOutboxBatch | null>;
  recordTransferReceipt(input: {
    workerId: string;
    commandId: string;
    lineId: string;
    receipt: StripePlatformTransferReceipt;
    recordedAt: Date;
  }): Promise<void>;
  completeBatch(input: { workerId: string; commandId: string; completedAt: Date }): Promise<void>;
  retryBatch(input: { workerId: string; commandId: string; retryAt: Date; reasonCode: string }): Promise<void>;
  failBatch(input: { workerId: string; commandId: string; failedAt: Date; reasonCode: string }): Promise<void>;
};

export type StripeSplitOutboxTickResult =
  | { state: "idle" }
  | { state: "completed"; commandId: string; transferCount: number }
  | { state: "retry_scheduled"; commandId: string; retryAt: Date; reasonCode: string }
  | { state: "terminal_failure"; commandId: string; reasonCode: string };

function assertOpaque(name: string, value: string): void {
  if (!value || value.length > 255 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new StripeConnectProviderError("invalid_request", `${name} is malformed.`, false);
  }
}

export function assertStripeSplitOutboxBatch(batch: StripeSplitOutboxBatch): void {
  assertOpaque("commandId", batch.commandId);
  assertOpaque("tenantId", batch.tenantId);
  assertOpaque("projectId", batch.projectId);
  assertOpaque("bookingId", batch.bookingId);
  assertOpaque("allocationPlanDigest", batch.allocationPlanDigest);
  assertOpaque("transferGroup", batch.transferGroup);
  if (!batch.operatorConnectedAccountId.startsWith("acct_") || !batch.paymentIntentId.startsWith("pi_") || !batch.chargeId.startsWith("ch_")) {
    throw new StripeConnectProviderError("invalid_request", "Persisted Stripe payment authority is malformed.", false);
  }
  if (!Number.isSafeInteger(batch.grossAmountMinor) || batch.grossAmountMinor <= 0 || !Number.isSafeInteger(batch.applicationFeeAmountMinor) || batch.applicationFeeAmountMinor <= 0 || !/^[a-z]{3}$/.test(batch.currency)) {
    throw new StripeConnectProviderError("invalid_request", "Persisted split amount or currency is malformed.", false);
  }
  if (!Number.isSafeInteger(batch.attempt) || batch.attempt < 0 || batch.lines.length !== 3) {
    throw new StripeConnectProviderError("invalid_request", "Split batch must contain exactly three transfer lines.", false);
  }

  const kinds = new Set<StripeSplitBeneficiaryKind>();
  const destinations = new Set<string>();
  let total = 0;
  for (const line of batch.lines) {
    assertOpaque("lineId", line.lineId);
    assertOpaque("idempotencyKey", line.idempotencyKey);
    if (kinds.has(line.beneficiaryKind)) {
      throw new StripeConnectProviderError("invalid_request", "Split beneficiary kind is duplicated.", false);
    }
    if (!line.destinationConnectedAccountId.startsWith("acct_") || line.destinationConnectedAccountId === batch.operatorConnectedAccountId || destinations.has(line.destinationConnectedAccountId)) {
      throw new StripeConnectProviderError("invalid_request", "Split recipient authority is invalid or duplicated.", false);
    }
    if (line.basisPoints !== REQUIRED_BASIS_POINTS[line.beneficiaryKind] || !Number.isSafeInteger(line.amountMinor) || line.amountMinor <= 0) {
      throw new StripeConnectProviderError("invalid_request", "Split line does not match the immutable entitlement class.", false);
    }
    kinds.add(line.beneficiaryKind);
    destinations.add(line.destinationConnectedAccountId);
    total += line.amountMinor;
  }
  if (kinds.size !== 3 || total !== batch.applicationFeeAmountMinor) {
    throw new StripeConnectProviderError("invalid_request", "Split lines do not reconcile to the Stripe application fee.", false);
  }
}

function retryDelaySeconds(attempt: number): number {
  return Math.min(3_600, 15 * (2 ** Math.min(Math.max(attempt, 0), 10)));
}

function reasonCode(error: unknown): string {
  return error instanceof StripeConnectProviderError ? error.code : "unexpected_error";
}

export async function runStripeSplitOutboxTick(input: {
  workerId: string;
  platformSecretKey: string;
  store: StripeSplitOutboxStore;
  now?: Date;
  leaseSeconds?: number;
  fetchImpl?: typeof fetch;
}): Promise<StripeSplitOutboxTickResult> {
  assertOpaque("workerId", input.workerId);
  const now = input.now ?? new Date();
  const leaseSeconds = input.leaseSeconds ?? 60;
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 15 || leaseSeconds > 900) {
    throw new StripeConnectProviderError("invalid_request", "Stripe split lease duration is outside the safe range.", false);
  }

  const batch = await input.store.claimNextBatch({ workerId: input.workerId, now, leaseSeconds });
  if (!batch) return { state: "idle" };
  try {
    assertStripeSplitOutboxBatch(batch);
    let transferCount = 0;
    for (const line of batch.lines) {
      if (line.transferState === "confirmed") continue;
      const receipt = await createStripePlatformTransfer({
        platformSecretKey: input.platformSecretKey,
        destinationConnectedAccountId: line.destinationConnectedAccountId,
        amountMinor: line.amountMinor,
        currency: batch.currency,
        transferGroup: batch.transferGroup,
        tenantId: batch.tenantId,
        projectId: batch.projectId,
        bookingId: batch.bookingId,
        beneficiaryKind: line.beneficiaryKind,
        allocationPlanDigest: batch.allocationPlanDigest,
        idempotencyKey: line.idempotencyKey,
      }, { fetchImpl: input.fetchImpl });
      await input.store.recordTransferReceipt({
        workerId: input.workerId,
        commandId: batch.commandId,
        lineId: line.lineId,
        receipt,
        recordedAt: now,
      });
      transferCount += 1;
    }
    await input.store.completeBatch({ workerId: input.workerId, commandId: batch.commandId, completedAt: now });
    return { state: "completed", commandId: batch.commandId, transferCount };
  } catch (error) {
    const code = reasonCode(error);
    const retryable = !(error instanceof StripeConnectProviderError) || error.retryable;
    if (retryable) {
      const retryAt = new Date(now.getTime() + retryDelaySeconds(batch.attempt) * 1_000);
      await input.store.retryBatch({ workerId: input.workerId, commandId: batch.commandId, retryAt, reasonCode: code });
      return { state: "retry_scheduled", commandId: batch.commandId, retryAt, reasonCode: code };
    }
    await input.store.failBatch({ workerId: input.workerId, commandId: batch.commandId, failedAt: now, reasonCode: code });
    return { state: "terminal_failure", commandId: batch.commandId, reasonCode: code };
  }
}
