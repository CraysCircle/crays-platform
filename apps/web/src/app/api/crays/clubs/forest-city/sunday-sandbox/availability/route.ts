import "server-only";

import type { NextRequest } from "next/server";
import { readForestCitySundaySandboxAvailability } from "@/db/forest-city-sunday-sandbox-booking-repository";
import {
  FOREST_CITY_GOLF_PROPERTY_ID,
  FOREST_CITY_MARINA_PROPERTY_ID,
  type ForestCitySundaySandboxPropertyId,
  type ForestCitySundaySandboxStayUnit,
} from "@/lib/member-commerce/forest-city-sunday-sandbox-booking-contract";
import {
  sandboxJson,
  sundaySandboxReadErrorResponse,
  validSundaySandboxHost,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function propertyId(
  value: string | null,
): ForestCitySundaySandboxPropertyId | null {
  return value === FOREST_CITY_GOLF_PROPERTY_ID ||
    value === FOREST_CITY_MARINA_PROPERTY_ID
    ? value
    : null;
}

function stayUnit(
  value: string | null,
): ForestCitySundaySandboxStayUnit | null {
  return value === "night" || value === "week" || value === "month"
    ? value
    : null;
}

export async function GET(request: NextRequest) {
  if (!validSundaySandboxHost(request)) {
    return sandboxJson(
      {
        status: "misdirected",
        environment: "sandbox",
        providerAuthority: false,
        productionAuthority: false,
        paymentAuthority: false,
      },
      421,
    );
  }
  const search = new URL(request.url).searchParams;
  const requestedPropertyId = propertyId(search.get("propertyId"));
  const requestedStayUnit = stayUnit(search.get("stayUnit"));
  const checkIn = search.get("checkIn")?.trim() ?? "";
  const checkOut = search.get("checkOut")?.trim() ?? "";
  if (!requestedPropertyId || !requestedStayUnit || !checkIn || !checkOut) {
    return sandboxJson(
      {
        status: "validation_error",
        code: "SANDBOX_AVAILABILITY_INPUT_INVALID",
        environment: "sandbox",
        providerAuthority: false,
        productionAuthority: false,
        paymentAuthority: false,
      },
      400,
    );
  }

  try {
    return sandboxJson(
      await readForestCitySundaySandboxAvailability({
        accountId: "sandbox-anonymous",
        propertyId: requestedPropertyId,
        stayUnit: requestedStayUnit,
        checkIn,
        checkOut,
      }),
    );
  } catch (error) {
    return sundaySandboxReadErrorResponse(error);
  }
}
