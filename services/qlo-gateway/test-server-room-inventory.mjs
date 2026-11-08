import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function json(response, body) {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const token = "provider-consumer-token-1234567890abcdef";
const temp = await mkdtemp(join(tmpdir(), "crays-qlo-gateway-test-"));
const qlo = createServer((request, response) => {
  const pathname = new URL(request.url, "http://qlo.test").pathname;
  if (pathname === "/api/hotel_room_types") {
    return json(response, {
      hotel_room_types: [
        { id: 21, id_hotel: 2, id_product: 11, adults: 2, children: 0, max_adults: 2, max_children: 0, max_guests: 2, min_los: 1, max_los: 30 },
        { id: 28, id_hotel: 3, id_product: 18, adults: 2, children: 0, max_adults: 2, max_children: 0, max_guests: 2, min_los: 30, max_los: 365 },
        { id: 1, id_hotel: 1, id_product: 1, adults: 99, max_guests: 99 },
      ],
    });
  }
  if (pathname === "/api/hotel_rooms") {
    return json(response, {
      rooms: [
        { id: 9001, id_hotel: 1, id_product: 1, room_num: "PALMA-001", comment: "forbidden" },
        { id: 9002, id_hotel: 4, id_product: 50, room_num: "GYM-001", comment: "forbidden" },
      ],
    });
  }
  if (pathname === "/api/hotels") return json(response, { hotels: [] });
  response.writeHead(404).end();
});
const core = createServer((_request, response) => {
  response.writeHead(401, { "content-type": "application/json" });
  response.end('{"status":"authentication_required"}');
});

await listen(qlo);
await listen(core);
const qloPort = qlo.address().port;
const corePort = core.address().port;
const portProbe = createServer();
await listen(portProbe);
const gatewayPort = portProbe.address().port;
await close(portProbe);

await writeFile(join(temp, "consumer-token"), token);
await writeFile(join(temp, "provider-key"), "qlo-read-key-1234567890abcdef");
await writeFile(join(temp, "receipt.json"), JSON.stringify({
  schema: "crays.qlo.forest-city-hotel-import-receipt.v1",
  status: "completed",
  properties: {
    "CRAYS-FC-GOLF-HOTEL": {
      propertyId: "property-clubs-forest-city-golf",
      hotelId: 2,
      roomTypes: { "golf-superior": { qloRoomTypeId: 11 } },
    },
    "CRAYS-FC-MARINA-HOTEL": {
      propertyId: "property-clubs-forest-city-marina",
      hotelId: 3,
      roomTypes: { "marina-king": { qloRoomTypeId: 18 } },
    },
  },
}));

const gateway = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL(".", import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(gatewayPort),
    CRAYS_CLUBS_CORE_BASE_URL: `http://127.0.0.1:${corePort}`,
    CRAYS_CLUBS_QLO_UPSTREAM: `http://127.0.0.1:${qloPort}`,
    CRAYS_CLUBS_B2B_START_URL: `http://127.0.0.1:${corePort}/operations`,
    CRAYS_CLUBS_TEAM_CONSUMER_TOKEN_FILE: join(temp, "consumer-token"),
    CRAYS_CLUBS_QLO_PROVIDER_READ_KEY_FILE: join(temp, "provider-key"),
    CRAYS_CLUBS_QLO_IMPORT_RECEIPT_FILE: join(temp, "receipt.json"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  let response;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      response = await fetch(
        `http://127.0.0.1:${gatewayPort}/api/provider/hotels/CRAYS-FC-GOLF-HOTEL/room-inventory`,
        { headers: { "x-crays-clubs-provider-token": token } },
      );
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  assert.ok(response, "gateway did not start");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, "physical_room_inventory_import_pending");
  assert.equal(payload.propertyId, "property-clubs-forest-city-golf");
  assert.equal(payload.roomTypeCount, 1);
  assert.equal(payload.physicalRoomCount, 0);
  assert.doesNotMatch(JSON.stringify(payload), /PALMA|GYM|room_num|comment|id_hotel|id_product/i);

  const unauthorized = await fetch(
    `http://127.0.0.1:${gatewayPort}/api/provider/hotels/CRAYS-FC-GOLF-HOTEL/room-inventory`,
  );
  assert.equal(unauthorized.status, 401);

  const forbidden = await fetch(
    `http://127.0.0.1:${gatewayPort}/api/provider/hotels/CRAYS-GYM-FORBIDDEN/room-inventory`,
    { headers: { "x-crays-clubs-provider-token": token } },
  );
  assert.equal(forbidden.status, 404);
  console.log("CCLUB120_QLO_GATEWAY_ROOM_INVENTORY_E2E_PASS checks=9");
} finally {
  gateway.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => gateway.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  await Promise.all([close(qlo), close(core)]);
  await rm(temp, { recursive: true, force: true });
}
