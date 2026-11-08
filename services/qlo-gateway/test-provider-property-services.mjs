import assert from "node:assert/strict";
import { projectProviderPropertyServices } from "./provider-property-services.mjs";

const baseReceipt = {
  properties: {
    "CRAYS-FC-GOLF-HOTEL": {
      propertyId: "property-clubs-forest-city-golf",
      hotelId: 2,
      roomTypes: {},
    },
    "CRAYS-FC-MARINA-HOTEL": {
      propertyId: "property-clubs-forest-city-marina",
      hotelId: 3,
      roomTypes: {},
    },
  },
};

const pending = projectProviderPropertyServices({
  externalKey: "CRAYS-FC-GOLF-HOTEL",
  importReceipt: baseReceipt,
  serviceRows: [
    { id: 1, name: "Legacy Palma transfer", active: 1, available_for_order: 1 },
    { id: 2, name: "Gym coaching", active: 1, available_for_order: 1 },
  ],
});
assert.equal(pending.status, "service_catalog_import_pending");
assert.equal(pending.serviceCount, 0);
assert.deepEqual(pending.services, []);
assert.doesNotMatch(JSON.stringify(pending), /Palma|Gym/i);

const admittedReceipt = structuredClone(baseReceipt);
admittedReceipt.properties["CRAYS-FC-GOLF-HOTEL"].services = {
  "golf-airport-transfer": { qloServiceId: 40 },
};
const admitted = projectProviderPropertyServices({
  externalKey: "CRAYS-FC-GOLF-HOTEL",
  importReceipt: admittedReceipt,
  serviceRows: [
    { id: 1, name: "Legacy Palma transfer", active: 1, available_for_order: 1 },
    { id: 40, name: "Forest City transfer", description: "<p>Authorized pickup</p>", description_short: "Pickup", active: 1, show_at_front: 1, available_for_order: 1, price: "100.00" },
  ],
});
assert.equal(admitted.status, "ready_non_bookable");
assert.equal(admitted.serviceCount, 1);
assert.equal(admitted.services[0].externalServiceKey, "golf-airport-transfer");
assert.equal(admitted.services[0].name, "Forest City transfer");
assert.equal(admitted.services[0].description, "Authorized pickup");
assert.equal(admitted.services[0].bookable, false);
assert.equal(admitted.services[0].rate, null);
assert.doesNotMatch(JSON.stringify(admitted), /qloServiceId|\"id\"|100\.00|Palma/i);

assert.equal(projectProviderPropertyServices({
  externalKey: "CRAYS-GYM-FORBIDDEN",
  importReceipt: baseReceipt,
  serviceRows: [],
}), null);
assert.throws(() => projectProviderPropertyServices({
  externalKey: "CRAYS-FC-GOLF-HOTEL",
  importReceipt: admittedReceipt,
  serviceRows: [],
}), /qlo_receipt_service_missing/);

console.log("CCLUB120_QLO_PROVIDER_PROPERTY_SERVICES_PASS checks=14");
