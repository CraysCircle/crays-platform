import "server-only";

export type AmbassadorErpBeneficiaryKind =
  | "ambassador_or_marketing"
  | "technology_software"
  | "global_concept";

export type AmbassadorErpOutboxCommand = {
  commandId: string;
  tenantId: string;
  projectId: string;
  bookingId: string;
  beneficiaryKind: AmbassadorErpBeneficiaryKind;
  beneficiaryPartyId: string;
  erpPayeeId: string;
  amountMinor: number;
  currency: string;
  stripeTransferId: string;
  stripeTransferReceiptDigest: string;
  authorityVersionDigest: string;
  paperworkReceiptDigest: string;
  idempotencyKey: string;
  attempt: number;
};

export type AmbassadorErpPostingReceipt = {
  provider: string;
  documentType: string;
  documentId: string;
  idempotencyKey: string;
  amountMinor: number;
  currency: string;
  providerResponseDigest: string;
};

export type AmbassadorErpGateway = {
  postBeneficiaryPayable(command: AmbassadorErpOutboxCommand): Promise<AmbassadorErpPostingReceipt>;
};

export type AmbassadorErpOutboxStore = {
  claimNext(input: { workerId: string; now: Date; leaseSeconds: number }): Promise<AmbassadorErpOutboxCommand | null>;
  complete(input: { workerId: string; commandId: string; receipt: AmbassadorErpPostingReceipt; completedAt: Date }): Promise<void>;
  retry(input: { workerId: string; commandId: string; retryAt: Date; reasonCode: string }): Promise<void>;
  fail(input: { workerId: string; commandId: string; failedAt: Date; reasonCode: string }): Promise<void>;
};

export type AmbassadorErpTickResult =
  | { state: "idle" }
  | { state: "completed"; commandId: string; documentId: string }
  | { state: "retry_scheduled"; commandId: string; retryAt: Date; reasonCode: string }
  | { state: "terminal_failure"; commandId: string; reasonCode: string };

export class AmbassadorErpOutboxError extends Error {
  constructor(readonly code: string, readonly retryable: boolean, message: string) {
    super(message);
    this.name = "AmbassadorErpOutboxError";
  }
}

function assertOpaque(name: string, value: string): void {
  if (!value || value.length > 255 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new AmbassadorErpOutboxError("invalid_persisted_command", false, `${name} is malformed.`);
  }
}

export function assertAmbassadorErpOutboxCommand(command: AmbassadorErpOutboxCommand): void {
  assertOpaque("commandId", command.commandId);
  assertOpaque("tenantId", command.tenantId);
  assertOpaque("projectId", command.projectId);
  assertOpaque("bookingId", command.bookingId);
  assertOpaque("beneficiaryPartyId", command.beneficiaryPartyId);
  assertOpaque("erpPayeeId", command.erpPayeeId);
  assertOpaque("stripeTransferReceiptDigest", command.stripeTransferReceiptDigest);
  assertOpaque("authorityVersionDigest", command.authorityVersionDigest);
  assertOpaque("paperworkReceiptDigest", command.paperworkReceiptDigest);
  assertOpaque("idempotencyKey", command.idempotencyKey);
  if (!command.stripeTransferId.startsWith("tr_")) {
    throw new AmbassadorErpOutboxError("missing_stripe_transfer_receipt", false, "ERP posting requires a confirmed Stripe transfer.");
  }
  if (!Number.isSafeInteger(command.amountMinor) || command.amountMinor <= 0 || !/^[a-z]{3}$/.test(command.currency)) {
    throw new AmbassadorErpOutboxError("invalid_persisted_command", false, "ERP amount or currency is malformed.");
  }
  if (!Number.isSafeInteger(command.attempt) || command.attempt < 0) {
    throw new AmbassadorErpOutboxError("invalid_persisted_command", false, "ERP attempt is malformed.");
  }
}

function retryDelaySeconds(attempt: number): number {
  return Math.min(21_600, 30 * (2 ** Math.min(Math.max(attempt, 0), 10)));
}

function classify(error: unknown): { code: string; retryable: boolean } {
  return error instanceof AmbassadorErpOutboxError
    ? { code: error.code, retryable: error.retryable }
    : { code: "erp_provider_unavailable", retryable: true };
}

export async function runAmbassadorErpOutboxTick(input: {
  workerId: string;
  store: AmbassadorErpOutboxStore;
  gateway: AmbassadorErpGateway;
  now?: Date;
  leaseSeconds?: number;
}): Promise<AmbassadorErpTickResult> {
  assertOpaque("workerId", input.workerId);
  const now = input.now ?? new Date();
  const leaseSeconds = input.leaseSeconds ?? 120;
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 1_800) {
    throw new AmbassadorErpOutboxError("invalid_worker_configuration", false, "ERP lease duration is outside the safe range.");
  }

  const command = await input.store.claimNext({ workerId: input.workerId, now, leaseSeconds });
  if (!command) return { state: "idle" };
  try {
    assertAmbassadorErpOutboxCommand(command);
    const receipt = await input.gateway.postBeneficiaryPayable(command);
    if (
      receipt.idempotencyKey !== command.idempotencyKey
      || receipt.amountMinor !== command.amountMinor
      || receipt.currency !== command.currency
      || !receipt.documentId
      || !receipt.providerResponseDigest
    ) {
      throw new AmbassadorErpOutboxError("erp_receipt_mismatch", false, "ERP receipt does not match the persisted payable command.");
    }
    await input.store.complete({ workerId: input.workerId, commandId: command.commandId, receipt, completedAt: now });
    return { state: "completed", commandId: command.commandId, documentId: receipt.documentId };
  } catch (error) {
    const classified = classify(error);
    if (classified.retryable) {
      const retryAt = new Date(now.getTime() + retryDelaySeconds(command.attempt) * 1_000);
      await input.store.retry({ workerId: input.workerId, commandId: command.commandId, retryAt, reasonCode: classified.code });
      return { state: "retry_scheduled", commandId: command.commandId, retryAt, reasonCode: classified.code };
    }
    await input.store.fail({ workerId: input.workerId, commandId: command.commandId, failedAt: now, reasonCode: classified.code });
    return { state: "terminal_failure", commandId: command.commandId, reasonCode: classified.code };
  }
}
