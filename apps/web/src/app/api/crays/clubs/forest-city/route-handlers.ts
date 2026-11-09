import { NextRequest } from "next/server";
import { z } from "zod";
import { readForestCityCatalog } from "@/db/forest-city-booking-repository";
import { readForestCityHospitalityProperty } from "@/db/forest-city-hospitality-read-repository";
import { validateClubsMemberMutationRequest } from "@/lib/clubs/member-request-security";
import {
  FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES,
  FOREST_CITY_HOSPITALITY_PROPERTIES,
} from "@/lib/member-commerce/forest-city-hospitality-booking-north-star";
import { getForestCityHospitalityRuntimeConfig } from "@/lib/member-commerce/forest-city-hospitality-runtime-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};
const PROPERTY_KEYS = ["golf", "marina"] as const;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function isRealIsoDate(value: string): boolean {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealIsoDate);
const integer = z.coerce.number().int();

function validateDateRange(
  value: { checkIn: string; checkOut: string },
  context: z.RefinementCtx,
) {
  const start = Date.parse(`${value.checkIn}T00:00:00.000Z`);
  const end = Date.parse(`${value.checkOut}T00:00:00.000Z`);
  const nights = (end - start) / 86_400_000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 30) {
    context.addIssue({
      code: "custom",
      path: ["checkOut"],
      message: "Stay must contain between 1 and 30 nights.",
    });
  }
}

const catalogSchema = z
  .object({
    checkIn: date,
    checkOut: date,
    rooms: integer.min(1).max(10),
    adults: integer.min(1).max(40),
    children: integer.min(0).max(40),
  })
  .superRefine(validateDateRange);

const bookingSchema = z
  .object({
    roomTypeId: z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/),
    checkIn: date,
    checkOut: date,
    rooms: integer.min(1).max(10),
    adults: integer.min(1).max(40),
    children: integer.min(0).max(40),
    guestName: z.string().trim().min(2).max(160),
    guestEmail: z.string().trim().email().max(254),
    guestPhone: z.string().trim().min(5).max(40).optional(),
  })
  .strip()
  .superRefine(validateDateRange);

export type ForestCityRouteDependencies = {
  readCatalog: typeof readForestCityCatalog;
  readProperty: typeof readForestCityHospitalityProperty;
  getRuntimeConfig: typeof getForestCityHospitalityRuntimeConfig;
  validateMutation: typeof validateClubsMemberMutationRequest;
};

const defaults: ForestCityRouteDependencies = {
  readCatalog: readForestCityCatalog,
  readProperty: readForestCityHospitalityProperty,
  getRuntimeConfig: getForestCityHospitalityRuntimeConfig,
  validateMutation: validateClubsMemberMutationRequest,
};

type RuntimeEntry = ReturnType<typeof runtimeEntries>[number];
type PropertyRead = Awaited<
  ReturnType<typeof readForestCityHospitalityProperty>
>;

function runtimeEntries(deps: ForestCityRouteDependencies) {
  return PROPERTY_KEYS.map((propertyKey) => ({
    propertyKey,
    property: FOREST_CITY_HOSPITALITY_PROPERTIES[propertyKey],
    config: deps.getRuntimeConfig(propertyKey),
  }));
}

function sourceConfiguration(entry: RuntimeEntry) {
  return {
    propertyId: entry.property.propertyId,
    accessMode: entry.property.accessMode,
    bookingRule: entry.property.bookingRule,
    sourceReceiptAttached: entry.config.sourceReceiptAttached,
    sourceReceiptValid: entry.config.sourceReceiptValid,
    expectedRoomSetAttached:
      entry.config.expectedCanonicalRoomTypeIds.length > 0,
    expectedRoomSetValid: entry.config.expectedRoomSetValid,
  };
}

function sourceNotReady(
  code: string,
  entries: readonly RuntimeEntry[],
  details: Record<string, unknown> = {},
) {
  return json(
    {
      status: "source_not_ready",
      code,
      properties: entries.map(sourceConfiguration),
      ...details,
    },
    503,
  );
}

function propertyReadReady(result: PropertyRead): boolean {
  return (
    result.sourceReadiness.ready &&
    result.includesSyntheticFallback === false &&
    result.sourceAuthority ===
      FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES.rateAndInventorySourceAuthority
  );
}

function roomTypeId(record: Record<string, unknown>): string | null {
  const value =
    record.room_type_id ?? record.hotel_room_type_id ?? record.id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function propertyReadContainsRoom(
  result: PropertyRead,
  expectedRoomTypeId: string,
): boolean {
  return result.rooms.some(
    (room) => roomTypeId(room) === expectedRoomTypeId,
  );
}

function catalogIsSourceBound(
  result: Awaited<ReturnType<typeof readForestCityCatalog>>,
  entries: readonly RuntimeEntry[],
): boolean {
  if (
    result.authority.price !==
      FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES.rateAndInventorySourceAuthority ||
    result.authority.availability !==
      FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES.rateAndInventorySourceAuthority
  ) {
    return false;
  }

  return result.rooms.every((room) => {
    const entry = entries.find(
      (candidate) => candidate.property.propertyId === room.propertyId,
    );
    return Boolean(
      entry?.config.expectedCanonicalRoomTypeIds.includes(
        room.roomTypeId,
      ),
    );
  });
}

async function readAdmittedProperty(
  entry: RuntimeEntry,
  dates: { checkIn: string; checkOut: string },
  deps: ForestCityRouteDependencies,
) {
  return deps.readProperty({
    propertyId: entry.property.propertyId,
    window: dates,
    canonicalRoomSourceReceiptSha256:
      entry.config.canonicalRoomSourceReceiptSha256,
    expectedCanonicalRoomTypeIds:
      entry.config.expectedCanonicalRoomTypeIds,
  });
}

export async function handleForestCityCatalogRequest(
  request: NextRequest,
  deps: ForestCityRouteDependencies = defaults,
) {
  const parsed = catalogSchema.safeParse({
    checkIn: request.nextUrl.searchParams.get("checkIn") ?? "",
    checkOut: request.nextUrl.searchParams.get("checkOut") ?? "",
    rooms: request.nextUrl.searchParams.get("rooms") ?? "1",
    adults: request.nextUrl.searchParams.get("adults") ?? "2",
    children: request.nextUrl.searchParams.get("children") ?? "0",
  });
  if (!parsed.success) {
    return json(
      {
        status: "validation_error",
        reason: "Use valid dates for 1 to 30 nights.",
      },
      400,
    );
  }

  const entries = runtimeEntries(deps);
  const unconfigured = entries.filter(
    (entry) => !entry.config.sourceConfigured,
  );
  if (unconfigured.length > 0) {
    return sourceNotReady(
      "FOREST_CITY_CANONICAL_ROOM_SOURCE_NOT_CONFIGURED",
      unconfigured,
    );
  }

  try {
    const propertyReads = await Promise.all(
      entries.map((entry) =>
        readAdmittedProperty(entry, parsed.data, deps),
      ),
    );
    const incomplete = propertyReads
      .map((result, index) => ({ result, entry: entries[index] }))
      .filter(({ result }) => !propertyReadReady(result));
    if (incomplete.length > 0) {
      return sourceNotReady(
        "FOREST_CITY_CANONICAL_ROOM_SOURCE_INCOMPLETE",
        incomplete.map(({ entry }) => entry),
        {
          reasons: incomplete.map(({ result, entry }) => ({
            propertyId: entry.property.propertyId,
            reason: result.sourceReadiness.reason,
          })),
        },
      );
    }

    const result = await deps.readCatalog(parsed.data);
    if (!catalogIsSourceBound(result, entries)) {
      return sourceNotReady(
        "FOREST_CITY_LEGACY_CATALOG_SOURCE_BINDING_INVALID",
        entries,
      );
    }
    return json(result, 200);
  } catch {
    return sourceNotReady(
      "FOREST_CITY_HOSPITALITY_READ_UNAVAILABLE",
      entries,
    );
  }
}

export async function handleForestCityBookingRequest(
  request: NextRequest,
  deps: ForestCityRouteDependencies = defaults,
) {
  const security = deps.validateMutation(request);
  if (!security.allowed) {
    return json(
      { status: "denied", reason: security.reason },
      403,
    );
  }

  const parsed = bookingSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return json(
      { status: "validation_error", issues: parsed.error.issues },
      400,
    );
  }

  const entries = runtimeEntries(deps);
  const matches = entries.filter((entry) =>
    entry.config.expectedCanonicalRoomTypeIds.includes(
      parsed.data.roomTypeId,
    ),
  );
  if (matches.length === 0) {
    const unconfigured = entries.filter(
      (entry) => !entry.config.sourceConfigured,
    );
    if (unconfigured.length > 0) {
      return sourceNotReady(
        "FOREST_CITY_CANONICAL_ROOM_SOURCE_NOT_CONFIGURED",
        unconfigured,
      );
    }
    return json(
      {
        status: "invalid_request",
        code: "FOREST_CITY_CANONICAL_ROOM_TYPE_NOT_ADMITTED",
      },
      400,
    );
  }
  if (matches.length !== 1) {
    return sourceNotReady(
      "FOREST_CITY_CANONICAL_ROOM_CONFIGURATION_CONFLICT",
      matches,
    );
  }

  const target = matches[0];
  if (!target.config.sourceConfigured) {
    return sourceNotReady(
      "FOREST_CITY_CANONICAL_ROOM_SOURCE_NOT_CONFIGURED",
      [target],
    );
  }

  try {
    const source = await readAdmittedProperty(
      target,
      parsed.data,
      deps,
    );
    if (
      !propertyReadReady(source) ||
      !propertyReadContainsRoom(source, parsed.data.roomTypeId)
    ) {
      return sourceNotReady(
        "FOREST_CITY_CANONICAL_ROOM_SOURCE_INCOMPLETE",
        [target],
        { reason: source.sourceReadiness.reason },
      );
    }
  } catch {
    return sourceNotReady(
      "FOREST_CITY_HOSPITALITY_READ_UNAVAILABLE",
      [target],
    );
  }

  return json(
    {
      status: "booking_not_ready",
      code: "FOREST_CITY_LEGACY_BOOKING_WRITE_RETIRED",
      propertyId: target.property.propertyId,
      accessMode: target.property.accessMode,
      bookingRule: target.property.bookingRule,
      bookingAuthority: false,
      replacementContract:
        "source-backed-hold-checkout-provider-confirmation-v1",
    },
    503,
  );
}

export async function GET(request: NextRequest) {
  return handleForestCityCatalogRequest(request);
}

export async function POST(request: NextRequest) {
  return handleForestCityBookingRequest(request);
}
