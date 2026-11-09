export const HOTEL_CANCELLATION_LIFECYCLE_READ_MODEL_VERSION =
  "cclub.phase9.hotel-cancellation-lifecycle-read-model.v1" as const;

const SHA256 = /^[a-f0-9]{64}$/;
const TARGETS = ["vendure", "erpnext", "ambassador-operations"] as const;
type Target = (typeof TARGETS)[number];

export type HotelCancellationLifecycleInput = Readonly<{
  tenantId: string;
  finalBookingReceiptId: string;
  migrationChain: Readonly<{total: number; applied: number}>;
  refundRequired: boolean;
  authority?: Readonly<{
    cancellationAuthorityId: string;
    tenantId: string;
    finalBookingReceiptId: string;
    status: "authorized-awaiting-provider-cancellation";
    sha256: string;
  }>;
  pmsCancellation?: Readonly<{
    cancellationAuthorityId: string;
    tenantId: string;
    status: "provider-confirmed";
    confirmationReceiptId: string;
    sha256: string;
  }>;
  stripeRefund?: Readonly<{
    cancellationAuthorityId: string;
    tenantId: string;
    status: "succeeded";
    refundProviderReceiptId: string;
    sha256: string;
  }>;
  finalization?: Readonly<{
    cancellationAuthorityId: string;
    pmsConfirmationReceiptId: string;
    stripeRefundProviderReceiptId: string | null;
    finalizationPlanId: string;
    state: "eligible-not-applied";
    sha256: string;
  }>;
  application?: Readonly<{
    finalizationPlanId: string;
    applicationReceiptId: string;
    state: "applied-by-verified-transaction";
    inventoryReleased: true;
    revenueReversed: true;
    bookingCanceled: true;
    sha256: string;
  }>;
  consequences?: readonly Readonly<{
    target: Target;
    state:
      | "not-dispatched"
      | "queued"
      | "leased"
      | "accepted-awaiting-ack"
      | "acknowledged";
    acknowledgementSha256: string | null;
  }>[];
}>;

const requireHash = (value: string, code: string) => {
  if (!SHA256.test(value)) throw new Error(code);
};

export function projectHotelCancellationLifecycle(
  input: HotelCancellationLifecycleInput,
) {
  if (!input.tenantId.trim() || !input.finalBookingReceiptId.trim()) {
    throw new Error("HOTEL_CANCELLATION_READ_MODEL_SCOPE_REQUIRED");
  }
  if (
    !Number.isSafeInteger(input.migrationChain.total) ||
    !Number.isSafeInteger(input.migrationChain.applied) ||
    input.migrationChain.total !== 28 ||
    input.migrationChain.applied < 0 ||
    input.migrationChain.applied > input.migrationChain.total
  ) throw new Error("HOTEL_CANCELLATION_READ_MODEL_MIGRATION_CHAIN_INVALID");

  const blockers: string[] = [];
  if (input.migrationChain.applied !== input.migrationChain.total) {
    blockers.push(
      `MIGRATIONS_UNAPPLIED:${input.migrationChain.total - input.migrationChain.applied}`,
    );
  }
  const authority = input.authority;
  if (!authority) blockers.push("CANCELLATION_AUTHORITY_NOT_PERSISTED");
  else {
    requireHash(authority.sha256, "HOTEL_CANCELLATION_READ_MODEL_AUTHORITY_INVALID");
    if (
      authority.tenantId !== input.tenantId ||
      authority.finalBookingReceiptId !== input.finalBookingReceiptId ||
      authority.status !== "authorized-awaiting-provider-cancellation"
    ) throw new Error("HOTEL_CANCELLATION_READ_MODEL_AUTHORITY_SCOPE_MISMATCH");
  }
  const pms = input.pmsCancellation;
  if (!pms) blockers.push("PMS_CANCELLATION_NOT_CONFIRMED");
  else {
    requireHash(pms.sha256, "HOTEL_CANCELLATION_READ_MODEL_PMS_INVALID");
    if (!authority || pms.cancellationAuthorityId !== authority.cancellationAuthorityId ||
      pms.tenantId !== input.tenantId || pms.status !== "provider-confirmed") {
      throw new Error("HOTEL_CANCELLATION_READ_MODEL_PMS_SCOPE_MISMATCH");
    }
  }
  const refund = input.stripeRefund;
  if (input.refundRequired && !refund) blockers.push("STRIPE_REFUND_NOT_SUCCEEDED");
  if (!input.refundRequired && refund) {
    throw new Error("HOTEL_CANCELLATION_READ_MODEL_UNEXPECTED_REFUND");
  }
  if (refund) {
    requireHash(refund.sha256, "HOTEL_CANCELLATION_READ_MODEL_REFUND_INVALID");
    if (!authority || refund.cancellationAuthorityId !== authority.cancellationAuthorityId ||
      refund.tenantId !== input.tenantId || refund.status !== "succeeded") {
      throw new Error("HOTEL_CANCELLATION_READ_MODEL_REFUND_SCOPE_MISMATCH");
    }
  }
  const finalization = input.finalization;
  if (!finalization) blockers.push("FINALIZATION_PLAN_NOT_PERSISTED");
  else {
    requireHash(finalization.sha256, "HOTEL_CANCELLATION_READ_MODEL_FINALIZATION_INVALID");
    if (!authority || !pms || finalization.cancellationAuthorityId !== authority.cancellationAuthorityId ||
      finalization.pmsConfirmationReceiptId !== pms.confirmationReceiptId ||
      finalization.stripeRefundProviderReceiptId !== (refund?.refundProviderReceiptId ?? null) ||
      finalization.state !== "eligible-not-applied") {
      throw new Error("HOTEL_CANCELLATION_READ_MODEL_FINALIZATION_SCOPE_MISMATCH");
    }
  }
  const application = input.application;
  if (!application) blockers.push("CANCELLATION_APPLICATION_NOT_PERSISTED");
  else {
    requireHash(application.sha256, "HOTEL_CANCELLATION_READ_MODEL_APPLICATION_INVALID");
    if (!finalization || application.finalizationPlanId !== finalization.finalizationPlanId ||
      application.state !== "applied-by-verified-transaction" || !application.inventoryReleased ||
      !application.revenueReversed || !application.bookingCanceled) {
      throw new Error("HOTEL_CANCELLATION_READ_MODEL_APPLICATION_SCOPE_MISMATCH");
    }
  }
  const consequences = input.consequences;
  if (!consequences) blockers.push("CONSEQUENCE_SET_NOT_PERSISTED");
  else {
    if (consequences.length !== 3 || consequences.some((row, index) => row.target !== TARGETS[index])) {
      throw new Error("HOTEL_CANCELLATION_READ_MODEL_CONSEQUENCE_SET_INVALID");
    }
    for (const row of consequences) {
      if (row.state !== "acknowledged") blockers.push(`TARGET_NOT_ACKNOWLEDGED:${row.target}:${row.state}`);
      if (row.state === "acknowledged") {
        if (!row.acknowledgementSha256) throw new Error("HOTEL_CANCELLATION_READ_MODEL_ACK_REQUIRED");
        requireHash(row.acknowledgementSha256, "HOTEL_CANCELLATION_READ_MODEL_ACK_INVALID");
      } else if (row.acknowledgementSha256 !== null) {
        throw new Error("HOTEL_CANCELLATION_READ_MODEL_PREMATURE_ACK");
      }
    }
  }
  const technicalComplete = blockers.length === 0;
  return Object.freeze({
    contractVersion: HOTEL_CANCELLATION_LIFECYCLE_READ_MODEL_VERSION,
    tenantId: input.tenantId,
    finalBookingReceiptId: input.finalBookingReceiptId,
    overallState: technicalComplete
      ? ("TECHNICALLY_ACKNOWLEDGED" as const)
      : input.migrationChain.applied === 0
        ? ("SOURCE_ONLY_UNAPPLIED" as const)
        : ("PARTIAL_BLOCKED" as const),
    technicalComplete,
    blockers: Object.freeze(blockers),
    targetMatrix: Object.freeze(TARGETS.map((target) => {
      const row = consequences?.find((entry) => entry.target === target);
      return Object.freeze({target, state: row?.state ?? "missing", acknowledged: row?.state === "acknowledged"});
    })),
    externalActionAuthorized: false as const,
    payoutAuthorized: false as const,
    formalActionAuthorized: false as const,
    formal: Object.freeze({
      clubsBlocksComplete: 60,
      clubsBlocksTotal: 120,
      completionPercent: 50.0,
      cclub061: "ACTIVE/BLOCKED" as const,
      cclub063Activated: false as const,
      ncrv2_130: "0/14" as const,
      readiness: Object.freeze({technical: 10, partial: 2, blocked: 2}),
    }),
  });
}
