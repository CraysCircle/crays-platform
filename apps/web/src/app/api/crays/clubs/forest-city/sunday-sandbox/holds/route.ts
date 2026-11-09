import "server-only";

import type { NextRequest } from "next/server";
import {
  createForestCitySundaySandboxHold,
  releaseForestCitySundaySandboxHold,
} from "@/db/forest-city-sunday-sandbox-booking-repository";
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

type HoldAction = "create" | "release";

function actionFromUrl(request: NextRequest): HoldAction | null {
  const action = new URL(request.url).searchParams.get("action");
  return action === "create" || action === "release" ? action : null;
}

export async function GET(request: NextRequest) {
  const action = actionFromUrl(request);
  if (!action) {
    return sandboxJson(
      {
        status: "validation_error",
        code: "SANDBOX_HOLD_ACTION_INVALID",
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
    action === "create" ? "create_hold" : "release_hold",
    action,
  );
}

export async function POST(request: NextRequest) {
  const prepared = await prepareSundaySandboxPost(request);
  if (prepared instanceof Response) return prepared;
  const { body, idempotencyKey } = prepared;
  let action: HoldAction | undefined;
  try {
    const requestedAction = requiredString(body, "action");
    if (requestedAction !== "create" && requestedAction !== "release") {
      throw new SundaySandboxApiInputError("SANDBOX_HOLD_ACTION_INVALID");
    }
    action = requestedAction;
    if (action === "create") {
      return sandboxJson(
        await createForestCitySundaySandboxHold({
          accountId: requiredString(body, "accountId"),
          quoteId: requiredString(body, "quoteId"),
          partyGoReceiptId: requiredString(body, "partyGoReceiptId"),
          membershipId: optionalString(body, "membershipId"),
          admissionGrantId: optionalString(body, "admissionGrantId"),
          idempotencyKey,
        }),
      );
    }
    if (action === "release") {
      return sandboxJson(
        await releaseForestCitySundaySandboxHold({
          accountId: requiredString(body, "accountId"),
          holdId: requiredString(body, "holdId"),
          idempotencyKey,
        }),
      );
    }
    throw new SundaySandboxApiInputError("SANDBOX_HOLD_ACTION_INVALID");
  } catch (error) {
    return sundaySandboxErrorResponse(request, error, action);
  }
}
