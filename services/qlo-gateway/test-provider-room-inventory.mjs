import assert from "node:assert/strict";
import { projectProviderPropertyRoomInventory } from "./provider-room-inventory.mjs";

const importReceipt = {
  properties: {
    "CRAYS-FC-GOLF-HOTEL": {
      propertyId: "property-clubs-forest-city-golf",
      hotelId: 2,
      roomTypes: {
        "golf-superior": { qloRoomTypeId: 11 },
        "golf-suite": { qloRoomTypeId: 12 },
      },
    },
    "CRAYS-FC-MARINA-HOTEL": {
      propertyId: "property-clubs-forest-city-marina",
      hotelId: 3,
      roomTypes: {
        "marina-king": { qloRoomTypeId: 18 },
      },
    },
  },
};

const roomTypeRows = [
  { id: 21, id_hotel: 2, id_product: 11, adults: 2, children: 0, max_adults: 2, max_children: 1, max_guests: 3, min_los: 1, max_los: 14 },
  { id: 22, id_hotel: 2, id_product: 12, adults: 2, children: 0, max_adults: 3, max_children: 2, max_guests: 5, min_los: 1, max_los: 30 },
  { id: 28, id_hotel: 3, id_product: 18, adults: 2, children: 0, max_adults: 2, max_children: 0, max_guests: 2, min_los: 30, max_los: 365 },
  { id: 1, id_hotel: 1, id_product: 1, adults: 99, max_guests: 99 },
];

const physicalRoomRows = [
  { id: 1001, id_hotel: 2, id_product: 11, room_num: "G-101", comment: "must never leave gateway" },
  { id: 1002, id_hotel: 2, id_product: 12, room_num: "G-201", comment: "must never leave gateway" },
  { id: 9001, id_hotel: 1, id_product: 1, room_num: "PALMA-001" },
  { id: 9002, id_hotel: 4, id_product: 50, room_num: "GYM-001" },
];

const golf = projectProviderPropertyRoomInventory({
  externalKey: "CRAYS-FC-GOLF-HOTEL",
  importReceipt,
  roomTypeRows,
  physicalRoomRows,
});
assert.equal(golf.status, "ready");
assert.equal(golf.propertyId, "property-clubs-forest-city-golf");
assert.equal(golf.roomTypeCount, 2);
assert.equal(golf.physicalRoomCount, 2);
assert.deepEqual(golf.categories.map((category) => category.physicalRoomCount), [1, 1]);
assert.doesNotMatch(JSON.stringify(golf), /PALMA|GYM|G-101|G-201|comment|id_hotel|id_product|qloRoomTypeId/i);

const marina = projectProviderPropertyRoomInventory({
  externalKey: "CRAYS-FC-MARINA-HOTEL",
  importReceipt,
  roomTypeRows,
  physicalRoomRows,
});
assert.equal(marina.status, "physical_room_inventory_import_pending");
assert.equal(marina.physicalRoomCount, 0);
assert.equal(marina.categories[0].physicalRoomStatus, "inventory_import_pending");

assert.equal(projectProviderPropertyRoomInventory({
  externalKey: "CRAYS-GYM-FORBIDDEN",
  importReceipt,
  roomTypeRows,
  physicalRoomRows,
}), null);

assert.throws(() => projectProviderPropertyRoomInventory({
  externalKey: "CRAYS-FC-GOLF-HOTEL",
  importReceipt,
  roomTypeRows: roomTypeRows.filter((row) => row.id_product !== 12),
  physicalRoomRows,
}), /qlo_receipt_room_type_missing/);

console.log("CCLUB120_QLO_PROVIDER_ROOM_INVENTORY_PASS checks=13");
