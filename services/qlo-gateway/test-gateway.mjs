import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

async function listen(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    server,
    port: server.address().port,
  };
}

async function unusedPort() {
  const probe = await listen((_request, response) => response.end());
  const { port } = probe;
  await new Promise((resolve) => probe.server.close(resolve));
  return port;
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

const consumerSecret = "consumer_" + "S".repeat(48);
const qloReadSecret = "Q".repeat(32);
const launchCode = "C".repeat(48);
const browserVerifier = "V".repeat(48);
const sessionCookie = "crays_clubs_team_session=opaque-session";
const captured = [];

const core = await listen(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  captured.push({
    method: request.method,
    url: request.url,
    authorization: request.headers.authorization,
    teamHost: request.headers["x-crays-clubs-team-host"],
    cookie: request.headers.cookie,
    body,
  });

  response.setHeader("content-type", "application/json");
  if (
    request.method === "POST" &&
    request.url === "/api/crays/clubs/team/launch/redeem"
  ) {
    response.setHeader(
      "set-cookie",
      `${sessionCookie}; HttpOnly; Secure; SameSite=Lax; Path=/`,
    );
    response.end(
      JSON.stringify({ status: "consumed", returnPath: "/operations" }),
    );
    return;
  }
  if (
    request.method === "GET" &&
    request.url === "/api/crays/clubs/team/session"
  ) {
    if (request.headers.cookie?.includes("opaque-session")) {
      response.end(
        JSON.stringify({
          status: "active",
          session: {
            sessionId: "must-not-reach-browser",
            role: "holiday_manager",
            propertyId: "property-test-01",
            partnerTenantId: "partner-test-01",
            legalEntityId: "legal-test-01",
            qloShopId: "must-not-reach-browser",
            assuranceLevel: "aal2",
            expiresAt: "2026-07-30T12:00:00.000Z",
          },
        }),
      );
    } else {
      response.statusCode = 401;
      response.end(JSON.stringify({ status: "unauthenticated" }));
    }
    return;
  }
  if (
    request.method === "DELETE" &&
    request.url === "/api/crays/clubs/team/session"
  ) {
    response.setHeader(
      "set-cookie",
      "crays_clubs_team_session=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/",
    );
    response.end(JSON.stringify({ status: "revoked" }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ status: "not_found" }));
});

const qloHotels = [
  {
    id: 2,
    hotel_name: "Forest City Golf Hotel",
    short_description: "Golf-side hotel",
    description: "<p>Imported provider content</p>",
    policies: "Provider policies",
    city: "Forest City",
    rating: 5,
    check_in: "15:00",
    check_out: "12:00",
    active: 1,
  },
  {
    id: 3,
    hotel_name: "Forest City Marina Hotel",
    short_description: "Marina-side hotel",
    description: "<p>Imported marina content</p>",
    policies: "Provider policies",
    city: "Forest City",
    rating: 5,
    check_in: "15:00",
    check_out: "12:00",
    active: 1,
  },
  { id: 99, hotel_name: "Unadmitted Qlo sample", active: 1 },
];
const qloRoomTypes = [
  {
    id: 11,
    id_hotel: 2,
    name: "Superior Room",
    description: "<p>Golf room</p>",
    description_short: "Golf room",
    adults: 2,
    children: 1,
    active: 1,
    show_at_front: 1,
    available_for_order: 0,
    show_price: 0,
  },
  {
    id: 18,
    id_hotel: 3,
    name: "Superior Twin",
    description: "<p>Marina room</p>",
    description_short: "Marina room",
    adults: 2,
    children: 1,
    active: 1,
    show_at_front: 1,
    available_for_order: 0,
    show_price: 0,
  },
];
const qloHotelRoomTypes = [
  {
    id: 21,
    id_hotel: 2,
    id_product: 11,
    adults: 2,
    children: 1,
    max_adults: 2,
    max_children: 1,
    max_guests: 3,
    min_los: 1,
    max_los: 30,
  },
  {
    id: 28,
    id_hotel: 3,
    id_product: 18,
    adults: 2,
    children: 1,
    max_adults: 2,
    max_children: 1,
    max_guests: 3,
    min_los: 30,
    max_los: 365,
  },
  { id: 1, id_hotel: 99, id_product: 99, adults: 99, max_guests: 99 },
];
const qloPhysicalRooms = [
  { id: 9001, id_hotel: 99, id_product: 99, room_num: "PALMA-001", comment: "forbidden" },
  { id: 9002, id_hotel: 4, id_product: 50, room_num: "GYM-001", comment: "forbidden" },
];

const qlo = await listen((_request, response) => {
  const expectedAuthorization =
    `Basic ${Buffer.from(`${qloReadSecret}:`, "utf8").toString("base64")}`;
  if (_request.headers.authorization !== expectedAuthorization) {
    response.statusCode = 401;
    response.end();
    return;
  }
  if (_request.url?.startsWith("/api/hotels?")) {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ hotels: qloHotels }));
    return;
  }
  if (_request.url?.startsWith("/api/room_types?")) {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ room_types: qloRoomTypes }));
    return;
  }
  if (_request.url?.startsWith("/api/hotel_room_types?")) {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ hotel_room_types: qloHotelRoomTypes }));
    return;
  }
  if (_request.url?.startsWith("/api/hotel_rooms?")) {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ rooms: qloPhysicalRooms }));
    return;
  }
  if (_request.url === "/api/images/hotels/2/501") {
    response.setHeader("content-type", "image/jpeg");
    response.end(Buffer.from("golf-image"));
    return;
  }
  if (_request.url === "/api/images/hotels/3/601") {
    response.setHeader("content-type", "image/jpeg");
    response.end(Buffer.from("marina-image"));
    return;
  }
  response.statusCode = 404;
  response.end();
});

const gatewayPort = await unusedPort();
const temporaryDirectory = await mkdtemp(join(tmpdir(), "crays-gateway-test-"));
const tokenFile = join(temporaryDirectory, "consumer-token");
await writeFile(tokenFile, `${consumerSecret}\n`, { mode: 0o600 });
const qloReadKeyFile = join(temporaryDirectory, "qlo-read-key");
await writeFile(qloReadKeyFile, `${qloReadSecret}\n`, { mode: 0o600 });
const qloReceiptFile = join(temporaryDirectory, "qlo-import-receipt.json");
await writeFile(
  qloReceiptFile,
  JSON.stringify({
    schema: "crays.qlo.forest-city-hotel-import-receipt.v1",
    status: "completed",
    properties: {
      "CRAYS-FC-GOLF-HOTEL": {
        propertyId: "property-clubs-forest-city-golf",
        hotelId: 2,
        roomTypes: {
          "room-category-fc-golf-superior-room": {
            qloRoomTypeId: 11,
            bookable: false,
            showPrice: false,
            price: 0,
          },
        },
        media: {
          "golf-gallery-001": {
            qloImageId: 501,
            alt: "Golf exterior",
            galleryOrder: 1,
            sha256: "a".repeat(64),
            licenseReceiptId: "license-golf",
          },
        },
      },
      "CRAYS-FC-MARINA-HOTEL": {
        propertyId: "property-clubs-forest-city-marina",
        hotelId: 3,
        roomTypes: {
          "room-category-fc-marina-superior-twin": {
            qloRoomTypeId: 18,
            bookable: false,
            showPrice: false,
            price: 0,
          },
        },
        media: {
          "marina-gallery-001": {
            qloImageId: 601,
            alt: "Marina exterior",
            galleryOrder: 1,
            sha256: "b".repeat(64),
            licenseReceiptId: "license-marina",
          },
        },
      },
    },
  }),
  { mode: 0o600 },
);

let childOutput = "";
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL("./server.mjs", import.meta.url))],
  {
  env: {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(gatewayPort),
    CRAYS_CLUBS_CORE_BASE_URL: `http://127.0.0.1:${core.port}`,
    CRAYS_CLUBS_QLO_UPSTREAM: `http://127.0.0.1:${qlo.port}`,
    CRAYS_CLUBS_B2B_START_URL:
      `http://127.0.0.1:${core.port}/operations?launch=clubs-team`,
    CRAYS_CLUBS_TEAM_CONSUMER_TOKEN_FILE: tokenFile,
    CRAYS_CLUBS_QLO_PROVIDER_READ_KEY_FILE: qloReadKeyFile,
    CRAYS_CLUBS_QLO_IMPORT_RECEIPT_FILE: qloReceiptFile,
  },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.on("data", (chunk) => {
  childOutput += chunk.toString("utf8");
});
child.stderr.on("data", (chunk) => {
  childOutput += chunk.toString("utf8");
});

const gatewayUrl = `http://127.0.0.1:${gatewayPort}`;

async function waitForGateway() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${gatewayUrl}/healthz`);
      if (response.status === 200) return;
    } catch {
      // The child may still be binding its local test port.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Gateway did not become ready: ${childOutput}`);
}

try {
  await waitForGateway();

  const health = await fetch(`${gatewayUrl}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    status: "ready",
    qlo: "provider_readable",
  });

  const providerDenied = await fetch(`${gatewayUrl}/api/provider/hotels`);
  assert.equal(providerDenied.status, 401);
  assert.deepEqual(await providerDenied.json(), {
    status: "authentication_required",
  });

  const providerWrongBearer = await fetch(
    `${gatewayUrl}/api/provider/hotels`,
    { headers: { authorization: "Bearer wrong-token" } },
  );
  assert.equal(providerWrongBearer.status, 401);

  const providerHotels = await fetch(`${gatewayUrl}/api/provider/hotels`, {
    headers: { authorization: `Bearer ${consumerSecret}` },
  });
  assert.equal(providerHotels.status, 200);
  const providerPayload = await providerHotels.json();
  assert.equal(providerPayload.authority, "qlo");
  assert.equal(providerPayload.inventoryStatus, "channel_manager_pending");
  assert.equal(providerPayload.paymentStatus, "payment_setup_pending");
  assert.equal(providerPayload.hotels.length, 2);
  assert.deepEqual(
    providerPayload.hotels.map((hotel) => hotel.externalKey),
    ["CRAYS-FC-GOLF-HOTEL", "CRAYS-FC-MARINA-HOTEL"],
  );
  assert.ok(
    providerPayload.hotels.every(
      (hotel) =>
        hotel.contentAuthority === "qlo" &&
        hotel.roomTypes.every(
          (room) =>
            room.bookable === false &&
            room.rate === null &&
            room.availability === null,
        ),
    ),
  );
  assert.doesNotMatch(JSON.stringify(providerPayload), /qloImageId|hotelId/);
  assert.doesNotMatch(JSON.stringify(providerPayload), /Unadmitted Qlo sample/);

  const providerRoomInventory = await fetch(
    `${gatewayUrl}/api/provider/hotels/CRAYS-FC-GOLF-HOTEL/room-inventory`,
    { headers: { authorization: `Bearer ${consumerSecret}` } },
  );
  assert.equal(providerRoomInventory.status, 200);
  const roomInventoryPayload = await providerRoomInventory.json();
  assert.equal(
    roomInventoryPayload.status,
    "physical_room_inventory_import_pending",
  );
  assert.equal(
    roomInventoryPayload.propertyId,
    "property-clubs-forest-city-golf",
  );
  assert.equal(roomInventoryPayload.roomTypeCount, 1);
  assert.equal(roomInventoryPayload.physicalRoomCount, 0);
  assert.doesNotMatch(
    JSON.stringify(roomInventoryPayload),
    /PALMA|GYM|room_num|comment|id_hotel|id_product|qloRoomTypeId/i,
  );

  const providerRoomInventoryDenied = await fetch(
    `${gatewayUrl}/api/provider/hotels/CRAYS-FC-GOLF-HOTEL/room-inventory`,
  );
  assert.equal(providerRoomInventoryDenied.status, 401);

  const crossVerticalRoomInventory = await fetch(
    `${gatewayUrl}/api/provider/hotels/CRAYS-GYM-FORBIDDEN/room-inventory`,
    { headers: { authorization: `Bearer ${consumerSecret}` } },
  );
  assert.equal(crossVerticalRoomInventory.status, 404);

  const providerServices = await fetch(
    `${gatewayUrl}/api/provider/hotels/CRAYS-FC-GOLF-HOTEL/services`,
    { headers: { authorization: `Bearer ${consumerSecret}` } },
  );
  assert.equal(providerServices.status, 200);
  const providerServicesPayload = await providerServices.json();
  assert.equal(providerServicesPayload.status, "service_catalog_import_pending");
  assert.equal(providerServicesPayload.serviceCount, 0);
  assert.deepEqual(providerServicesPayload.services, []);

  const providerServicesDenied = await fetch(
    `${gatewayUrl}/api/provider/hotels/CRAYS-FC-GOLF-HOTEL/services`,
  );
  assert.equal(providerServicesDenied.status, 401);

  const crossVerticalServices = await fetch(
    `${gatewayUrl}/api/provider/hotels/CRAYS-GYM-FORBIDDEN/services`,
    { headers: { authorization: `Bearer ${consumerSecret}` } },
  );
  assert.equal(crossVerticalServices.status, 404);

  const providerImage = await fetch(
    `${gatewayUrl}/api/provider/hotels/CRAYS-FC-GOLF-HOTEL/images/golf-gallery-001`,
    { headers: { authorization: `Bearer ${consumerSecret}` } },
  );
  assert.equal(providerImage.status, 200);
  assert.equal(providerImage.headers.get("content-type"), "image/jpeg");
  assert.equal(Buffer.from(await providerImage.arrayBuffer()).toString(), "golf-image");

  const providerImageDenied = await fetch(
    `${gatewayUrl}/api/provider/hotels/CRAYS-FC-GOLF-HOTEL/images/not-in-receipt`,
    { headers: { authorization: `Bearer ${consumerSecret}` } },
  );
  assert.equal(providerImageDenied.status, 404);

  const exchange = await fetch(
    `${gatewayUrl}/auth/exchange?code=${launchCode}#verifier=${browserVerifier}`,
  );
  const exchangeHtml = await exchange.text();
  assert.equal(exchange.status, 200);
  assert.match(
    exchange.headers.get("content-security-policy") ?? "",
    /default-src 'none'/,
  );
  assert.doesNotMatch(exchangeHtml, new RegExp(launchCode));
  assert.doesNotMatch(exchangeHtml, new RegExp(browserVerifier));
  assert.match(exchangeHtml, /history\.replaceState/);

  const invalidRedeem = await fetch(
    `${gatewayUrl}/auth/exchange/redeem`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "short", browserVerifier: "short" }),
    },
  );
  assert.equal(invalidRedeem.status, 400);

  const redeem = await fetch(`${gatewayUrl}/auth/exchange/redeem`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: launchCode,
      browserVerifier,
    }),
  });
  assert.equal(redeem.status, 200);
  assert.match(redeem.headers.get("set-cookie") ?? "", /opaque-session/);
  assert.deepEqual(await redeem.json(), {
    status: "consumed",
    returnPath: "/operations",
  });

  const redeemCall = captured.find(
    (entry) =>
      entry.method === "POST" &&
      entry.url === "/api/crays/clubs/team/launch/redeem",
  );
  assert.equal(redeemCall.authorization, `Bearer ${consumerSecret}`);
  assert.equal(redeemCall.teamHost, "team.craysclub.com");
  assert.deepEqual(JSON.parse(redeemCall.body), {
    code: launchCode,
    browserVerifier,
  });

  const session = await fetch(`${gatewayUrl}/api/session`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(session.status, 200);
  const sessionPayload = await session.json();
  assert.equal(sessionPayload.status, "active");
  assert.equal(sessionPayload.session.propertyId, "property-test-01");
  assert.equal(sessionPayload.session.sessionId, undefined);
  assert.equal(sessionPayload.session.qloShopId, undefined);

  const operations = await fetch(`${gatewayUrl}/operations`, {
    headers: { cookie: sessionCookie },
  });
  const operationsHtml = await operations.text();
  assert.equal(operations.status, 200);
  assert.match(operationsHtml, /property-test-01/);
  assert.match(operationsHtml, /partner-test-01/);
  assert.doesNotMatch(operationsHtml, /qlo[_-](room|employee|customer)_id/i);

  const unauthenticated = await fetch(`${gatewayUrl}/operations`);
  const unauthenticatedHtml = await unauthenticated.text();
  assert.equal(unauthenticated.status, 401);
  assert.match(
    unauthenticatedHtml,
    new RegExp(
      `http:\\/\\/127\\.0\\.0\\.1:${core.port}\\/operations\\?launch=clubs-team`,
    ),
  );

  const b2cCookie = "appSession=b2c-only-session";
  const b2cOperations = await fetch(`${gatewayUrl}/operations`, {
    headers: { cookie: b2cCookie },
  });
  assert.equal(b2cOperations.status, 401);
  assert.doesNotMatch(await b2cOperations.text(), /Authorized property workspace/);

  const b2cApi = await fetch(`${gatewayUrl}/api/session`, {
    headers: { cookie: b2cCookie },
  });
  assert.equal(b2cApi.status, 401);
  assert.deepEqual(await b2cApi.json(), {
    status: "authentication_required",
  });

  const deniedDeepLinks = [
    ["/operations/properties/property-other", "GET"],
    ["/api/properties/property-other", "GET"],
    ["/api/properties/property-other/reservations", "GET"],
    ["/api/properties/bulk", "POST"],
    ["/operations", "POST"],
    ["/auth/exchange/redeem", "GET"],
    ["/index.php?controller=AdminLogin", "GET"],
  ];
  for (const [pathname, method] of deniedDeepLinks) {
    const response = await fetch(`${gatewayUrl}${pathname}`, {
      method,
      headers: { cookie: b2cCookie },
    });
    assert.equal(response.status, 404, `${method} ${pathname} must fail closed`);
    assert.deepEqual(await response.json(), { status: "not_found" });
  }

  const nativeQloRoute = await fetch(`${gatewayUrl}/admin123/index.php`);
  assert.equal(nativeQloRoute.status, 404);

  const logout = await fetch(`${gatewayUrl}/logout`, {
    method: "POST",
    redirect: "manual",
    headers: { cookie: sessionCookie },
  });
  assert.equal(logout.status, 303);
  assert.equal(logout.headers.get("location"), "/");
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);
  assert.ok(
    captured.some(
      (entry) =>
        entry.method === "DELETE" &&
        entry.url === "/api/crays/clubs/team/session",
    ),
  );

  assert.doesNotMatch(childOutput, new RegExp(consumerSecret));
  assert.doesNotMatch(childOutput, new RegExp(qloReadSecret));
  assert.doesNotMatch(childOutput, new RegExp(launchCode));
  assert.doesNotMatch(childOutput, new RegExp(browserVerifier));
  console.log("clubs_team_gateway=PASS");
  console.log("b2c_backoffice_denial=PASS");
  console.log("object_bulk_deep_link_denial=PASS");
  console.log("native_qlo_public_routes=DENIED");
  console.log("native_qlo_provider_projection=PASS");
  console.log("native_qlo_receipt_media_proxy=PASS");
  console.log("native_qlo_property_room_inventory=PASS");
  console.log("native_qlo_property_service_catalog=PASS");
  console.log("core_session_forwarding=PASS");
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
  await Promise.all([close(core.server), close(qlo.server)]);
  await rm(temporaryDirectory, { recursive: true, force: true });
}
