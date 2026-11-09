import "server-only";

import type { NextRequest } from "next/server";
import {
  cancelForestCitySundaySandboxBooking,
  confirmForestCitySundaySandboxBooking,
} from "@/db/forest-city-sunday-sandbox-booking-repository";
import {
  prepareSundaySandboxPost,
  reconcileSundaySandboxCommand,
  requiredString,
  sandboxJson,
  SundaySandboxApiInputError,
  sundaySandboxErrorResponse,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BookingAction = "confirm" | "cancel";

function actionFromUrl(request: NextRequest): BookingAction | null {
  const action = new URL(request.url).searchParams.get("action");
  return action === "confirm" || action === "cancel" ? action : null;
}

export async function GET(request: NextRequest) {
  const action = actionFromUrl(request);
  if (!action) {
    return sandboxJson(
      {
        status: "validation_error",
        code: "SANDBOX_BOOKING_ACTION_INVALID",
        environment: "sandbox",
        providerAuthority: false,
        productionAuthority: false,
        paymentAuthority: false,
      },
      400,
    );
  }
  return reconcileSundaySandboxCommand(
    request,
    action === "confirm" ? "confirm_booking" : "cancel_booking",
    action,
  );
}

export async function POST(request: NextRequest) {
  const prepared = await prepareSundaySandboxPost(request);
  if (prepared instanceof Response) return prepared;
  const { body, idempotencyKey } = prepared;
  let action: BookingAction | undefined;
  try {
    const requestedAction = requiredString(body, "action");
    if (requestedAction !== "confirm" && requestedAction !== "cancel") {
      throw new SundaySandboxApiInputError("SANDBOX_BOOKING_ACTION_INVALID");
    }
    action = requestedAction;
    if (action === "confirm") {
      return sandboxJson(
        await confirmForestCitySundaySandboxBooking({
          bookingRequestId: requiredString(body, "bookingRequestId"),
          actorAccountId: requiredString(body, "actorAccountId"),
          idempotencyKey,
        }),
      );
    }
    return sandboxJson(
      await cancelForestCitySundaySandboxBooking({
        bookingId: requiredString(body, "bookingId"),
        actorAccountId: requiredString(body, "actorAccountId"),
        idempotencyKey,
      }),
    );
  } catch (error) {
    return sundaySandboxErrorResponse(request, error, action);
  }
}
