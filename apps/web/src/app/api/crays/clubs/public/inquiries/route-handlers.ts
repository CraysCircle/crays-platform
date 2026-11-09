import "server-only";

import { NextRequest } from "next/server";

import {
  CCLUB_PUBLIC_INQUIRY_OPERATION_HEADER,
  CCLUB_PUBLIC_INQUIRY_RECONCILE_OPERATION,
  publicGolfMiceInquiryConfig,
  publicGolfMiceInquiryConfirmationContract,
  PublicGolfMiceInquiryValidationError,
  normalizePublicGolfMiceInquiryInput,
  normalizePublicInquiryIdempotencyKey,
} from "@/lib/member-commerce/public-golf-mice-inquiry-contract";
import {
  PublicInquiryReplayConflictError,
  PublicInquiryUnknownOutcomeError,
  executePublicGolfMiceInquiryCommand,
  reconcilePublicGolfMiceInquiryCommand,
  type PersistedPublicInquiry,
} from "@/lib/member-commerce/public-golf-mice-inquiry-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
} as const;

type PublicInquiryRouteDependencies = {
  executeCommand: (
    input: unknown,
    idempotencyKey: string | null,
  ) => Promise<PersistedPublicInquiry>;
  reconcileCommand: (
    input: unknown,
    idempotencyKey: string | null,
  ) => Promise<PersistedPublicInquiry | null>;
};

const DEFAULT_DEPENDENCIES: PublicInquiryRouteDependencies = {
  executeCommand: executePublicGolfMiceInquiryCommand,
  reconcileCommand: reconcilePublicGolfMiceInquiryCommand,
};

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function isNamedError(error: unknown, name: string): error is Error {
  return error instanceof Error && error.name === name;
}

function expectedOrigin(request: NextRequest): string | null {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.trim();
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    request.nextUrl.protocol.replace(":", "");

  if (!host || (protocol !== "http" && protocol !== "https")) {
    return null;
  }

  return `${protocol}://${host}`;
}

function sameOriginJsonRequest(request: NextRequest):
  | { ok: true }
  | { ok: false; reason: string } {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return { ok: false, reason: "application_json_required" };
  }

  const origin = request.headers.get("origin");
  const expected = expectedOrigin(request);
  if (!origin || !expected || origin !== expected) {
    return { ok: false, reason: "same_origin_required" };
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return { ok: false, reason: "same_origin_required" };
  }

  return { ok: true };
}

export async function handlePublicGolfMiceInquiryGet(): Promise<Response> {
  return jsonResponse(publicGolfMiceInquiryConfig, 200);
}

export async function handlePublicGolfMiceInquiryPost(
  request: NextRequest,
  dependencies: Partial<PublicInquiryRouteDependencies> = DEFAULT_DEPENDENCIES,
): Promise<Response> {
  const security = sameOriginJsonRequest(request);
  if (!security.ok) {
    return jsonResponse(
      {
        status: "request_rejected",
        reason: security.reason,
        persisted: false,
        providerDeliveryClaimed: false,
      },
      403,
    );
  }

  try {
    const rawInput: unknown = await request.json();
    const input = normalizePublicGolfMiceInquiryInput(rawInput);
    const idempotencyKey = normalizePublicInquiryIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const operation =
      request.headers.get(CCLUB_PUBLIC_INQUIRY_OPERATION_HEADER)?.trim().toLowerCase() ??
      "submit";
    if (operation !== "submit" && operation !== CCLUB_PUBLIC_INQUIRY_RECONCILE_OPERATION) {
      return jsonResponse(
        {
          status: "validation_error",
          reason: "unsupported_inquiry_operation",
          persisted: false,
          providerDeliveryClaimed: false,
        },
        400,
      );
    }

    if (operation === CCLUB_PUBLIC_INQUIRY_RECONCILE_OPERATION) {
      const reconciled = await (
        dependencies.reconcileCommand ?? DEFAULT_DEPENDENCIES.reconcileCommand
      )(input, idempotencyKey);
      if (!reconciled) {
        return jsonResponse(
          {
            status: "not_found",
            persisted: false,
            reconciled: false,
            confirmationStatus: "unknown",
            teamQueueStatus: "unknown",
            reconciliationStatus: "not_found",
            retry: "submit_with_same_idempotency_key_and_payload",
            providerDeliveryClaimed: false,
          },
          404,
        );
      }
      return jsonResponse(
        {
          status: "received",
          persisted: true,
          reconciled: true,
          confirmationStatus: publicGolfMiceInquiryConfirmationContract.confirmationStatus,
          teamQueueStatus: publicGolfMiceInquiryConfirmationContract.teamQueueStatus,
          reconciliationStatus: "reconciled",
          destination: "CRAYS_TEAM",
          providerDelivery: reconciled.providerDeliveryState,
          providerDeliveryClaimed: false,
        },
        200,
      );
    }

    const persisted = await (dependencies.executeCommand ?? DEFAULT_DEPENDENCIES.executeCommand)(
      input,
      idempotencyKey,
    );

    return jsonResponse(
      {
        status: "persisted",
        persisted: true,
        replayed: persisted.replayed,
        confirmationStatus: publicGolfMiceInquiryConfirmationContract.confirmationStatus,
        teamQueueStatus: publicGolfMiceInquiryConfirmationContract.teamQueueStatus,
        reconciliationStatus: persisted.replayed ? "reconciled" : "not_required",
        publicReference: persisted.publicReference,
        receiptSha256: persisted.receiptSha256,
        destination: "CRAYS_TEAM",
        providerDelivery: persisted.providerDeliveryState,
        providerDeliveryClaimed: false,
      },
      persisted.replayed ? 200 : 201,
    );
  } catch (error) {
    if (
      error instanceof PublicGolfMiceInquiryValidationError ||
      error instanceof SyntaxError ||
      isNamedError(error, "PublicGolfMiceInquiryValidationError")
    ) {
      return jsonResponse(
        {
          status: "validation_error",
          reason: error.message,
          persisted: false,
          providerDeliveryClaimed: false,
        },
        400,
      );
    }

    if (
      error instanceof PublicInquiryReplayConflictError ||
      isNamedError(error, "PublicInquiryReplayConflictError")
    ) {
      return jsonResponse(
        {
          status: "idempotency_conflict",
          persisted: false,
          confirmationStatus: "unknown",
          teamQueueStatus: "unknown",
          reconciliationStatus: "conflict",
          providerDeliveryClaimed: false,
        },
        409,
      );
    }

    return jsonResponse(
      {
        status: "unknown_outcome",
        persisted: false,
        confirmationStatus: "unknown",
        teamQueueStatus: "unknown",
        reconciliationStatus: "required",
        providerDeliveryClaimed: false,
        retry: "reconcile_with_same_idempotency_key_and_payload",
        reason:
          error instanceof PublicInquiryUnknownOutcomeError ||
          isNamedError(error, "PublicInquiryUnknownOutcomeError")
            ? error.message
            : "CCLUB_PUBLIC_INQUIRY_UNKNOWN_OUTCOME",
      },
      503,
    );
  }
}

export async function GET(): Promise<Response> {
  return handlePublicGolfMiceInquiryGet();
}

export async function POST(request: NextRequest): Promise<Response> {
  return handlePublicGolfMiceInquiryPost(request);
}
