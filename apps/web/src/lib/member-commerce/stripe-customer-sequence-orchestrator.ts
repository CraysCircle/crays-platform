import "server-only";

import { prepareStripeCustomerProviderResultFinalization, type StripeCustomerProviderResultFinalizationEnvelope } from "./stripe-customer-provider-result-finalization-envelope";
import { normalizeStripeCustomerAdapterResult, type NormalizedStripeCustomerAdapterResult, type RawStripeCustomerAdapterResult } from "./stripe-customer-provider-result-normalizer";
import type { StripeCustomerProviderAdapterPreflight } from "./stripe-customer-provider-adapter-preflight";
import type { ClaimedStripeCustomerCreateCommand } from "./stripe-customer-create-command-worker";
import type { PersistedStripeCustomerProviderResult } from "./stripe-customer-provider-result-finalization-repository";
import type { PersistedStripeCustomerProviderFailure } from "./stripe-customer-provider-failure-repository";

export interface StripeCustomerProviderAdapter { execute(preflight: StripeCustomerProviderAdapterPreflight): Promise<RawStripeCustomerAdapterResult>; }
export interface StripeCustomerSuccessPersistence { persist(envelope: StripeCustomerProviderResultFinalizationEnvelope): Promise<PersistedStripeCustomerProviderResult>; }
export interface StripeCustomerFailurePersistence { persist(failure: Exclude<NormalizedStripeCustomerAdapterResult, { kind: "ACCEPTED" }>): Promise<PersistedStripeCustomerProviderFailure>; }
export type StripeCustomerSequenceOutcome = Readonly<{ kind: "ACCEPTED"; persisted: PersistedStripeCustomerProviderResult }> | Readonly<{ kind: "RETRYABLE_ERROR" | "TERMINAL_ERROR"; persisted: PersistedStripeCustomerProviderFailure }>;

export class StripeCustomerSequenceOrchestrator {
  constructor(private readonly adapter: StripeCustomerProviderAdapter, private readonly success: StripeCustomerSuccessPersistence, private readonly failure: StripeCustomerFailurePersistence) {}
  async execute(input: Readonly<{ claimedCommand: ClaimedStripeCustomerCreateCommand; preflight: StripeCustomerProviderAdapterPreflight; preparedAt: string }>): Promise<StripeCustomerSequenceOutcome> {
    const { claimedCommand: claim, preflight } = input;
    if (preflight.state !== "READY_FOR_SEPARATELY_AUTHORIZED_PROVIDER_ADAPTER_EXECUTION") throw new Error("CCLUB_STRIPE_SEQUENCE_PREFLIGHT_NOT_READY");
    const pairs: readonly [string | number, string | number, string][] = [[preflight.commandId, claim.commandId, "COMMAND_ID"], [preflight.commandSha256, claim.commandSha256, "COMMAND_SHA256"], [preflight.stripeAccountScopeSha256, claim.stripeAccountScopeSha256, "ACCOUNT_SCOPE"], [preflight.customerSubjectReferenceSha256, claim.customerSubjectReferenceSha256, "SUBJECT"], [preflight.idempotencyKeySha256, claim.idempotencyKeySha256, "IDEMPOTENCY"], [preflight.leaseOwner, claim.leaseOwner, "LEASE_OWNER"], [preflight.leaseId, claim.leaseId, "LEASE_ID"], [preflight.leaseVersion, claim.leaseVersion, "LEASE_VERSION"], [preflight.attemptNumber, claim.attemptCount, "ATTEMPT_NUMBER"]];
    for (const [actual, expected, field] of pairs) if (actual !== expected) throw new Error(`CCLUB_STRIPE_SEQUENCE_${field}_MISMATCH`);
    let raw: RawStripeCustomerAdapterResult;
    try { raw = await this.adapter.execute(preflight); } catch { throw new Error("CCLUB_STRIPE_SEQUENCE_ADAPTER_FAILED_WITHOUT_VERIFIED_RECEIPT"); }
    const normalized = normalizeStripeCustomerAdapterResult(preflight, raw);
    if (normalized.kind === "ACCEPTED") {
      const envelope = prepareStripeCustomerProviderResultFinalization({ claimedCommand: claim, verifiedResult: normalized.verifiedResult, preparedAt: input.preparedAt });
      return Object.freeze({ kind: "ACCEPTED", persisted: await this.success.persist(envelope) });
    }
    return Object.freeze({ kind: normalized.kind, persisted: await this.failure.persist(normalized) });
  }
}
