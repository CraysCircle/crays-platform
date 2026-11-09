import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { getCorePgPool } from "@/db/client";
import { ForestCitySundaySandboxRepositoryError } from "@/db/forest-city-sunday-sandbox-booking-repository";
import {
  FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY,
  ForestCitySundaySandboxContractError,
} from "@/lib/member-commerce/forest-city-sunday-sandbox-booking-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const SANDBOX_API_SCHEMA =
  "crays.clubs.forest-city-sunday-sandbox-api.v1" as const;

const idempotencyNamespace =
  "crays.clubs.forest-city-sunday-sandbox-booking.command.v1";
const strongIdempotencyKey = /^[A-Za-z0-9:_.-]{16,200}$/;
const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);

export type SundaySandboxCommandType =
  | "issue_quote"
  | "create_hold"
  | "submit_booking_request"
  | "confirm_booking"
  | "release_hold"
  | "cancel_booking";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Origin",
};

function envelope(body: Record<string, unknown>) {
  return {
    schema: SANDBOX_API_SCHEMA,
    environment: "sandbox",
    providerAuthority: false,
    productionAuthority: false,
    paymentAuthority: false,
    ...body,
  };
}

export function sandboxJson(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
) {
  return Response.json(body, {
    status,
    headers: { ...noStoreHeaders, ...extraHeaders },
  });
}

function firstHost(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function hostname(value: string) {
  try {
    return new URL(`http://${value}`).hostname;
  } catch {
    return "";
  }
}

export function validSundaySandboxHost(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return false;
  try {
    return (
      loopbackHosts.has(new URL(request.url).hostname) &&
      loopbackHosts.has(hostname(firstHost(request)))
    );
  } catch {
    return false;
  }
}

export function validSundaySandboxOrigin(request: NextRequest) {
  if (!validSundaySandboxHost(request)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export class SundaySandboxApiInputError extends Error {
  constructor(readonly code: string) {
    super(code.toLowerCase());
    this.name = "SundaySandboxApiInputError";
  }
}

export function requiredString(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new SundaySandboxApiInputError(
      `SANDBOX_${field.toUpperCase()}_INVALID`,
    );
  }
  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new SundaySandboxApiInputError(
      `SANDBOX_${field.toUpperCase()}_INVALID`,
    );
  }
  return value.trim() || null;
}

export function optionalPositiveInteger(
  body: Record<string, unknown>,
  field: string,
) {
  const value = body[field];
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new SundaySandboxApiInputError(
      `SANDBOX_${field.toUpperCase()}_INVALID`,
    );
  }
  return value as number;
}

export type PreparedSundaySandboxPost = {
  body: Record<string, unknown>;
  idempotencyKey: string;
};

export async function prepareSundaySandboxPost(
  request: NextRequest,
): Promise<PreparedSundaySandboxPost | Response> {
  if (!validSundaySandboxHost(request)) {
    return sandboxJson(envelope({ status: "misdirected" }), 421);
  }
  if (!validSundaySandboxOrigin(request)) {
    return sandboxJson(
      envelope({ status: "permission_denied", reason: "invalid_origin" }),
      403,
    );
  }
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return sandboxJson(
      envelope({ status: "validation_error", reason: "json_required" }),
      400,
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 65_536) {
    return sandboxJson(
      envelope({ status: "validation_error", reason: "payload_too_large" }),
      413,
    );
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!strongIdempotencyKey.test(idempotencyKey)) {
    return sandboxJson(
      envelope({
        status: "validation_error",
        reason: "idempotency_key_invalid",
      }),
      400,
    );
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sandboxJson(
      envelope({ status: "validation_error", reason: "json_object_required" }),
      400,
    );
  }
  return { body: body as Record<string, unknown>, idempotencyKey };
}

function idempotencySha256(idempotencyKey: string) {
  return createHash("sha256")
    .update(`${idempotencyNamespace}\n${idempotencyKey}`, "utf8")
    .digest("hex");
}

function reconciliationHref(request: NextRequest, action?: string) {
  const url = new URL(request.url);
  url.search = "";
  if (action) url.searchParams.set("action", action);
  return `${url.pathname}${url.search}`;
}

export async function reconcileSundaySandboxCommand(
  request: NextRequest,
  commandType: SundaySandboxCommandType,
  action?: string,
) {
  if (!validSundaySandboxHost(request)) {
    return sandboxJson(envelope({ status: "misdirected" }), 421);
  }
  if (!validSundaySandboxOrigin(request)) {
    return sandboxJson(
      envelope({ status: "permission_denied", reason: "invalid_origin" }),
      403,
    );
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!strongIdempotencyKey.test(idempotencyKey)) {
    return sandboxJson(
      envelope({
        status: "validation_error",
        reason: "idempotency_key_invalid",
      }),
      400,
    );
  }

  const client = await getCorePgPool()
    .connect()
    .catch(() => null);
  if (!client) {
    return sandboxJson(
      envelope({
        status: "reconciliation_unavailable",
        reconcileRequired: true,
        reconcileHref: reconciliationHref(request, action),
      }),
      503,
      { "Retry-After": "2" },
    );
  }
  let transactionOpen = false;
  try {
    await client.query("begin read only");
    transactionOpen = true;
    await client.query(
      "select set_config('crays.app_role','core_service',true)",
    );
    const receipt = await client.query<{
      response_payload: Record<string, unknown>;
    }>(
      `select response_payload
         from crays_core.clubs_fc_sunday_sandbox_command_receipts
        where scenario_key=$1 and command_type=$2 and idempotency_sha256=$3`,
      [
        FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY.scenarioKey,
        commandType,
        idempotencySha256(idempotencyKey),
      ],
    );
    await client.query("commit");
    transactionOpen = false;
    if (!receipt.rows[0]) {
      return sandboxJson(
        envelope({
          status: "not_found",
          retryWithSameIdempotencyKey: true,
          commandType,
        }),
        404,
      );
    }
    return sandboxJson(receipt.rows[0].response_payload, 200, {
      "X-CRAYS-Idempotent-Replay": "true",
    });
  } catch {
    if (transactionOpen) {
      await client.query("rollback").catch(() => undefined);
    }
    return sandboxJson(
      envelope({
        status: "reconciliation_unavailable",
        reconcileRequired: true,
        reconcileHref: reconciliationHref(request, action),
      }),
      503,
      { "Retry-After": "2" },
    );
  } finally {
    client.release();
  }
}

function errorNamed(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

export function sundaySandboxErrorResponse(
  request: NextRequest,
  error: unknown,
  action?: string,
) {
  if (
    error instanceof SundaySandboxApiInputError ||
    errorNamed(error, "SundaySandboxApiInputError")
  ) {
    return sandboxJson(
      envelope({
        status: "validation_error",
        code:
          error instanceof Error
            ? error.message.toUpperCase()
            : "INVALID_INPUT",
      }),
      400,
    );
  }
  if (
    error instanceof ForestCitySundaySandboxContractError ||
    errorNamed(error, "ForestCitySundaySandboxContractError")
  ) {
    const code = (error as ForestCitySundaySandboxContractError).code;
    const forbidden = [
      "SANDBOX_PARTY_GO_REQUIRED",
      "SANDBOX_MEMBERSHIP_REQUIRED",
      "SANDBOX_PROPERTY_ADMISSION_REQUIRED",
    ].includes(code);
    return sandboxJson(
      envelope({ status: "rejected", code }),
      forbidden ? 403 : 422,
    );
  }
  if (
    error instanceof ForestCitySundaySandboxRepositoryError ||
    errorNamed(error, "ForestCitySundaySandboxRepositoryError")
  ) {
    const code = (error as ForestCitySundaySandboxRepositoryError).code;
    if (code === "SANDBOX_IDEMPOTENCY_KEY_INVALID") {
      return sandboxJson(envelope({ status: "validation_error", code }), 400);
    }
    if (code === "SANDBOX_IDEMPOTENCY_CONFLICT") {
      return sandboxJson(envelope({ status: "conflict", code }), 409);
    }
    if (
      [
        "SANDBOX_PARTY_GO_NOT_VALID",
        "SANDBOX_MEMBERSHIP_NOT_VALID",
        "SANDBOX_PROPERTY_ADMISSION_NOT_VALID",
      ].includes(code)
    ) {
      return sandboxJson(envelope({ status: "permission_denied", code }), 403);
    }
    return sandboxJson(envelope({ status: "state_conflict", code }), 409);
  }
  return sandboxJson(
    envelope({
      status: "unknown_outcome",
      reason: "reconcile_before_retry",
      reconcileRequired: true,
      reconcileMethod: "GET",
      reconcileHref: reconciliationHref(request, action),
    }),
    503,
    { "Retry-After": "2" },
  );
}

export function sundaySandboxReadErrorResponse(error: unknown) {
  if (
    error instanceof ForestCitySundaySandboxContractError ||
    errorNamed(error, "ForestCitySundaySandboxContractError")
  ) {
    return sandboxJson(
      envelope({
        status: "validation_error",
        code: (error as ForestCitySundaySandboxContractError).code,
      }),
      422,
    );
  }
  return sandboxJson(envelope({ status: "temporarily_unavailable" }), 503, {
    "Retry-After": "2",
  });
}
