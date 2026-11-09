import "server-only";

import {
  readForestCityHospitalityRoom,
} from "@/db/forest-city-hospitality-read-repository";
import {
  FOREST_CITY_HOSPITALITY_PROPERTIES,
  resolveForestCityHospitalityProperty,
  type ForestCityHospitalityPropertyId,
  type ForestCityHospitalityPropertyKey,
} from "@/lib/member-commerce/forest-city-hospitality-booking-north-star";
import {
  getForestCityHospitalityRuntimeConfig,
} from "@/lib/member-commerce/forest-city-hospitality-runtime-config";

export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function isInputError(error: unknown): boolean {
  return (
    error instanceof Error
    && (
      error.message.includes("ISO date")
      || error.message.includes("supplied together")
      || error.message.includes("later than")
    )
  );
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      propertyId: string;
      roomTypeId: string;
    }>;
  },
) {
  const {
    propertyId: requestedPropertyId,
    roomTypeId,
  } = await context.params;
  const resolved = resolveForestCityHospitalityProperty(
    requestedPropertyId,
  );

  if (!resolved) {
    return json(
      {
        status: "not_found",
        code: "FOREST_CITY_HOSPITALITY_PROPERTY_NOT_FOUND",
      },
      404,
    );
  }

  if (!roomTypeId.trim()) {
    return json(
      {
        status: "invalid_request",
        code: "FOREST_CITY_HOSPITALITY_ROOM_TYPE_REQUIRED",
      },
      400,
    );
  }

  const propertyKey = resolved[0] as ForestCityHospitalityPropertyKey;
  const property =
    FOREST_CITY_HOSPITALITY_PROPERTIES[propertyKey];
  const config = getForestCityHospitalityRuntimeConfig(propertyKey);

  if (!config.sourceConfigured) {
    return json(
      {
        status: "source_not_ready",
        code: "FOREST_CITY_CANONICAL_ROOM_SOURCE_NOT_CONFIGURED",
        propertyId: property.propertyId,
        accessMode: property.accessMode,
        bookingRule: property.bookingRule,
        sourceReceiptAttached: Boolean(
          config.canonicalRoomSourceReceiptSha256,
        ),
        expectedRoomSetAttached:
          config.expectedCanonicalRoomTypeIds.length > 0,
      },
      503,
    );
  }

  const url = new URL(request.url);
  const checkIn =
    url.searchParams.get("checkIn")?.trim() || undefined;
  const checkOut =
    url.searchParams.get("checkOut")?.trim() || undefined;

  try {
    const result = await readForestCityHospitalityRoom({
      propertyId:
        property.propertyId as ForestCityHospitalityPropertyId,
      roomTypeId,
      window: { checkIn, checkOut },
      canonicalRoomSourceReceiptSha256:
        config.canonicalRoomSourceReceiptSha256,
      expectedCanonicalRoomTypeIds:
        config.expectedCanonicalRoomTypeIds,
    });

    if (!result.sourceReadiness.ready) {
      return json(
        {
          status: "source_not_ready",
          code: "FOREST_CITY_CANONICAL_ROOM_SOURCE_INCOMPLETE",
          propertyId: property.propertyId,
          roomTypeId,
          accessMode: property.accessMode,
          bookingRule: property.bookingRule,
          reason: result.sourceReadiness.reason,
        },
        503,
      );
    }

    if (!result.room) {
      return json(
        {
          status: "not_found",
          code: "FOREST_CITY_HOSPITALITY_ROOM_NOT_FOUND",
          propertyId: property.propertyId,
          roomTypeId,
        },
        404,
      );
    }

    return json(
      {
        status: "ready",
        propertyId: property.propertyId,
        roomTypeId,
        accessMode: property.accessMode,
        bookingRule: property.bookingRule,
        sourceAuthority: result.sourceAuthority,
        includesSyntheticFallback:
          result.includesSyntheticFallback,
        property: result.property,
        room: result.room,
        datedRatesAndInventory:
          result.datedRatesAndInventory,
      },
      200,
    );
  } catch (error) {
    if (isInputError(error)) {
      return json(
        {
          status: "invalid_request",
          code: "FOREST_CITY_HOSPITALITY_DATE_WINDOW_INVALID",
        },
        400,
      );
    }

    return json(
      {
        status: "source_not_ready",
        code: "FOREST_CITY_HOSPITALITY_READ_UNAVAILABLE",
      },
      503,
    );
  }
}
