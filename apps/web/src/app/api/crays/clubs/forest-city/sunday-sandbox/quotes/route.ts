import "server-only";

import type { NextRequest } from "next/server";
import { issueForestCitySundaySandboxQuote } from "@/db/forest-city-sunday-sandbox-booking-repository";
import {
  FOREST_CITY_GOLF_PROPERTY_ID,
  FOREST_CITY_MARINA_PROPERTY_ID,
  type ForestCitySundaySandboxPropertyId,
  type ForestCitySundaySandboxStayUnit,
} from "@/lib/member-commerce/forest-city-sunday-sandbox-booking-contract";
import {
  optionalPositiveInteger,
  prepareSundaySandboxPost,
  reconcileSundaySandboxCommand,
  requiredString,
  sandboxJson,
  SundaySandboxApiInputError,
  sundaySandboxErrorResponse,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function propertyId(value: string): ForestCitySundaySandboxPropertyId {
  if (
    value !== FOREST_CITY_GOLF_PROPERTY_ID &&
    value !== FOREST_CITY_MARINA_PROPERTY_ID
  ) {
    throw new SundaySandboxApiInputError("SANDBOX_PROPERTY_ID_INVALID");
  }
  return value;
}

function stayUnit(value: string): ForestCitySundaySandboxStayUnit {
  if (value !== "night" && value !== "week" && value !== "month") {
    throw new SundaySandboxApiInputError("SANDBOX_STAY_UNIT_INVALID");
  }
  return value;
}

export async function GET(request: NextRequest) {
  return reconcileSundaySandboxCommand(request, "issue_quote");
}

export async function POST(request: NextRequest) {
  const prepared = await prepareSundaySandboxPost(request);
  if (prepared instanceof Response) return prepared;
  try {
    const { body, idempotencyKey } = prepared;
    return sandboxJson(
      await issueForestCitySundaySandboxQuote({
        accountId: requiredString(body, "accountId"),
        propertyId: propertyId(requiredString(body, "propertyId")),
        stayUnit: stayUnit(requiredString(body, "stayUnit")),
        checkIn: requiredString(body, "checkIn"),
        checkOut: requiredString(body, "checkOut"),
        quantity: optionalPositiveInteger(body, "quantity"),
        idempotencyKey,
      }),
    );
  } catch (error) {
    return sundaySandboxErrorResponse(request, error);
  }
}
