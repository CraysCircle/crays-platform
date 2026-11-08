function safeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function projectProviderPropertyRoomInventory({
  externalKey,
  importReceipt,
  roomTypeRows,
  physicalRoomRows,
}) {
  const propertyReceipt = importReceipt?.properties?.[externalKey];
  if (!propertyReceipt) return null;

  const hotelId = safeInteger(propertyReceipt.hotelId);
  if (hotelId === null || !propertyReceipt.roomTypes) {
    throw new Error("qlo_room_inventory_receipt_invalid");
  }

  const admittedRoomTypes = Object.entries(propertyReceipt.roomTypes).map(
    ([externalRoomTypeKey, roomReceipt]) => {
      const roomTypeId = safeInteger(roomReceipt?.qloRoomTypeId);
      if (roomTypeId === null) {
        throw new Error("qlo_room_inventory_receipt_invalid");
      }
      const providerRoomType = roomTypeRows.find(
        (row) =>
          safeInteger(row?.id_hotel) === hotelId &&
          safeInteger(row?.id_product) === roomTypeId,
      );
      if (!providerRoomType) {
        throw new Error("qlo_receipt_room_type_missing");
      }
      const scopedPhysicalRooms = physicalRoomRows.filter(
        (row) =>
          safeInteger(row?.id_hotel) === hotelId &&
          safeInteger(row?.id_product) === roomTypeId,
      );
      return {
        externalRoomTypeKey,
        adults: safeInteger(providerRoomType.adults) ?? 0,
        children: safeInteger(providerRoomType.children) ?? 0,
        maxAdults: safeInteger(providerRoomType.max_adults) ?? 0,
        maxChildren: safeInteger(providerRoomType.max_children) ?? 0,
        maxGuests: safeInteger(providerRoomType.max_guests) ?? 0,
        minimumLengthOfStay: safeInteger(providerRoomType.min_los) ?? 0,
        maximumLengthOfStay: safeInteger(providerRoomType.max_los) ?? 0,
        physicalRoomCount: scopedPhysicalRooms.length,
        physicalRoomStatus:
          scopedPhysicalRooms.length > 0
            ? "qlo_provider_ready"
            : "inventory_import_pending",
      };
    },
  );

  const physicalRoomCount = admittedRoomTypes.reduce(
    (total, roomType) => total + roomType.physicalRoomCount,
    0,
  );
  return {
    schema: "crays.qlo.property-room-inventory.v1",
    version: "1.0.0",
    status:
      physicalRoomCount > 0
        ? "ready"
        : "physical_room_inventory_import_pending",
    authority: "qlo",
    externalKey,
    propertyId: text(propertyReceipt.propertyId),
    roomTypeCount: admittedRoomTypes.length,
    physicalRoomCount,
    categories: admittedRoomTypes.sort((left, right) =>
      left.externalRoomTypeKey.localeCompare(right.externalRoomTypeKey),
    ),
  };
}
