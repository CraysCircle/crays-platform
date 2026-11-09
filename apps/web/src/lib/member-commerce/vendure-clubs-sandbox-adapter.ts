import "server-only";

import { createHash } from "node:crypto";

import {
  executeVendureOrderDispatch,
  type VendureOrderDispatchExecutionResult,
  type VendureOrderTransport,
  type VendureOrderTransportResult,
} from "./vendure-order-dispatch";
import {
  VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT,
  type VendureClubsSandboxAdapterConfiguration,
  type VendureClubsSandboxDispatchEnvelope,
  type VendureClubsSandboxProviderObservation,
  type VendureClubsSandboxReadinessProjection,
} from "./vendure-clubs-sandbox-adapter-contract";

const HASH = /^[a-f0-9]{64}$/;
const LEASE = /^[A-Za-z0-9:_-]{8,256}$/;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("VENDURE_CLUBS_SANDBOX_CANONICAL_VALUE_INVALID");
  return serialized;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function exactInstant(value: string): boolean {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function assertSandboxConfiguration(
  configuration: VendureClubsSandboxAdapterConfiguration,
): void {
  if (
    configuration.environment !== "TEST" ||
    configuration.sandbox !== true ||
    configuration.livemode !== false ||
    configuration.production !== false
  ) throw new Error("VENDURE_CLUBS_SANDBOX_CONFIGURATION_FORBIDDEN");
}

function readiness(
  status: VendureClubsSandboxReadinessProjection["status"],
): VendureClubsSandboxReadinessProjection {
  return Object.freeze({
    schema: VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT.schema,
    version: VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT.version,
    status,
    environment: "TEST",
    sandboxOnly: true,
    livemode: false,
    production: false,
    deliveryClaimed: false,
    containsPersonalData: false,
    exposesIdentifiers: false,
    exposesSecrets: false,
    exposesCounts: false,
  });
}

export function readVendureClubsSandboxReadiness(
  configuration?: VendureClubsSandboxAdapterConfiguration,
): VendureClubsSandboxReadinessProjection {
  if (!configuration) return readiness("provider_not_bound");
  assertSandboxConfiguration(configuration);
  if (!configuration.client) return readiness("provider_not_bound");
  if (!configuration.endpointConfigured || !configuration.credentialsConfigured) {
    return readiness("configuration_incomplete");
  }
  return readiness("sandbox_ready");
}

function dispatchBindingSha256(envelope: VendureClubsSandboxDispatchEnvelope): string {
  const { command } = envelope;
  if (
    !HASH.test(command.commandSha256) ||
    !HASH.test(command.sourcePayloadSha256) ||
    !command.idempotencyKey.trim() ||
    !Number.isSafeInteger(envelope.attemptNumber) ||
    envelope.attemptNumber < 1 ||
    !LEASE.test(envelope.claimToken) ||
    !LEASE.test(envelope.leaseVersion) ||
    envelope.claimToken !== envelope.leaseVersion
  ) throw new Error("VENDURE_CLUBS_SANDBOX_DISPATCH_BINDING_INVALID");
  return digest({
    commandSha256: command.commandSha256,
    sourcePayloadSha256: command.sourcePayloadSha256,
    idempotencyKey: command.idempotencyKey,
    sourceOutboxEventId: command.sourceOutboxEventId,
    orderSnapshotId: command.orderSnapshotId,
    attemptNumber: envelope.attemptNumber,
    claimToken: envelope.claimToken,
    leaseVersion: envelope.leaseVersion,
  });
}

function mapObservation(
  envelope: VendureClubsSandboxDispatchEnvelope,
  bindingSha256: string,
  observation: VendureClubsSandboxProviderObservation,
): VendureOrderTransportResult {
  if (
    observation.environment !== "TEST" ||
    observation.sandbox !== true ||
    observation.livemode !== false ||
    observation.production !== false ||
    observation.dispatchBindingSha256 !== bindingSha256 ||
    !exactInstant(observation.observedAt)
  ) throw new Error("VENDURE_CLUBS_SANDBOX_OBSERVATION_INVALID");

  const base = {
    commandSha256: envelope.command.commandSha256,
    idempotencyKey: envelope.command.idempotencyKey,
    observedAt: observation.observedAt,
  };
  if (observation.outcome === "delivered") {
    if (
      !observation.providerOrderId.trim() ||
      !HASH.test(observation.providerObjectSha256) ||
      !HASH.test(observation.providerAckSha256) ||
      !HASH.test(observation.providerReadbackSha256)
    ) throw new Error("VENDURE_CLUBS_SANDBOX_ACK_READBACK_INVALID");
    return {
      ...base,
      outcome: "DELIVERED",
      providerOrderId: observation.providerOrderId,
      providerResponseSha256: observation.providerReadbackSha256,
      providerObjectSha256: observation.providerObjectSha256,
      providerAckSha256: observation.providerAckSha256,
      providerReadbackSha256: observation.providerReadbackSha256,
      retryEvidenceKind: null,
      retryEvidenceSha256: null,
      unknownOutcomeEvidenceSha256: null,
    };
  }
  if (observation.outcome === "confirmed_not_applied") {
    if (!HASH.test(observation.retryEvidenceSha256)) {
      throw new Error("VENDURE_CLUBS_SANDBOX_RETRY_EVIDENCE_INVALID");
    }
    return {
      ...base,
      outcome: "FAILED_RETRYABLE",
      providerOrderId: null,
      providerResponseSha256: observation.retryEvidenceSha256,
      providerObjectSha256: null,
      providerAckSha256: null,
      providerReadbackSha256: null,
      retryEvidenceKind: observation.retryEvidenceKind,
      retryEvidenceSha256: observation.retryEvidenceSha256,
      unknownOutcomeEvidenceSha256: null,
    };
  }
  if (!HASH.test(observation.unknownOutcomeEvidenceSha256)) {
    throw new Error("VENDURE_CLUBS_SANDBOX_UNKNOWN_EVIDENCE_INVALID");
  }
  return {
    ...base,
    outcome: "UNKNOWN_RECONCILIATION_REQUIRED",
    providerOrderId: null,
    providerResponseSha256: observation.unknownOutcomeEvidenceSha256,
    providerObjectSha256: null,
    providerAckSha256: null,
    providerReadbackSha256: null,
    retryEvidenceKind: null,
    retryEvidenceSha256: null,
    unknownOutcomeEvidenceSha256: observation.unknownOutcomeEvidenceSha256,
  };
}

export type VendureClubsSandboxAdapterExecutionResult = Readonly<{
  readiness: VendureClubsSandboxReadinessProjection;
  dispatchBindingSha256: string;
  dispatch: VendureOrderDispatchExecutionResult;
  providerCallPerformed: boolean;
  databaseWritePerformed: false;
  receiptPersistenceRequired: boolean;
  productionApplied: false;
}>;

export function createVendureClubsSandboxAdapter(
  configuration: VendureClubsSandboxAdapterConfiguration,
) {
  assertSandboxConfiguration(configuration);
  const currentReadiness = readVendureClubsSandboxReadiness(configuration);
  return Object.freeze({
    readiness: () => currentReadiness,
    async dispatch(
      envelope: VendureClubsSandboxDispatchEnvelope,
    ): Promise<VendureClubsSandboxAdapterExecutionResult> {
      const bindingSha256 = dispatchBindingSha256(envelope);
      if (currentReadiness.status !== "sandbox_ready" || !configuration.client) {
        const dispatch = await executeVendureOrderDispatch(envelope.command);
        return Object.freeze({
          readiness: currentReadiness,
          dispatchBindingSha256: bindingSha256,
          dispatch,
          providerCallPerformed: false,
          databaseWritePerformed: false,
          receiptPersistenceRequired: false,
          productionApplied: false,
        });
      }
      const transport: VendureOrderTransport = {
        send: async () =>
          mapObservation(
            envelope,
            bindingSha256,
            await configuration.client!.send({
              command: envelope.command,
              attemptNumber: envelope.attemptNumber,
              claimToken: envelope.claimToken,
              leaseVersion: envelope.leaseVersion,
              dispatchBindingSha256: bindingSha256,
            }),
          ),
      };
      const dispatch = await executeVendureOrderDispatch(envelope.command, transport);
      return Object.freeze({
        readiness: currentReadiness,
        dispatchBindingSha256: bindingSha256,
        dispatch,
        providerCallPerformed: dispatch.providerCallPerformed,
        databaseWritePerformed: false,
        receiptPersistenceRequired: dispatch.receipt !== null,
        productionApplied: false,
      });
    },
  });
}
