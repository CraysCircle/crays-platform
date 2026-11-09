import "server-only";

import type { KdsDatabase } from "@/store-operations/kds";
import { CLUBS_CAPABILITY_PACK_VERSION } from
  "./clubs-capability-pack";
import {
  resolveClubsSellableCapabilitySnapshot,
  type ClubsSellableCapabilityInput,
} from "./clubs-sellable-capability-resolver";
import {
  isCommerceContextRouteAuthorityAllowed,
  resolveAuthorizedCommerceContextSnapshot,
  type CommerceContextRouteAuthority,
} from "./commerce-context-read-path";
import { CommerceContextResolutionError } from
  "./server-commerce-context-resolver";

const CONTRACT_VERSION = "ncrv2-128.clubs-capability.v1" as const;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const MAX_BODY_BYTES = 8_192;

export type ClubsSellableCapabilityReadPathDependencies = Readonly<{
  database: KdsDatabase;
  resolveAuthority: (
    request: Request,
  ) => Promise<CommerceContextRouteAuthority>;
}>;

type BrowserRequest = Readonly<{
  storeId: string;
  expectedAssignmentVersion?: number;
}> & ClubsSellableCapabilityInput;

function optionalId(
  raw: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !ID.test(value)) {
    throw new Error("CLUBS_CAPABILITY_REQUEST_INVALID");
  }
  return value;
}

function parseBrowserRequest(value: unknown): BrowserRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CLUBS_CAPABILITY_REQUEST_INVALID");
  }
  const raw = value as Record<string, unknown>;
  const allowed = new Set([
    "storeId",
    "expectedAssignmentVersion",
    "sellableAssignmentId",
    "sellableAssignmentVersion",
    "reservationAuthorityRef",
    "availabilityHoldVersion",
    "eventAuthorityRef",
    "entitlementVersion",
    "parentBookingRef",
    "outletCommerceRef",
    "accessEntitlementRef",
  ]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) {
    throw new Error("CLUBS_CAPABILITY_BROWSER_AUTHORITY_DENIED");
  }
  if (
    typeof raw.storeId !== "string" ||
    !ID.test(raw.storeId) ||
    typeof raw.sellableAssignmentId !== "string" ||
    !ID.test(raw.sellableAssignmentId) ||
    !Number.isSafeInteger(raw.sellableAssignmentVersion) ||
    Number(raw.sellableAssignmentVersion) < 1 ||
    (raw.expectedAssignmentVersion !== undefined &&
      (!Number.isSafeInteger(raw.expectedAssignmentVersion) ||
        Number(raw.expectedAssignmentVersion) < 1))
  ) {
    throw new Error("CLUBS_CAPABILITY_REQUEST_INVALID");
  }
  const reservationAuthorityRef = optionalId(raw, "reservationAuthorityRef");
  const availabilityHoldVersion = optionalId(raw, "availabilityHoldVersion");
  const eventAuthorityRef = optionalId(raw, "eventAuthorityRef");
  const entitlementVersion = optionalId(raw, "entitlementVersion");
  const parentBookingRef = optionalId(raw, "parentBookingRef");
  const outletCommerceRef = optionalId(raw, "outletCommerceRef");
  const accessEntitlementRef = optionalId(raw, "accessEntitlementRef");
  return {
    storeId: raw.storeId,
    sellableAssignmentId: raw.sellableAssignmentId,
    sellableAssignmentVersion: Number(raw.sellableAssignmentVersion),
    ...(raw.expectedAssignmentVersion === undefined
      ? {}
      : { expectedAssignmentVersion: Number(raw.expectedAssignmentVersion) }),
    ...(reservationAuthorityRef ? { reservationAuthorityRef } : {}),
    ...(availabilityHoldVersion ? { availabilityHoldVersion } : {}),
    ...(eventAuthorityRef ? { eventAuthorityRef } : {}),
    ...(entitlementVersion ? { entitlementVersion } : {}),
    ...(parentBookingRef ? { parentBookingRef } : {}),
    ...(outletCommerceRef ? { outletCommerceRef } : {}),
    ...(accessEntitlementRef ? { accessEntitlementRef } : {}),
  };
}

function response(body: object, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

function safeFailure(error: unknown) {
  if (
    error instanceof CommerceContextResolutionError &&
    error.code === "COMMERCE_CONTEXT_STALE"
  ) {
    return response(
      {
        state: "conflict",
        code: "CLUBS_COMMERCE_CONTEXT_CHANGED",
        recovery: "reload_store_and_sellable_selection",
      },
      409,
    );
  }
  if (
    error instanceof CommerceContextResolutionError &&
    (
      error.code === "COMMERCE_CONTEXT_UNRESOLVED" ||
      error.code === "COMMERCE_CONTEXT_INPUT_INVALID"
    )
  ) {
    return response(
      {
        state: "not_found",
        code: "CLUBS_SELLABLE_CAPABILITY_NOT_AVAILABLE",
        recovery: "select_an_available_store_and_sellable",
      },
      404,
    );
  }
  const message = error instanceof Error ? error.message : "";
  if (
    message === "COMMERCE_CONTEXT_SELECTION_DENIED" ||
    message === "CLUBS_SELLABLE_CAPABILITY_UNRESOLVED" ||
    message === "CLUBS_SELLABLE_CAPABILITY_AMBIGUOUS" ||
    message === "CLUBS_SELLABLE_CAPABILITY_SCOPE_MISMATCH"
  ) {
    return response(
      {
        state: "not_found",
        code: "CLUBS_SELLABLE_CAPABILITY_NOT_AVAILABLE",
        recovery: "select_an_available_store_and_sellable",
      },
      404,
    );
  }
  if (message === "CLUBS_BOOKING_OUTSIDE_ORDINARY_VENDURE") {
    return response(
      {
        state: "conflict",
        code: "CLUBS_SPECIALIST_BOOKING_FLOW_REQUIRED",
        recovery: "open_clubs_booking_flow",
      },
      409,
    );
  }
  if (
    message === "CLUBS_CAPABILITY_REQUEST_INVALID" ||
    message === "CLUBS_CAPABILITY_BROWSER_AUTHORITY_DENIED" ||
    message === "CLUBS_SELLABLE_CAPABILITY_INPUT_INVALID" ||
    message === "CLUBS_CAPABILITY_CONTEXT_INCOMPLETE" ||
    message === "CLUBS_PRODUCT_TYPE_NOT_APPROVED" ||
    message === "CLUBS_ACCESS_AUTHORITY_OUTSIDE_COMMERCE" ||
    message === "CLUBS_OUTLET_PRODUCT_BOUNDARY_INVALID" ||
    message === "CLUBS_RESERVATION_AUTHORITY_REQUIRED" ||
    message === "CLUBS_EVENT_AUTHORITY_REQUIRED" ||
    message === "CLUBS_PARENT_BOOKING_REQUIRED"
  ) {
    return response(
      {
        state: "invalid",
        code: "CLUBS_SELLABLE_CAPABILITY_REQUEST_INVALID",
        recovery: "correct_the_sellable_request",
      },
      400,
    );
  }
  return response(
    {
      state: "unavailable",
      code: "CLUBS_SELLABLE_CAPABILITY_TEMPORARILY_UNAVAILABLE",
      recovery: "retry_after_backoff",
    },
    503,
  );
}

export async function handleClubsSellableCapabilityReadRequest(
  request: Request,
  dependencies: ClubsSellableCapabilityReadPathDependencies,
): Promise<Response> {
  try {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(length) || length > MAX_BODY_BYTES) {
      throw new Error("CLUBS_CAPABILITY_REQUEST_INVALID");
    }
    const authority = await dependencies.resolveAuthority(request);
    if (!isCommerceContextRouteAuthorityAllowed(authority)) {
      return response(
        {
          state: "denied",
          code: "CLUBS_COMMERCE_AUTHORIZATION_REQUIRED",
          recovery: "authenticate_with_aal2_and_select_active_role",
        },
        403,
      );
    }
    const mediaType = request.headers.get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (mediaType !== "application/json") {
      throw new Error("CLUBS_CAPABILITY_REQUEST_INVALID");
    }
    const serialized = await request.text();
    if (
      serialized.length < 2 ||
      Buffer.byteLength(serialized, "utf8") > MAX_BODY_BYTES
    ) {
      throw new Error("CLUBS_CAPABILITY_REQUEST_INVALID");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch {
      throw new Error("CLUBS_CAPABILITY_REQUEST_INVALID");
    }
    const input = parseBrowserRequest(parsed);
    const result = await dependencies.database.transaction(async ({ query }) => {
      await query("set transaction isolation level repeatable read read only");
      await query("select set_config('crays.app_role','core_service',true)");
      const context = await resolveAuthorizedCommerceContextSnapshot(
        query,
        authority,
        {
          verticalRoot: "clubs",
          storeId: input.storeId,
          ...(input.expectedAssignmentVersion === undefined
            ? {}
            : {
                expectedAssignmentVersion: input.expectedAssignmentVersion,
              }),
        },
      );
      const capability = await resolveClubsSellableCapabilitySnapshot(
        query,
        context,
        input,
      );
      return { context, capability };
    });
    return response(
      {
        state: "ready",
        contractVersion: CONTRACT_VERSION,
        store: {
          storeId: result.context.storeId,
          sellerLegalName: result.context.operatorLegalName,
          storeOperatorAssignmentVersion:
            result.context.storeOperatorAssignmentVersion,
          contextFingerprint: result.context.contextFingerprint,
          verifiedAt: result.context.verifiedAt,
        },
        capability: {
          packVersion: CLUBS_CAPABILITY_PACK_VERSION,
          canonicalProductType: result.capability.canonicalProductType,
          verticalProductClass: result.capability.verticalProductClass,
          sellableAssignmentId: result.capability.sellableAssignmentId,
          sellableAssignmentVersion:
            result.capability.sellableAssignmentVersion,
          taxonomyVersion: result.capability.taxonomyVersion,
          routingPolicyVersion: result.capability.routingPolicyVersion,
        },
      },
      200,
    );
  } catch (error) {
    return safeFailure(error);
  }
}
