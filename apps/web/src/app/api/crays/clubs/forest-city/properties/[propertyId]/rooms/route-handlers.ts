import "server-only";

import { readForestCityQloProviderHotel } from "@/lib/clubs/qlo-provider-read-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

const PROPERTY_RULES = {
  "property-clubs-forest-city-golf": {
    accessMode: "open",
    allowedStayUnits: ["night", "week", "month"],
    membershipRequired: false,
    propertyAdmissionRequired: false,
  },
  "property-clubs-forest-city-marina": {
    accessMode: "property_admission_required",
    allowedStayUnits: ["month"],
    membershipRequired: true,
    propertyAdmissionRequired: true,
  },
} as const;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

export type ForestCityRoomCategoryRouteDependencies = {
  readProviderHotel: typeof readForestCityQloProviderHotel;
};

const defaults: ForestCityRoomCategoryRouteDependencies = {
  readProviderHotel: readForestCityQloProviderHotel,
};

function categoryKind(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("accessible") || normalized.includes("disabled")) {
    return "accessible_room";
  }
  return normalized.includes("suite") ? "suite" : "room";
}

export async function handleForestCityRoomCategorySetRequest(
  requestedPropertyId: string,
  deps: ForestCityRoomCategoryRouteDependencies = defaults,
) {
  const rules = PROPERTY_RULES[requestedPropertyId as keyof typeof PROPERTY_RULES];
  if (!rules) {
    return json(
      {
        schema: "crays.forest-city.qlo-room-category-set-ui.v2",
        version: "2.0.0",
        status: "not_found",
        code: "FOREST_CITY_ROOM_CATEGORY_PROPERTY_NOT_FOUND",
      },
      404,
    );
  }

  try {
    const hotel = await deps.readProviderHotel(requestedPropertyId);
    if (!hotel || !hotel.active) {
      return json(
        {
          schema: "crays.forest-city.qlo-room-category-set-ui.v2",
          version: "2.0.0",
          status: "not_found",
          code: "FOREST_CITY_QLO_ROOM_CATEGORY_PROPERTY_NOT_FOUND",
        },
        404,
      );
    }
    return json(
      {
        schema: "crays.forest-city.qlo-room-category-set-ui.v2",
        version: "2.0.0",
        status: "ready_qlo_provider_non_bookable",
        code: "FOREST_CITY_QLO_ROOM_CATEGORY_SET_READY_NON_BOOKABLE",
        propertyId: hotel.propertyId,
        authorities: {
          publicRoomCategorySet: {
            ready: true,
            status: "qlo_provider_ready_non_bookable",
            authority: "qlo",
          },
          providerRoomSet: {
            ready: true,
            status: "qlo_provider_mapped",
            authority: "qlo",
          },
          rateAssociation: {
            ready: false,
            status: "channel_manager_pending",
          },
          availability: {
            ready: false,
            status: "channel_manager_pending",
          },
          booking: {
            ready: false,
            status: "channel_manager_pending",
          },
          payment: {
            ready: false,
            status: "payment_setup_pending",
          },
        },
        persistence: {
          ready: true,
          status: "qlo_provider_read",
          scope: "server_side_qlo_gateway",
          sourceSetMatch: true,
          providerRoomMappingReady: true,
          rateAssociationReady: false,
          availabilityReady: false,
          bookingReady: false,
        },
        roomCategorySet: {
          propertyId: hotel.propertyId,
          propertyName: hotel.name,
          status: "qlo_provider_ready_non_bookable",
          accessMode: rules.accessMode,
          membershipRequired: rules.membershipRequired,
          propertyAdmissionRequired: rules.propertyAdmissionRequired,
          allowedStayUnits: rules.allowedStayUnits,
          publishedTotal: null,
          inventoryStatus: "channel_manager_pending",
          categories: hotel.roomTypes.map((room, index) => ({
            roomCategoryId: room.externalRoomTypeKey,
            externalRoomTypeKey: room.externalRoomTypeKey,
            propertyId: hotel.propertyId,
            displayName: room.name,
            sourceLabel: room.name,
            discoveryOrder: index + 1,
            categoryKind: categoryKind(room.name),
            inventoryCount: null,
            inventoryCountAuthority: "channel_manager_pending",
            sizeSquareMetres: null,
            discoveryText: room.description || room.shortDescription || null,
            admissionState: "qlo_provider_admitted_public_room_category",
            providerRoomTypeId: null,
            canonicalBookingRoomTypeId: null,
            rateAssociationStatus: "channel_manager_pending",
            rates: null,
            availability: null,
            bookable: false,
            paymentStatus: "payment_setup_pending",
          })),
        },
      },
      200,
    );
  } catch {
    return json(
      {
        schema: "crays.forest-city.qlo-room-category-set-ui.v2",
        version: "2.0.0",
        status: "room_set_unavailable",
        code: "FOREST_CITY_QLO_ROOM_CATEGORY_SET_UNAVAILABLE",
        propertyId: requestedPropertyId,
        authorities: {
          publicRoomCategorySet: {
            ready: false,
            status: "qlo_provider_unavailable",
            authority: "qlo",
          },
        },
        roomCategorySet: null,
      },
      503,
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ propertyId: string }> },
) {
  const { propertyId } = await context.params;
  return handleForestCityRoomCategorySetRequest(propertyId);
}
