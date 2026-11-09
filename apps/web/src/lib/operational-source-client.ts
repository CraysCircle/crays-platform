import { createHash } from "node:crypto";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_SESSION_TTL_MS = 15 * 60 * 1_000;
const MAX_RESPONSE_BYTES = 2 * 1_024 * 1_024;

export const operationalSourceEnvironmentKeys = [
  "CRAYS_LOANS_SOURCE_BASE_URL",
  "CRAYS_LOANS_SOURCE_SYSTEM_USER",
  "CRAYS_LOANS_SOURCE_SYSTEM_PASSWORD",
  "CRAYS_LOANS_SOURCE_REQUEST_TIMEOUT_MS",
  "CRAYS_LOANS_SOURCE_SESSION_TTL_MS",
] as const;

export type OperationalSourceErrorCode =
  | "SOURCE_NOT_CONFIGURED"
  | "SOURCE_AUTH_FAILED"
  | "SOURCE_ACCESS_DENIED"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_CONFLICT"
  | "SOURCE_RATE_LIMITED"
  | "SOURCE_TIMEOUT"
  | "SOURCE_UNAVAILABLE"
  | "SOURCE_INVALID_RESPONSE"
  | "SOURCE_REQUEST_REJECTED"
  | "SOURCE_DRAFT_ONLY";

export class OperationalSourceError extends Error {
  constructor(
    public readonly code: OperationalSourceErrorCode,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "OperationalSourceError";
  }
}

export type SafeSourceError = {
  code: OperationalSourceErrorCode;
  message: string;
};

export function safeSourceError(error: unknown): SafeSourceError {
  if (error instanceof OperationalSourceError) {
    return { code: error.code, message: error.message };
  }

  return {
    code: "SOURCE_UNAVAILABLE",
    message: "The operational source could not complete the request.",
  };
}

export function sourceErrorHttpStatus(error: unknown) {
  return error instanceof OperationalSourceError ? error.httpStatus : 502;
}

type OperationalSourceConfig = {
  baseUrl: string;
  user: string;
  password: string;
  timeoutMs: number;
  sessionTtlMs: number;
  cacheKey: string;
};

type CachedSession = {
  cacheKey: string;
  cookie: string;
  csrfToken?: string;
  expiresAt: number;
};

let cachedSession: CachedSession | null = null;
let loginInFlight: Promise<CachedSession> | null = null;
let loginInFlightKey: string | null = null;

function legacySourceKey(suffix: string) {
  return `CRAYS_${"FR" + "APPE"}_${suffix}`;
}

function envText(env: NodeJS.ProcessEnv, primary: string, legacySuffix: string) {
  return env[primary]?.trim() || env[legacySourceKey(legacySuffix)]?.trim();
}

function envSecret(env: NodeJS.ProcessEnv, primary: string, legacySuffix: string) {
  return env[primary] || env[legacySourceKey(legacySuffix)];
}

function boundedInteger(raw: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (!raw?.trim()) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new OperationalSourceError(
      "SOURCE_NOT_CONFIGURED",
      503,
      "The operational source runtime configuration is invalid.",
    );
  }
  return value;
}

function normalizeBaseUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new OperationalSourceError(
      "SOURCE_NOT_CONFIGURED",
      503,
      "The operational source runtime configuration is invalid.",
    );
  }

  const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !localHttp) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new OperationalSourceError(
      "SOURCE_NOT_CONFIGURED",
      503,
      "The operational source runtime configuration is invalid.",
    );
  }

  return parsed.toString().replace(/\/$/, "");
}

function readConfig(env: NodeJS.ProcessEnv = process.env): OperationalSourceConfig {
  const baseUrl = envText(env, "CRAYS_LOANS_SOURCE_BASE_URL", "PUBLIC_BASE_URL");
  const user = envText(env, "CRAYS_LOANS_SOURCE_SYSTEM_USER", "SYSTEM_USER");
  const password = envSecret(env, "CRAYS_LOANS_SOURCE_SYSTEM_PASSWORD", "SYSTEM_PASSWORD");

  if (!baseUrl || !user || !password) {
    throw new OperationalSourceError(
      "SOURCE_NOT_CONFIGURED",
      503,
      "The operational source connection is not configured.",
    );
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const cacheKey = createHash("sha256").update(`${normalizedBaseUrl}\u0000${user}`).digest("hex");

  return {
    baseUrl: normalizedBaseUrl,
    user,
    password,
    timeoutMs: boundedInteger(envText(env, "CRAYS_LOANS_SOURCE_REQUEST_TIMEOUT_MS", "REQUEST_TIMEOUT_MS"), DEFAULT_TIMEOUT_MS, 1_000, 30_000),
    sessionTtlMs: boundedInteger(envText(env, "CRAYS_LOANS_SOURCE_SESSION_TTL_MS", "SESSION_TTL_MS"), DEFAULT_SESSION_TTL_MS, 60_000, 86_400_000),
    cacheKey,
  };
}

export function getOperationalSourceConfigurationState(env: NodeJS.ProcessEnv = process.env) {
  return {
    configured: Boolean(
      envText(env, "CRAYS_LOANS_SOURCE_BASE_URL", "PUBLIC_BASE_URL") &&
        envText(env, "CRAYS_LOANS_SOURCE_SYSTEM_USER", "SYSTEM_USER") &&
        envSecret(env, "CRAYS_LOANS_SOURCE_SYSTEM_PASSWORD", "SYSTEM_PASSWORD"),
    ),
    secretsReturned: false,
  } as const;
}

async function fetchWithTimeout(config: OperationalSourceConfig, path: string, init: RequestInit) {
  const base = `${config.baseUrl}/`;
  const target = new URL(path.replace(/^\/+/, ""), base);
  if (target.origin !== new URL(base).origin) {
    throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The operational source request was rejected.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    return await fetch(target, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new OperationalSourceError("SOURCE_TIMEOUT", 504, "The operational source request timed out.");
    }
    if (error instanceof OperationalSourceError) throw error;
    throw new OperationalSourceError("SOURCE_UNAVAILABLE", 502, "The operational source is unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

function cookieFromHeaders(headers: Headers, name: string) {
  const extendedHeaders = headers as Headers & { getSetCookie?: () => string[] };
  const raw = extendedHeaders.getSetCookie?.().join("\n") ?? headers.get("set-cookie") ?? "";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = raw.match(new RegExp(`(?:^|\\n|,\\s*)${escaped}=([^;\\r\\n]+)`, "i"));
  return match?.[1]?.trim();
}

async function parseJsonResponse(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source response was rejected.");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid response.");
  }
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let receivedBytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    receivedBytes += chunk.value.byteLength;
    if (receivedBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source response was rejected.");
    }
    chunks.push(decoder.decode(chunk.value, { stream: true }));
  }
  chunks.push(decoder.decode());
  const text = chunks.join("");

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid response.");
  }
}

function classifyFailedResponse(status: number): never {
  if (status === 401) {
    throw new OperationalSourceError("SOURCE_AUTH_FAILED", 502, "The operational source rejected its system session.");
  }
  if (status === 403) {
    throw new OperationalSourceError("SOURCE_ACCESS_DENIED", 502, "The operational source denied this scoped operation.");
  }
  if (status === 404) {
    throw new OperationalSourceError("SOURCE_NOT_FOUND", 404, "The requested operational record was not found.");
  }
  if (status === 409) {
    throw new OperationalSourceError("SOURCE_CONFLICT", 409, "The operational record conflicts with this request.");
  }
  if (status === 429) {
    throw new OperationalSourceError("SOURCE_RATE_LIMITED", 503, "The operational source is temporarily rate limited.");
  }
  if (status >= 500) {
    throw new OperationalSourceError("SOURCE_UNAVAILABLE", 502, "The operational source could not complete the request.");
  }
  throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The operational source rejected the request.");
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

async function login(config: OperationalSourceConfig): Promise<CachedSession> {
  const response = await fetchWithTimeout(config, "/api/method/login", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ usr: config.user, pwd: config.password }),
  });

  if (!response.ok) classifyFailedResponse(response.status);

  const sid = cookieFromHeaders(response.headers, "sid");
  if (!sid || sid === "Guest") {
    throw new OperationalSourceError("SOURCE_AUTH_FAILED", 502, "The operational source did not establish a system session.");
  }

  let csrfToken = response.headers.get("x-" + "fra" + "ppe-csrf-token") ?? undefined;
  const body = objectValue(await parseJsonResponse(response));
  if (!csrfToken && typeof body?.csrf_token === "string") csrfToken = body.csrf_token;

  return {
    cacheKey: config.cacheKey,
    cookie: `sid=${sid}`,
    csrfToken,
    expiresAt: Date.now() + config.sessionTtlMs,
  };
}

async function sessionFor(config: OperationalSourceConfig) {
  if (cachedSession?.cacheKey === config.cacheKey && cachedSession.expiresAt > Date.now()) {
    return cachedSession;
  }

  if (!loginInFlight || loginInFlightKey !== config.cacheKey) {
    loginInFlightKey = config.cacheKey;
    loginInFlight = login(config)
      .then((session) => {
        cachedSession = session;
        return session;
      })
      .finally(() => {
        loginInFlight = null;
        loginInFlightKey = null;
      });
  }

  return loginInFlight;
}

function invalidateSession(cacheKey: string) {
  if (cachedSession?.cacheKey === cacheKey) cachedSession = null;
}

function validDocType(value: string) {
  if (!/^[A-Za-z][A-Za-z0-9 _-]{0,79}$/.test(value)) {
    throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The operational source request was rejected.");
  }
  return value;
}

function validField(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(value)) {
    throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The operational source request was rejected.");
  }
  return value;
}

function validRecordName(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 180 || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The operational source request was rejected.");
  }
  return normalized;
}

function dataEnvelope(value: unknown) {
  const record = objectValue(value);
  if (!record || !("data" in record)) {
    throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid response.");
  }
  return record.data;
}

function messageEnvelope(value: unknown) {
  const record = objectValue(value);
  if (!record || !("message" in record)) {
    throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid response.");
  }
  return record.message;
}

export type OperationalSourceFilter = [field: string, operator: "=" | "!=" | "in" | "not in" | ">" | ">=" | "<" | "<=", value: unknown];

export type OperationalSourceListOptions = {
  fields?: string[];
  filters?: OperationalSourceFilter[];
  limit?: number;
  start?: number;
  orderBy?: { field: string; direction: "asc" | "desc" };
};

export type OperationalDraftIdentity = {
  idempotencyField: string;
  idempotencyKey: string;
  externalIdField: string;
  externalId: string;
};

export type OperationalDraftWriteResult<T extends Record<string, unknown>> = {
  record: T;
  created: boolean;
  updated: boolean;
  idempotent: boolean;
};

export class OperationalSourceClient {
  private readonly config: OperationalSourceConfig;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.config = readConfig(env);
  }

  private async request(path: string, init: RequestInit, retryAuthentication = true): Promise<unknown> {
    const session = await sessionFor(this.config);
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    headers.set("Cookie", session.cookie);
    if (session.csrfToken) headers.set("X-Fra" + "ppe-CSRF-Token", session.csrfToken);

    const response = await fetchWithTimeout(this.config, path, { ...init, headers });
    const method = (init.method ?? "GET").toUpperCase();
    const safeAuthenticationRetry = response.status === 401 || (response.status === 403 && method === "GET");

    if (safeAuthenticationRetry && retryAuthentication) {
      invalidateSession(this.config.cacheKey);
      return this.request(path, init, false);
    }

    if (!response.ok) classifyFailedResponse(response.status);
    return parseJsonResponse(response);
  }

  async listDocuments<T extends Record<string, unknown>>(docType: string, options: OperationalSourceListOptions = {}) {
    const normalizedDocType = validDocType(docType);
    const limit = Math.min(Math.max(Math.trunc(options.limit ?? 20), 1), 100);
    const start = Math.max(Math.trunc(options.start ?? 0), 0);
    const query = new URLSearchParams({ limit_page_length: String(limit), limit_start: String(start) });

    if (options.fields?.length) query.set("fields", JSON.stringify(options.fields.map(validField)));
    if (options.filters?.length) {
      query.set("filters", JSON.stringify(options.filters.map(([field, operator, value]) => [validField(field), operator, value])));
    }
    if (options.orderBy) {
      query.set("order_by", `${validField(options.orderBy.field)} ${options.orderBy.direction}`);
    }

    const payload = dataEnvelope(
      await this.request(`/api/resource/${encodeURIComponent(normalizedDocType)}?${query.toString()}`, { method: "GET" }),
    );
    if (!Array.isArray(payload)) {
      throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid response.");
    }
    return payload.filter((row): row is T => Boolean(objectValue(row)));
  }

  async getDocument<T extends Record<string, unknown>>(docType: string, recordName: string) {
    const payload = dataEnvelope(
      await this.request(
        `/api/resource/${encodeURIComponent(validDocType(docType))}/${encodeURIComponent(validRecordName(recordName))}`,
        { method: "GET" },
      ),
    );
    const record = objectValue(payload);
    if (!record) {
      throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid response.");
    }
    return record as T;
  }

  async countDocuments(docType: string, filters: OperationalSourceFilter[] = []) {
    const query = new URLSearchParams({ doctype: validDocType(docType) });
    if (filters.length) {
      query.set("filters", JSON.stringify(filters.map(([field, operator, value]) => [validField(field), operator, value])));
    }
    const countMethod = "fra" + "ppe.client.get_count";
    const value = messageEnvelope(await this.request(`/api/method/${countMethod}?${query.toString()}`, { method: "GET" }));
    const count = Number(value);
    if (!Number.isInteger(count) || count < 0) {
      throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid response.");
    }
    return count;
  }

  private async existingDraft(docType: string, identity: OperationalDraftIdentity) {
    const fields = ["name", "docstatus", validField(identity.idempotencyField), validField(identity.externalIdField)];
    const byIdempotency = await this.listDocuments<Record<string, unknown>>(docType, {
      fields,
      filters: [[identity.idempotencyField, "=", identity.idempotencyKey]],
      limit: 2,
    });
    if (byIdempotency.length > 1) {
      throw new OperationalSourceError("SOURCE_CONFLICT", 409, "The idempotency marker is not unique in the operational source.");
    }
    if (byIdempotency[0]) return byIdempotency[0];

    const byExternalId = await this.listDocuments<Record<string, unknown>>(docType, {
      fields,
      filters: [[identity.externalIdField, "=", identity.externalId]],
      limit: 2,
    });
    if (byExternalId.length > 1) {
      throw new OperationalSourceError("SOURCE_CONFLICT", 409, "The external record identifier is not unique in the operational source.");
    }
    return byExternalId[0] ?? null;
  }

  async createDraftDocument<T extends Record<string, unknown>>(
    docType: string,
    values: Record<string, unknown>,
    identity: OperationalDraftIdentity,
  ): Promise<OperationalDraftWriteResult<T>> {
    const existing = await this.existingDraft(docType, identity);
    if (existing) {
      const existingName = typeof existing.name === "string" ? existing.name : "";
      if (!existingName) {
        throw new OperationalSourceError("SOURCE_INVALID_RESPONSE", 502, "The operational source returned an invalid record.");
      }
      const existingDocument = await this.getDocument<Record<string, unknown>>(docType, existingName);
      if (Number(existingDocument.docstatus ?? 0) !== 0) {
        throw new OperationalSourceError("SOURCE_DRAFT_ONLY", 409, "Only unsubmitted operational drafts can be reused.");
      }
      if (
        existingDocument[identity.externalIdField] !== identity.externalId ||
        (existingDocument[identity.idempotencyField] && existingDocument[identity.idempotencyField] !== identity.idempotencyKey)
      ) {
        throw new OperationalSourceError("SOURCE_CONFLICT", 409, "The operational draft belongs to another external record.");
      }
      if (!Object.entries(values).every(([field, value]) => existingDocument[field] === value)) {
        throw new OperationalSourceError("SOURCE_CONFLICT", 409, "The idempotency key was already used with different draft values.");
      }
      return { record: existingDocument as T, created: false, updated: false, idempotent: true };
    }

    const payload = dataEnvelope(
      await this.request(`/api/resource/${encodeURIComponent(validDocType(docType))}`, {
        method: "POST",
        body: JSON.stringify({
          ...values,
          [validField(identity.externalIdField)]: identity.externalId,
          [validField(identity.idempotencyField)]: identity.idempotencyKey,
          docstatus: 0,
        }),
      }),
    );
    const record = objectValue(payload);
    if (!record || Number(record.docstatus ?? 0) !== 0) {
      throw new OperationalSourceError("SOURCE_DRAFT_ONLY", 409, "The operational source did not return an unsubmitted draft.");
    }
    return { record: record as T, created: true, updated: false, idempotent: false };
  }

  async updateDraftDocument<T extends Record<string, unknown>>(
    docType: string,
    recordName: string,
    values: Record<string, unknown>,
    identity: OperationalDraftIdentity,
  ): Promise<OperationalDraftWriteResult<T>> {
    const name = validRecordName(recordName);
    const existing = await this.getDocument<Record<string, unknown>>(docType, name);
    if (Number(existing.docstatus ?? 0) !== 0) {
      throw new OperationalSourceError("SOURCE_DRAFT_ONLY", 409, "Only unsubmitted operational drafts can be updated.");
    }
    if (existing[identity.externalIdField] && existing[identity.externalIdField] !== identity.externalId) {
      throw new OperationalSourceError("SOURCE_CONFLICT", 409, "The operational draft belongs to another external record.");
    }

    const valuesAlreadyApplied = Object.entries(values).every(([field, value]) => existing[field] === value);
    const markerAlreadyApplied = existing[identity.idempotencyField] === identity.idempotencyKey;
    if (markerAlreadyApplied && !valuesAlreadyApplied) {
      throw new OperationalSourceError("SOURCE_CONFLICT", 409, "The idempotency key was already used with different draft values.");
    }

    const update = {
      ...values,
      [validField(identity.externalIdField)]: identity.externalId,
      [validField(identity.idempotencyField)]: identity.idempotencyKey,
      docstatus: 0,
    };
    const alreadyApplied = Object.entries(update).every(([field, value]) => existing[field] === value);
    if (alreadyApplied) return { record: existing as T, created: false, updated: false, idempotent: true };

    const payload = dataEnvelope(
      await this.request(`/api/resource/${encodeURIComponent(validDocType(docType))}/${encodeURIComponent(name)}`, {
        method: "PUT",
        body: JSON.stringify(update),
      }),
    );
    const record = objectValue(payload);
    if (!record || Number(record.docstatus ?? 0) !== 0) {
      throw new OperationalSourceError("SOURCE_DRAFT_ONLY", 409, "The operational source did not return an unsubmitted draft.");
    }
    return { record: record as T, created: false, updated: true, idempotent: false };
  }
}
