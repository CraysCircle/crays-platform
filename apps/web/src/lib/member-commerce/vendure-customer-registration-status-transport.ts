import { createHash } from "node:crypto";

export const VENDURE_REGISTRATION_STATUS_TRANSPORT_VERSION =
  "cclub-063.vendure-registration-status-transport.v1" as const;

export type VendureRegistrationProviderState =
  | "STATUS_INCONCLUSIVE"
  | "IDEMPOTENCY_KEY_ABSENT"
  | "CUSTOMER_PRESENT";

export type VendureCustomerRegistrationStatusRequest = Readonly<{
  statusRequestId: string;
  claimId: string;
  idempotencyKey: string;
  authorityPayloadHash: string;
  commandBindingId: string;
  commandBindingVersion: string;
  deploymentCell: string;
  observedAttempt: number;
  statusAttempt: number;
}>;

type ProviderEnvelope = Readonly<{
  statusRequestId: string;
  claimId: string;
  idempotencyKey: string;
  authorityPayloadHash: string;
  commandBindingId: string;
  commandBindingVersion: string;
  deploymentCell: string;
  state: VendureRegistrationProviderState;
  providerVersion: string;
  customerId: string | null;
  userId: string | null;
  providerActionId: string | null;
  providerReceiptHash: string | null;
}>;

type StatusReceiptBase = Readonly<{
  transportVersion: typeof VENDURE_REGISTRATION_STATUS_TRANSPORT_VERSION;
  statusRequestId: string;
  providerVersion: string;
  statusReceiptHash: string;
}>;

export type VendureCustomerRegistrationStatusOutcome =
  | (StatusReceiptBase &
      Readonly<{
        outcome: "UNRESOLVED";
        customerId: null;
        userId: null;
        providerActionId: null;
        providerReceiptHash: null;
      }>)
  | (StatusReceiptBase &
      Readonly<{
        outcome: "NOT_APPLIED_CONFIRMED";
        customerId: null;
        userId: null;
        providerActionId: null;
        providerReceiptHash: null;
      }>)
  | (StatusReceiptBase &
      Readonly<{
        outcome: "APPLIED_CONFIRMED";
        customerId: string;
        userId: string;
        providerActionId: string;
        providerReceiptHash: string;
      }>);

export type VendureCustomerRegistrationStatusTransport = (
  request: VendureCustomerRegistrationStatusRequest,
) => Promise<VendureCustomerRegistrationStatusOutcome>;

export type VendureCustomerRegistrationStatusTransportConfig = Readonly<{
  endpoint: string;
  username: string;
  password: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
}>;

const SHA256 = /^[a-f0-9]{64}$/i;
const STATES = new Set<VendureRegistrationProviderState>([
  "STATUS_INCONCLUSIVE",
  "IDEMPOTENCY_KEY_ABSENT",
  "CUSTOMER_PRESENT",
]);

const STATUS_QUERY = [
  "query CraysCustomerProjectionRegistrationStatus(",
  "  $input: CraysCustomerProjectionRegistrationStatusInput!",
  ") {",
  "  craysCustomerProjectionRegistrationStatus(input: $input) {",
  "    statusRequestId",
  "    claimId",
  "    idempotencyKey",
  "    authorityPayloadHash",
  "    commandBindingId",
  "    commandBindingVersion",
  "    deploymentCell",
  "    state",
  "    providerVersion",
  "    customerId",
  "    userId",
  "    providerActionId",
  "    providerReceiptHash",
  "  }",
  "}",
].join("\n");

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("VENDURE_STATUS_RESPONSE_INVALID_" + field.toUpperCase());
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return requiredString(value, field);
}

function endpointFrom(value: string): URL {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error("VENDURE_STATUS_ENDPOINT_INVALID");
  }

  const loopback =
    endpoint.protocol === "http:" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname);
  if (endpoint.protocol !== "https:" && !loopback) {
    throw new Error("VENDURE_STATUS_ENDPOINT_REQUIRES_HTTPS");
  }
  if (endpoint.username || endpoint.password) {
    throw new Error("VENDURE_STATUS_ENDPOINT_EMBEDDED_CREDENTIALS_DENIED");
  }
  return endpoint;
}

function validateRequest(
  request: VendureCustomerRegistrationStatusRequest,
): void {
  [
    request.statusRequestId,
    request.claimId,
    request.idempotencyKey,
    request.commandBindingId,
    request.commandBindingVersion,
    request.deploymentCell,
  ].forEach((value) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("VENDURE_STATUS_REQUEST_INVALID");
    }
  });

  if (!SHA256.test(request.authorityPayloadHash)) {
    throw new Error("VENDURE_STATUS_REQUEST_AUTHORITY_HASH_INVALID");
  }
  if (
    !Number.isSafeInteger(request.observedAttempt) ||
    request.observedAttempt < 1 ||
    !Number.isSafeInteger(request.statusAttempt) ||
    request.statusAttempt < 1
  ) {
    throw new Error("VENDURE_STATUS_REQUEST_ATTEMPT_INVALID");
  }
}

function parseEnvelope(value: unknown): ProviderEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("VENDURE_STATUS_RESPONSE_NOT_OBJECT");
  }

  const candidate = value as Record<string, unknown>;
  const state = requiredString(candidate.state, "state");
  if (!STATES.has(state as VendureRegistrationProviderState)) {
    throw new Error("VENDURE_STATUS_RESPONSE_STATE_UNSUPPORTED");
  }

  return Object.freeze({
    statusRequestId: requiredString(
      candidate.statusRequestId,
      "statusRequestId",
    ),
    claimId: requiredString(candidate.claimId, "claimId"),
    idempotencyKey: requiredString(
      candidate.idempotencyKey,
      "idempotencyKey",
    ),
    authorityPayloadHash: requiredString(
      candidate.authorityPayloadHash,
      "authorityPayloadHash",
    ),
    commandBindingId: requiredString(
      candidate.commandBindingId,
      "commandBindingId",
    ),
    commandBindingVersion: requiredString(
      candidate.commandBindingVersion,
      "commandBindingVersion",
    ),
    deploymentCell: requiredString(
      candidate.deploymentCell,
      "deploymentCell",
    ),
    state: state as VendureRegistrationProviderState,
    providerVersion: requiredString(
      candidate.providerVersion,
      "providerVersion",
    ),
    customerId: nullableString(candidate.customerId, "customerId"),
    userId: nullableString(candidate.userId, "userId"),
    providerActionId: nullableString(
      candidate.providerActionId,
      "providerActionId",
    ),
    providerReceiptHash: nullableString(
      candidate.providerReceiptHash,
      "providerReceiptHash",
    ),
  });
}

function validateEcho(
  envelope: ProviderEnvelope,
  request: VendureCustomerRegistrationStatusRequest,
): void {
  const bindings: ReadonlyArray<Readonly<[string, string, string]>> = [
    ["statusRequestId", envelope.statusRequestId, request.statusRequestId],
    ["claimId", envelope.claimId, request.claimId],
    ["idempotencyKey", envelope.idempotencyKey, request.idempotencyKey],
    [
      "authorityPayloadHash",
      envelope.authorityPayloadHash,
      request.authorityPayloadHash,
    ],
    [
      "commandBindingId",
      envelope.commandBindingId,
      request.commandBindingId,
    ],
    [
      "commandBindingVersion",
      envelope.commandBindingVersion,
      request.commandBindingVersion,
    ],
    ["deploymentCell", envelope.deploymentCell, request.deploymentCell],
  ];

  for (const [field, actual, expected] of bindings) {
    if (actual !== expected) {
      throw new Error("VENDURE_STATUS_SCOPE_MISMATCH_" + field.toUpperCase());
    }
  }
}

function normalize(
  envelope: ProviderEnvelope,
): VendureCustomerRegistrationStatusOutcome {
  const base = {
    transportVersion: VENDURE_REGISTRATION_STATUS_TRANSPORT_VERSION,
    statusRequestId: envelope.statusRequestId,
    providerVersion: envelope.providerVersion,
    statusReceiptHash: createHash("sha256")
      .update(JSON.stringify(envelope))
      .digest("hex"),
  } as const;

  if (envelope.state !== "CUSTOMER_PRESENT") {
    if (
      envelope.customerId !== null ||
      envelope.userId !== null ||
      envelope.providerActionId !== null ||
      envelope.providerReceiptHash !== null
    ) {
      throw new Error("VENDURE_STATUS_NON_APPLIED_AUTHORITY_DENIED");
    }
    return Object.freeze({
      ...base,
      outcome:
        envelope.state === "IDEMPOTENCY_KEY_ABSENT"
          ? ("NOT_APPLIED_CONFIRMED" as const)
          : ("UNRESOLVED" as const),
      customerId: null,
      userId: null,
      providerActionId: null,
      providerReceiptHash: null,
    });
  }

  if (
    envelope.customerId === null ||
    envelope.userId === null ||
    envelope.providerActionId === null ||
    envelope.providerReceiptHash === null
  ) {
    throw new Error("VENDURE_STATUS_APPLIED_AUTHORITY_INCOMPLETE");
  }
  if (!SHA256.test(envelope.providerReceiptHash)) {
    throw new Error("VENDURE_STATUS_PROVIDER_RECEIPT_HASH_INVALID");
  }

  return Object.freeze({
    ...base,
    outcome: "APPLIED_CONFIRMED" as const,
    customerId: envelope.customerId,
    userId: envelope.userId,
    providerActionId: envelope.providerActionId,
    providerReceiptHash: envelope.providerReceiptHash,
  });
}

export function createVendureCustomerRegistrationStatusTransport(
  config: VendureCustomerRegistrationStatusTransportConfig,
): VendureCustomerRegistrationStatusTransport {
  const endpoint = endpointFrom(config.endpoint);
  if (
    typeof config.username !== "string" ||
    config.username.trim().length === 0 ||
    typeof config.password !== "string" ||
    config.password.length === 0
  ) {
    throw new Error("VENDURE_STATUS_CREDENTIALS_REQUIRED");
  }

  const timeoutMs = config.timeoutMs ?? 10_000;
  const maxResponseBytes = config.maxResponseBytes ?? 1_048_576;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("VENDURE_STATUS_TIMEOUT_INVALID");
  }
  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 128) {
    throw new Error("VENDURE_STATUS_RESPONSE_LIMIT_INVALID");
  }

  const fetchImpl = config.fetchImpl ?? fetch;
  const authorization =
    "Basic " +
    Buffer.from(config.username + ":" + config.password, "utf8").toString(
      "base64",
    );

  return async (request) => {
    validateRequest(request);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;

    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization,
          "content-type": "application/json",
          "x-crays-claim-id": request.claimId,
          "x-crays-idempotency-key": request.idempotencyKey,
          "x-crays-status-request-id": request.statusRequestId,
        },
        body: JSON.stringify({
          operationName: "CraysCustomerProjectionRegistrationStatus",
          query: STATUS_QUERY,
          variables: { input: request },
        }),
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      });
    } catch {
      throw new Error("VENDURE_STATUS_TRANSPORT_UNRESOLVED");
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    if (Buffer.byteLength(responseText, "utf8") > maxResponseBytes) {
      throw new Error("VENDURE_STATUS_RESPONSE_TOO_LARGE");
    }
    if (!response.ok) {
      throw new Error("VENDURE_STATUS_HTTP_" + response.status);
    }

    let payload: {
      data?: { craysCustomerProjectionRegistrationStatus?: unknown };
      errors?: unknown;
    };
    try {
      payload = JSON.parse(responseText) as typeof payload;
    } catch {
      throw new Error("VENDURE_STATUS_RESPONSE_JSON_INVALID");
    }
    if (payload.errors !== undefined) {
      throw new Error("VENDURE_STATUS_GRAPHQL_ERRORS");
    }

    const envelope = parseEnvelope(
      payload.data?.craysCustomerProjectionRegistrationStatus,
    );
    validateEcho(envelope, request);
    return normalize(envelope);
  };
}

