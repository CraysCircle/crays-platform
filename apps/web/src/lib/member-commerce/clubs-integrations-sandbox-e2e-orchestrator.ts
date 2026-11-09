import "server-only";

import { createHash } from "node:crypto";

export const CCLUB_T6_SANDBOX_MARKER =
  "CCLUB_T6_SANDBOX_ONLY_NO_EXTERNAL_EXECUTION" as const;

export const CCLUB_T6_READ_ONLY_CONTRACTS = [
  "src/lib/member-commerce/forest-city-hospitality-vendure-final-booking-link-repository.ts",
  "src/lib/member-commerce/booking-revenue-to-erp-enqueue-bridge.ts",
  "src/lib/member-commerce/booking-revenue-erp-sequence-orchestrator.ts",
  "src/lib/member-commerce/hotel-twenty-crm-summary-outbox-repository.ts",
  "src/lib/member-commerce/hotel-plane-exception-work-outbox-repository.ts",
  "scripts/CCLUB_PHASE9_HOTEL_VENDURE_FINAL_BOOKING_LINK_DRY_RUN_V1_2026_08_25.mts",
  "scripts/CCLUB_PHASE9_BOOKING_REVENUE_TO_ERP_ENQUEUE_BRIDGE_DRY_RUN_V1_2026_08_25.mts",
  "scripts/CCLUB_PHASE9_HOTEL_TWENTY_CRM_SUMMARY_DRY_RUN_V1_2026_08_25.mts",
  "scripts/CCLUB_PHASE9_HOTEL_PLANE_EXCEPTION_WORK_DRY_RUN_V1_2026_08_25.mts",
] as const;

export type ClubsIntegrationSandboxState =
  | "source_ready"
  | "provider_not_bound"
  | "unknown_outcome"
  | "reconciled";

export type ClubsIntegrationProviderLane = "VENDURE" | "PMS" | "ERP" | "CRM" | "PLANE";

export type ClubsIntegrationSandboxEvent = Readonly<{
  sequence: number;
  state: ClubsIntegrationSandboxState;
  providerLane: ClubsIntegrationProviderLane | null;
  idempotencyKey: string;
  payloadSha256: string;
  correlationSha256: string | null;
  resolution: "NOT_DELIVERED_PROVIDER_NOT_BOUND" | null;
  previousEventSha256: string | null;
  eventSha256: string;
  observedAt: string;
}>;

export type ClubsIntegrationSandboxTrace = Readonly<{
  schemaVersion: "crays.clubs.integrations-sandbox-trace.v1";
  traceId: string;
  sandboxMarker: typeof CCLUB_T6_SANDBOX_MARKER;
  state: ClubsIntegrationSandboxState;
  sourceContractSha256s: Readonly<Record<string, string>>;
  events: readonly ClubsIntegrationSandboxEvent[];
  passDiscipline: Readonly<{
    SOURCE_PASS: true;
    PREVIEW_PASS: false;
    SANDBOX_E2E_PASS: false;
    PRODUCTION_PASS: false;
  }>;
  executionBoundary: Readonly<{
    providerCallPerformed: false;
    providerAcknowledgementClaimed: false;
    networkCallPerformed: false;
    databaseConnectionOpened: false;
    databaseMutated: false;
    stripeMutated: false;
    productionMutated: false;
    craysProMutated: false;
    craysGymMutated: false;
    sharedProductFileMutated: false;
  }>;
}>;

export type ExternalExecutionClaims = Readonly<{
  providerCallPerformed: boolean;
  providerAcknowledgementClaimed: boolean;
  networkCallPerformed: boolean;
  databaseConnectionOpened: boolean;
  databaseMutated: boolean;
  stripeMutated: boolean;
  productionMutated: boolean;
}>;

const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const ORDER: readonly ClubsIntegrationSandboxState[] = [
  "source_ready",
  "provider_not_bound",
  "unknown_outcome",
  "reconciled",
];

function reject(code: string): never {
  throw new Error(`CCLUB_T6_SANDBOX_${code}`);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashClubsIntegrationSandboxEvidence(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function instant(value: string): string {
  if (!Number.isFinite(Date.parse(value))) reject("OBSERVED_AT_INVALID");
  return new Date(value).toISOString();
}

function assertHash(value: string | null, label: string): void {
  if (value !== null && !SHA256.test(value)) reject(`${label}_INVALID`);
}

export function assertNoExternalExecutionClaims(claims: ExternalExecutionClaims): void {
  if (Object.values(claims).some(Boolean)) reject("EXTERNAL_EXECUTION_CLAIM_FORBIDDEN");
}

function eventMaterial(event: Omit<ClubsIntegrationSandboxEvent, "eventSha256">): unknown {
  return event;
}

function assertTrace(trace: ClubsIntegrationSandboxTrace): void {
  if (
    trace.schemaVersion !== "crays.clubs.integrations-sandbox-trace.v1" ||
    trace.sandboxMarker !== CCLUB_T6_SANDBOX_MARKER ||
    !SAFE_ID.test(trace.traceId)
  ) {
    reject("TRACE_HEADER_INVALID");
  }
  const paths = Object.keys(trace.sourceContractSha256s).sort();
  const expectedPaths = [...CCLUB_T6_READ_ONLY_CONTRACTS].sort();
  if (canonical(paths) !== canonical(expectedPaths)) reject("SOURCE_CONTRACT_SET_INVALID");
  for (const hash of Object.values(trace.sourceContractSha256s)) assertHash(hash, "SOURCE_HASH");
  assertNoExternalExecutionClaims(trace.executionBoundary);
  if (
    !trace.passDiscipline.SOURCE_PASS ||
    trace.passDiscipline.PREVIEW_PASS ||
    trace.passDiscipline.SANDBOX_E2E_PASS ||
    trace.passDiscipline.PRODUCTION_PASS
  ) {
    reject("PASS_DISCIPLINE_INVALID");
  }
  if (trace.events.length < 1 || trace.events.length > ORDER.length) reject("EVENT_COUNT_INVALID");
  let previous: string | null = null;
  for (const [index, event] of trace.events.entries()) {
    if (event.sequence !== index + 1 || event.state !== ORDER[index]) reject("EVENT_ORDER_INVALID");
    if (!SAFE_ID.test(event.idempotencyKey)) reject("IDEMPOTENCY_KEY_INVALID");
    assertHash(event.payloadSha256, "PAYLOAD_SHA256");
    assertHash(event.correlationSha256, "CORRELATION_SHA256");
    if (event.previousEventSha256 !== previous) reject("EVENT_CHAIN_INVALID");
    const material: Omit<ClubsIntegrationSandboxEvent, "eventSha256"> = {
      sequence: event.sequence,
      state: event.state,
      providerLane: event.providerLane,
      idempotencyKey: event.idempotencyKey,
      payloadSha256: event.payloadSha256,
      correlationSha256: event.correlationSha256,
      resolution: event.resolution,
      previousEventSha256: event.previousEventSha256,
      observedAt: event.observedAt,
    };
    const computed = hashClubsIntegrationSandboxEvidence(eventMaterial(material));
    if (computed !== event.eventSha256) reject("EVENT_HASH_INVALID");
    previous = event.eventSha256;
  }
  if (trace.state !== trace.events.at(-1)?.state) reject("TRACE_STATE_INVALID");
  const providerEvent = trace.events.find((event) => event.state === "provider_not_bound");
  for (const event of trace.events) {
    if (event.state === "source_ready") {
      if (event.providerLane || event.correlationSha256 || event.resolution) reject("SOURCE_EVENT_INVALID");
    } else if (!event.providerLane || event.providerLane !== providerEvent?.providerLane) {
      reject("PROVIDER_LANE_DRIFT");
    }
    if (event.state === "unknown_outcome" && !event.correlationSha256) {
      reject("UNKNOWN_CORRELATION_REQUIRED");
    }
    if (event.state === "reconciled") {
      const unknown = trace.events.find((entry) => entry.state === "unknown_outcome");
      if (
        event.correlationSha256 !== unknown?.correlationSha256 ||
        event.resolution !== "NOT_DELIVERED_PROVIDER_NOT_BOUND"
      ) {
        reject("RECONCILIATION_INVALID");
      }
    } else if (event.resolution !== null) {
      reject("EARLY_RESOLUTION_FORBIDDEN");
    }
  }
}

function appendEvent(
  trace: ClubsIntegrationSandboxTrace,
  input: Readonly<{
    state: Exclude<ClubsIntegrationSandboxState, "source_ready">;
    providerLane: ClubsIntegrationProviderLane;
    idempotencyKey: string;
    payloadSha256: string;
    correlationSha256: string | null;
    resolution: "NOT_DELIVERED_PROVIDER_NOT_BOUND" | null;
    observedAt: string;
  }>,
): Readonly<{ trace: ClubsIntegrationSandboxTrace; replayed: boolean }> {
  assertTrace(trace);
  if (!SAFE_ID.test(input.idempotencyKey)) reject("IDEMPOTENCY_KEY_INVALID");
  assertHash(input.payloadSha256, "PAYLOAD_SHA256");
  assertHash(input.correlationSha256, "CORRELATION_SHA256");
  const existing = trace.events.find((event) => event.idempotencyKey === input.idempotencyKey);
  if (existing) {
    const exact =
      existing.state === input.state &&
      existing.providerLane === input.providerLane &&
      existing.payloadSha256 === input.payloadSha256 &&
      existing.correlationSha256 === input.correlationSha256 &&
      existing.resolution === input.resolution;
    if (!exact) reject("IDEMPOTENCY_CONFLICT");
    return Object.freeze({ trace, replayed: true });
  }
  const expectedState = ORDER[trace.events.length];
  if (expectedState !== input.state) reject("TRANSITION_INVALID");
  const provider = trace.events.find((event) => event.state === "provider_not_bound")?.providerLane;
  if (provider && provider !== input.providerLane) reject("PROVIDER_LANE_DRIFT");
  if (input.state === "unknown_outcome" && !input.correlationSha256) {
    reject("UNKNOWN_CORRELATION_REQUIRED");
  }
  if (input.state === "reconciled") {
    const unknown = trace.events.find((event) => event.state === "unknown_outcome");
    if (
      input.correlationSha256 !== unknown?.correlationSha256 ||
      input.resolution !== "NOT_DELIVERED_PROVIDER_NOT_BOUND"
    ) {
      reject("RECONCILIATION_INVALID");
    }
  } else if (input.resolution !== null) {
    reject("EARLY_RESOLUTION_FORBIDDEN");
  }
  const material: Omit<ClubsIntegrationSandboxEvent, "eventSha256"> = {
    sequence: trace.events.length + 1,
    state: input.state,
    providerLane: input.providerLane,
    idempotencyKey: input.idempotencyKey,
    payloadSha256: input.payloadSha256,
    correlationSha256: input.correlationSha256,
    resolution: input.resolution,
    previousEventSha256: trace.events.at(-1)?.eventSha256 ?? null,
    observedAt: instant(input.observedAt),
  };
  const event = Object.freeze({
    ...material,
    eventSha256: hashClubsIntegrationSandboxEvidence(eventMaterial(material)),
  });
  const next = Object.freeze({
    ...trace,
    state: input.state,
    events: Object.freeze([...trace.events, event]),
  });
  assertTrace(next);
  return Object.freeze({ trace: next, replayed: false });
}

export function createClubsIntegrationSandboxTrace(input: Readonly<{
  traceId: string;
  sandboxMarker: typeof CCLUB_T6_SANDBOX_MARKER;
  sourceContractSha256s: Readonly<Record<string, string>>;
  observedAt: string;
}>): ClubsIntegrationSandboxTrace {
  if (input.sandboxMarker !== CCLUB_T6_SANDBOX_MARKER || !SAFE_ID.test(input.traceId)) {
    reject("TRACE_HEADER_INVALID");
  }
  const payloadSha256 = hashClubsIntegrationSandboxEvidence(input.sourceContractSha256s);
  const material: Omit<ClubsIntegrationSandboxEvent, "eventSha256"> = {
    sequence: 1,
    state: "source_ready",
    providerLane: null,
    idempotencyKey: `source-ready:${input.traceId}`,
    payloadSha256,
    correlationSha256: null,
    resolution: null,
    previousEventSha256: null,
    observedAt: instant(input.observedAt),
  };
  const trace = Object.freeze({
    schemaVersion: "crays.clubs.integrations-sandbox-trace.v1" as const,
    traceId: input.traceId,
    sandboxMarker: CCLUB_T6_SANDBOX_MARKER,
    state: "source_ready" as const,
    sourceContractSha256s: Object.freeze({ ...input.sourceContractSha256s }),
    events: Object.freeze([
      Object.freeze({
        ...material,
        eventSha256: hashClubsIntegrationSandboxEvidence(eventMaterial(material)),
      }),
    ]),
    passDiscipline: Object.freeze({
      SOURCE_PASS: true as const,
      PREVIEW_PASS: false as const,
      SANDBOX_E2E_PASS: false as const,
      PRODUCTION_PASS: false as const,
    }),
    executionBoundary: Object.freeze({
      providerCallPerformed: false as const,
      providerAcknowledgementClaimed: false as const,
      networkCallPerformed: false as const,
      databaseConnectionOpened: false as const,
      databaseMutated: false as const,
      stripeMutated: false as const,
      productionMutated: false as const,
      craysProMutated: false as const,
      craysGymMutated: false as const,
      sharedProductFileMutated: false as const,
    }),
  });
  assertTrace(trace);
  return trace;
}

export function recordClubsIntegrationProviderNotBound(
  trace: ClubsIntegrationSandboxTrace,
  input: Readonly<{
    providerLane: ClubsIntegrationProviderLane;
    idempotencyKey: string;
    boundaryEvidenceSha256: string;
    observedAt: string;
  }>,
) {
  return appendEvent(trace, {
    state: "provider_not_bound",
    providerLane: input.providerLane,
    idempotencyKey: input.idempotencyKey,
    payloadSha256: input.boundaryEvidenceSha256,
    correlationSha256: null,
    resolution: null,
    observedAt: input.observedAt,
  });
}

export function recordClubsIntegrationUnknownOutcome(
  trace: ClubsIntegrationSandboxTrace,
  input: Readonly<{
    providerLane: ClubsIntegrationProviderLane;
    idempotencyKey: string;
    simulatedAttemptSha256: string;
    correlationSha256: string;
    observedAt: string;
  }>,
) {
  return appendEvent(trace, {
    state: "unknown_outcome",
    providerLane: input.providerLane,
    idempotencyKey: input.idempotencyKey,
    payloadSha256: input.simulatedAttemptSha256,
    correlationSha256: input.correlationSha256,
    resolution: null,
    observedAt: input.observedAt,
  });
}

export function reconcileClubsIntegrationUnknownOutcome(
  trace: ClubsIntegrationSandboxTrace,
  input: Readonly<{
    providerLane: ClubsIntegrationProviderLane;
    idempotencyKey: string;
    localReceiptSha256: string;
    correlationSha256: string;
    outcome: "NOT_DELIVERED_PROVIDER_NOT_BOUND";
    observedAt: string;
  }>,
) {
  return appendEvent(trace, {
    state: "reconciled",
    providerLane: input.providerLane,
    idempotencyKey: input.idempotencyKey,
    payloadSha256: input.localReceiptSha256,
    correlationSha256: input.correlationSha256,
    resolution: input.outcome,
    observedAt: input.observedAt,
  });
}

export function verifyClubsIntegrationSandboxTrace(trace: ClubsIntegrationSandboxTrace): Readonly<{
  traceSha256: string;
  state: ClubsIntegrationSandboxState;
}> {
  assertTrace(trace);
  return Object.freeze({
    traceSha256: hashClubsIntegrationSandboxEvidence(trace),
    state: trace.state,
  });
}
