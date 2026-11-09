import "server-only";

import type { NextRequest } from "next/server";
import { submitForestCitySundaySandboxBookingRequest } from "@/db/forest-city-sunday-sandbox-booking-repository";
import {
  optionalString,
  prepareSundaySandboxPost,
  reconcileSundaySandboxCommand,
  requiredString,
  sandboxJson,
  SundaySandboxApiInputError,
  sundaySandboxErrorResponse,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function integerInRange(value: unknown, minimum: number, maximum: number) {
  if (
    !Number.isInteger(value) ||
    (value as number) < minimum ||
    (value as number) > maximum
  ) {
    throw new SundaySandboxApiInputError("SANDBOX_GUEST_COUNT_INVALID");
  }
  return value as number;
}

function guestPayload(body: Record<string, unknown>) {
  const value = body.guest;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SundaySandboxApiInputError("SANDBOX_GUEST_INVALID");
  }
  const guest = value as Record<string, unknown>;
  return {
    guestName: requiredString(guest, "guestName"),
    guestEmail: requiredString(guest, "guestEmail"),
    guestPhone: optionalString(guest, "guestPhone"),
    adults: integerInRange(guest.adults, 1, 20),
    dependentMinors: integerInRange(guest.dependentMinors, 0, 20),
  };
}

export async function GET(request: NextRequest) {
  return reconcileSundaySandboxCommand(request, "submit_booking_request");
}

export async function POST(request: NextRequest) {
  const prepared = await prepareSundaySandboxPost(request);
  if (prepared instanceof Response) return prepared;
  try {
    const { body, idempotencyKey } = prepared;
    return sandboxJson(
      await submitForestCitySundaySandboxBookingRequest({
        accountId: requiredString(body, "accountId"),
        holdId: requiredString(body, "holdId"),
        guest: guestPayload(body),
        idempotencyKey,
      }),
    );
  } catch (error) {
    return sundaySandboxErrorResponse(request, error);
  }
}
