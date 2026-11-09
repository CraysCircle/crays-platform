import { createHash } from "node:crypto";

export type SimulatedPaymentLifecycleStatus = "PROCESSING" | "REQUIRES_ACTION" | "SUCCEEDED";

export interface SimulatedPaymentEvent {
  providerEventId: string;
  providerEventSha256: string;
  logicalBookingKey: string;
  paymentCorrelationKey: string;
  accountingPayloadSha256: string;
  status: SimulatedPaymentLifecycleStatus;
  occurredAt: string;
}

export interface SimulatedAccountingCommand {
  logicalConsequenceKey: string;
  logicalBookingKey: string;
  paymentCorrelationKey: string;
  accountingPayloadSha256: string;
  attemptNumber: number;
  leaseToken: string;
}

interface LogicalAccountingConsequence {
  logicalConsequenceKey: string;
  logicalBookingKey: string;
  paymentCorrelationKey: string;
  accountingPayloadSha256: string;
  state: "PENDING" | "LEASED" | "RETRY" | "ACKNOWLEDGED";
  attemptCount: number;
  leaseToken: string | null;
  leaseExpiresAt: number | null;
  acknowledgementSha256: string | null;
}

const SHA256 = /^[0-9a-f]{64}$/;

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`HOTEL_ACCOUNTING_CHAOS_${field}_REQUIRED`);
  return normalized;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class HotelAccountingConsequenceChaosHarness {
  readonly #providerEvents = new Map<string, string>();
  #consequence: LogicalAccountingConsequence | null = null;
  #clockMs: number;

  constructor(startAt = "2026-08-25T00:00:00.000Z") {
    this.#clockMs = Date.parse(startAt);
    if (!Number.isFinite(this.#clockMs)) throw new Error("HOTEL_ACCOUNTING_CHAOS_START_TIME_INVALID");
  }

  advanceClock(milliseconds: number): void {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
      throw new Error("HOTEL_ACCOUNTING_CHAOS_CLOCK_ADVANCE_INVALID");
    }
    this.#clockMs += milliseconds;
  }

  ingestPaymentEvent(event: SimulatedPaymentEvent):
    | "NON_TERMINAL_RECORDED"
    | "PAYMENT_EVENT_REPLAY"
    | "CONSEQUENCE_CREATED"
    | "CONSEQUENCE_ALREADY_EXISTS" {
    required(event.providerEventId, "PROVIDER_EVENT_ID");
    required(event.logicalBookingKey, "LOGICAL_BOOKING_KEY");
    required(event.paymentCorrelationKey, "PAYMENT_CORRELATION_KEY");
    if (!SHA256.test(event.providerEventSha256) || !SHA256.test(event.accountingPayloadSha256)) {
      throw new Error("HOTEL_ACCOUNTING_CHAOS_EVENT_HASH_INVALID");
    }
    if (!Number.isFinite(Date.parse(event.occurredAt))) {
      throw new Error("HOTEL_ACCOUNTING_CHAOS_OCCURRED_AT_INVALID");
    }
    const priorEventHash = this.#providerEvents.get(event.providerEventId);
    if (priorEventHash) {
      if (priorEventHash !== event.providerEventSha256) {
        throw new Error("HOTEL_ACCOUNTING_CHAOS_PROVIDER_EVENT_REPLAY_CONFLICT");
      }
      return "PAYMENT_EVENT_REPLAY";
    }
    if (event.status !== "SUCCEEDED") {
      this.#providerEvents.set(event.providerEventId, event.providerEventSha256);
      return "NON_TERMINAL_RECORDED";
    }

    const logicalConsequenceKey = `accounting:${event.logicalBookingKey}:${event.paymentCorrelationKey}`;
    if (!this.#consequence) {
      this.#providerEvents.set(event.providerEventId, event.providerEventSha256);
      this.#consequence = {
        logicalConsequenceKey,
        logicalBookingKey: event.logicalBookingKey,
        paymentCorrelationKey: event.paymentCorrelationKey,
        accountingPayloadSha256: event.accountingPayloadSha256,
        state: "PENDING",
        attemptCount: 0,
        leaseToken: null,
        leaseExpiresAt: null,
        acknowledgementSha256: null,
      };
      return "CONSEQUENCE_CREATED";
    }
    if (
      this.#consequence.logicalConsequenceKey !== logicalConsequenceKey ||
      this.#consequence.accountingPayloadSha256 !== event.accountingPayloadSha256
    ) {
      throw new Error("HOTEL_ACCOUNTING_CHAOS_LOGICAL_CONSEQUENCE_CONFLICT");
    }
    this.#providerEvents.set(event.providerEventId, event.providerEventSha256);
    return "CONSEQUENCE_ALREADY_EXISTS";
  }

  claim(leaseMilliseconds = 30_000): SimulatedAccountingCommand | null {
    const consequence = this.#consequence;
    if (!consequence || consequence.state === "ACKNOWLEDGED") return null;
    if (!Number.isSafeInteger(leaseMilliseconds) || leaseMilliseconds < 1) {
      throw new Error("HOTEL_ACCOUNTING_CHAOS_LEASE_INVALID");
    }
    if (consequence.state === "LEASED" && (consequence.leaseExpiresAt ?? Infinity) > this.#clockMs) return null;
    consequence.attemptCount += 1;
    consequence.state = "LEASED";
    consequence.leaseToken = hash(`${consequence.logicalConsequenceKey}:lease:${consequence.attemptCount}`);
    consequence.leaseExpiresAt = this.#clockMs + leaseMilliseconds;
    return {
      logicalConsequenceKey: consequence.logicalConsequenceKey,
      logicalBookingKey: consequence.logicalBookingKey,
      paymentCorrelationKey: consequence.paymentCorrelationKey,
      accountingPayloadSha256: consequence.accountingPayloadSha256,
      attemptNumber: consequence.attemptCount,
      leaseToken: consequence.leaseToken,
    };
  }

  recordErpUnavailable(command: SimulatedAccountingCommand): void {
    const consequence = this.#requireMatchingLease(command);
    consequence.state = "RETRY";
    consequence.leaseToken = null;
    consequence.leaseExpiresAt = null;
  }

  acknowledge(input: {
    command: SimulatedAccountingCommand;
    logicalConsequenceKey: string;
    accountingPayloadSha256: string;
    acknowledgementSha256: string;
  }): "ACKNOWLEDGED" | "ACKNOWLEDGEMENT_REPLAY" {
    const consequence = this.#consequence;
    if (!consequence) throw new Error("HOTEL_ACCOUNTING_CHAOS_CONSEQUENCE_MISSING");
    if (!SHA256.test(input.acknowledgementSha256)) {
      throw new Error("HOTEL_ACCOUNTING_CHAOS_ACK_HASH_INVALID");
    }
    if (consequence.state === "ACKNOWLEDGED") {
      if (
        consequence.logicalConsequenceKey !== input.logicalConsequenceKey ||
        consequence.accountingPayloadSha256 !== input.accountingPayloadSha256 ||
        consequence.acknowledgementSha256 !== input.acknowledgementSha256
      ) throw new Error("HOTEL_ACCOUNTING_CHAOS_ACK_REPLAY_CONFLICT");
      return "ACKNOWLEDGEMENT_REPLAY";
    }
    this.#requireMatchingLease(input.command);
    if (
      consequence.logicalConsequenceKey !== input.logicalConsequenceKey ||
      consequence.accountingPayloadSha256 !== input.accountingPayloadSha256
    ) throw new Error("HOTEL_ACCOUNTING_CHAOS_ACK_CORRELATION_MISMATCH");
    consequence.state = "ACKNOWLEDGED";
    consequence.acknowledgementSha256 = input.acknowledgementSha256;
    consequence.leaseToken = null;
    consequence.leaseExpiresAt = null;
    return "ACKNOWLEDGED";
  }

  snapshot(): Readonly<{
    providerEventCount: number;
    logicalConsequenceCount: number;
    acknowledgementCount: number;
    state: LogicalAccountingConsequence["state"] | "ABSENT";
    logicalConsequenceKey: string | null;
    accountingPayloadSha256: string | null;
    attemptCount: number;
  }> {
    return Object.freeze({
      providerEventCount: this.#providerEvents.size,
      logicalConsequenceCount: this.#consequence ? 1 : 0,
      acknowledgementCount: this.#consequence?.acknowledgementSha256 ? 1 : 0,
      state: this.#consequence?.state ?? "ABSENT",
      logicalConsequenceKey: this.#consequence?.logicalConsequenceKey ?? null,
      accountingPayloadSha256: this.#consequence?.accountingPayloadSha256 ?? null,
      attemptCount: this.#consequence?.attemptCount ?? 0,
    });
  }

  #requireMatchingLease(command: SimulatedAccountingCommand): LogicalAccountingConsequence {
    const consequence = this.#consequence;
    if (
      !consequence ||
      consequence.state !== "LEASED" ||
      consequence.leaseToken !== command.leaseToken ||
      consequence.logicalConsequenceKey !== command.logicalConsequenceKey ||
      consequence.accountingPayloadSha256 !== command.accountingPayloadSha256
    ) throw new Error("HOTEL_ACCOUNTING_CHAOS_LEASE_OR_COMMAND_MISMATCH");
    return consequence;
  }
}
