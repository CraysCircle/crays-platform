import {timingSafeEqual} from "node:crypto";

import type {CoreCommerceConsequenceSource} from "./core-commerce-consequence-receipt";
import type {CoreCommerceVendureBinding} from "./core-commerce-consequence-delivery";

type SourceType = CoreCommerceConsequenceSource["sourceType"];

export type CoreCommerceSourceRuntimeBinding = Readonly<{
  serviceIdentity: string;
  tenantId: string;
  sourceTypes: readonly SourceType[];
  token: string;
}>;

export type CoreCommerceWorkerRuntimeBinding = CoreCommerceVendureBinding & Readonly<{
  tenantId: string;
  workerId: string;
  token: string;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const SOURCE_FIELDS = new Set([
  "consequenceId", "sourceType", "sourceId", "sourceVersion",
  "causingRecordType", "causingRecordId", "causingRecordVersion",
  "occurredAt", "orderId", "orderCode", "orderSellerSnapshotId",
  "orderSellerSnapshotSha256", "payload",
]);

function exactObject(value: unknown, fields: readonly string[], code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((field) => !fields.includes(field))) throw new Error(code);
  return record;
}

function parseRegistry(raw: string | undefined, code: string): unknown[] {
  if (!raw || Buffer.byteLength(raw) > 64 * 1024) throw new Error(code);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(code);
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 10_000) throw new Error(code);
  return parsed;
}

function secretMatches(expected: string, presented: string) {
  if (Buffer.byteLength(expected) < 32 || Buffer.byteLength(presented) !== Buffer.byteLength(expected)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
}

function bearer(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

function requestCoordinates(request: Request) {
  if (new URL(request.url).search) return {serviceIdentity: "", tenantId: ""};
  return {
    serviceIdentity: request.headers.get("x-crays-service-identity")?.trim() ?? "",
    tenantId: request.headers.get("x-crays-tenant-id")?.trim() ?? "",
  };
}

export function resolveCoreCommerceSourceBinding(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): CoreCommerceSourceRuntimeBinding | null {
  const coordinates = requestCoordinates(request);
  if (!ID.test(coordinates.serviceIdentity) || !ID.test(coordinates.tenantId)) return null;
  let matches: Record<string, unknown>[];
  try {
    const rows = parseRegistry(env.CRAYS_CORE_COMMERCE_SOURCE_BINDINGS_JSON, "CORE_COMMERCE_SOURCE_BINDINGS_INVALID");
    matches = rows.map((row) => exactObject(row, ["serviceIdentity", "tenantId", "sourceTypes", "token"], "CORE_COMMERCE_SOURCE_BINDING_INVALID"))
      .filter((row) => row.serviceIdentity === coordinates.serviceIdentity && row.tenantId === coordinates.tenantId);
  } catch {
    return null;
  }
  if (matches.length !== 1) return null;
  const row = matches[0];
  const sourceTypes = row.sourceTypes;
  if (!Array.isArray(sourceTypes) || sourceTypes.length < 1 || sourceTypes.some((value) => value !== "RETURN" && value !== "PARTNER_FEE")) return null;
  if (typeof row.token !== "string" || !secretMatches(row.token, bearer(request))) return null;
  return Object.freeze({
    serviceIdentity: coordinates.serviceIdentity,
    tenantId: coordinates.tenantId,
    sourceTypes: Object.freeze([...new Set(sourceTypes as SourceType[])]),
    token: row.token,
  });
}

export function resolveCoreCommerceWorkerBinding(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): CoreCommerceWorkerRuntimeBinding | null {
  const coordinates = requestCoordinates(request);
  if (!ID.test(coordinates.serviceIdentity) || !ID.test(coordinates.tenantId)) return null;
  let matches: Record<string, unknown>[];
  try {
    const rows = parseRegistry(env.CRAYS_CORE_COMMERCE_WORKER_BINDINGS_JSON, "CORE_COMMERCE_WORKER_BINDINGS_INVALID");
    const fields = ["serviceIdentity", "tenantId", "workerId", "token", "endpoint", "signingKeyId", "signingSecret"] as const;
    matches = rows.map((row) => exactObject(row, fields, "CORE_COMMERCE_WORKER_BINDING_INVALID"))
      .filter((row) => row.serviceIdentity === coordinates.serviceIdentity && row.tenantId === coordinates.tenantId);
  } catch {
    return null;
  }
  if (matches.length !== 1) return null;
  const row = matches[0];
  if ([row.workerId, row.endpoint, row.signingKeyId, row.signingSecret, row.token].some((value) => typeof value !== "string") ||
      !ID.test(String(row.workerId)) || !ID.test(String(row.signingKeyId)) ||
      Buffer.byteLength(String(row.signingSecret)) < 32 ||
      !validVendureEndpoint(String(row.endpoint)) ||
      !secretMatches(String(row.token), bearer(request))) return null;
  return Object.freeze({
    serviceIdentity: coordinates.serviceIdentity,
    tenantId: coordinates.tenantId,
    workerId: String(row.workerId),
    token: String(row.token),
    endpoint: String(row.endpoint),
    signingKeyId: String(row.signingKeyId),
    signingSecret: String(row.signingSecret),
  });
}

function validVendureEndpoint(raw: string) {
  try {
    const url = new URL(raw);
    const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return !url.username && !url.password && !url.search && !url.hash &&
      url.pathname === "/internal/crays/core-commerce-consequences" &&
      (url.protocol === "https:" || (url.protocol === "http:" && loopback));
  } catch {
    return false;
  }
}

export function parseCoreCommerceSourceCommand(
  raw: unknown,
  binding: CoreCommerceSourceRuntimeBinding,
): CoreCommerceConsequenceSource {
  const body = exactObject(raw, [...SOURCE_FIELDS], "CORE_COMMERCE_SOURCE_COMMAND_INVALID");
  if (Object.keys(body).length !== SOURCE_FIELDS.size ||
      (body.sourceType !== "RETURN" && body.sourceType !== "PARTNER_FEE") ||
      !binding.sourceTypes.includes(body.sourceType)) {
    throw new Error("CORE_COMMERCE_SOURCE_AUTHORITY_DENIED");
  }
  return Object.freeze({...body, tenantId: binding.tenantId}) as CoreCommerceConsequenceSource;
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new Error("CORE_COMMERCE_CONTENT_TYPE_INVALID");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 64 * 1024) throw new Error("CORE_COMMERCE_REQUEST_TOO_LARGE");
  const text = await request.text();
  if (!text || Buffer.byteLength(text) > 64 * 1024) throw new Error("CORE_COMMERCE_REQUEST_INVALID");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("CORE_COMMERCE_REQUEST_INVALID");
  }
}

export function hasCoreCommerceRequestBody(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  return (Number.isFinite(length) && length > 0) || Boolean(request.headers.get("transfer-encoding"));
}
