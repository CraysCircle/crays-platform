import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { projectProviderPropertyRoomInventory } from "./provider-room-inventory.mjs";
import { projectProviderPropertyServices } from "./provider-property-services.mjs";

const canonicalHost = "team.craysclub.com";
const listenPort = boundedPort(process.env.PORT, 8080);
const coreBaseUrl = serviceUrl(
  process.env.CRAYS_CLUBS_CORE_BASE_URL,
  "CRAYS_CLUBS_CORE_BASE_URL",
);
const qloUpstream = serviceUrl(
  process.env.CRAYS_CLUBS_QLO_UPSTREAM,
  "CRAYS_CLUBS_QLO_UPSTREAM",
);
const b2bStartUrl = publicB2bUrl(process.env.CRAYS_CLUBS_B2B_START_URL);
const consumerTokenFile =
  process.env.CRAYS_CLUBS_TEAM_CONSUMER_TOKEN_FILE?.trim() ?? "";
const coreProtectionBypassFile =
  process.env.CRAYS_CLUBS_CORE_PROTECTION_BYPASS_FILE?.trim() ?? "";
const qloProviderReadKeyFile =
  process.env.CRAYS_CLUBS_QLO_PROVIDER_READ_KEY_FILE?.trim() ?? "";
const qloImportReceiptFile =
  process.env.CRAYS_CLUBS_QLO_IMPORT_RECEIPT_FILE?.trim() ?? "";
const coreUsesVercelProtection =
  coreBaseUrl.hostname.endsWith(".vercel.app");
if (coreUsesVercelProtection !== Boolean(coreProtectionBypassFile)) {
  throw new Error(
    "A Core protection-bypass file is required only for a protected Vercel Core target.",
  );
}
const loadedConsumerToken = await loadSecret(
  consumerTokenFile,
  "Gateway consumer token",
  32,
);
const loadedCoreProtectionBypass = coreProtectionBypassFile
  ? await loadSecret(
      coreProtectionBypassFile,
      "Core protection-bypass token",
      24,
    )
  : "";
const loadedQloProviderReadKey = await loadSecret(
  qloProviderReadKeyFile,
  "Qlo provider read key",
  24,
);
const loadedQloImportReceipt = await loadImportReceipt(qloImportReceiptFile);
dropRootAfterSecretRead();

async function loadSecret(path, name, minimumLength) {
  if (!path) {
    throw new Error(`${name} file is not configured.`);
  }
  const value = (await readFile(path, "utf8")).trim();
  if (value.length < minimumLength) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

async function loadImportReceipt(path) {
  if (!path) throw new Error("Qlo import receipt file is not configured.");
  const receipt = JSON.parse(await readFile(path, "utf8"));
  if (
    receipt?.schema !== "crays.qlo.forest-city-hotel-import-receipt.v1" ||
    receipt?.status !== "completed" ||
    !receipt.properties ||
    typeof receipt.properties !== "object" ||
    Array.isArray(receipt.properties)
  ) {
    throw new Error("Qlo import receipt is invalid or incomplete.");
  }
  const admittedKeys = [
    "CRAYS-FC-GOLF-HOTEL",
    "CRAYS-FC-MARINA-HOTEL",
  ];
  const receivedKeys = Object.keys(receipt.properties).sort();
  if (
    admittedKeys.length !== receivedKeys.length ||
    !admittedKeys.every((key, index) => key === receivedKeys[index])
  ) {
    throw new Error("Qlo import receipt property scope is invalid.");
  }
  return receipt;
}

function dropRootAfterSecretRead() {
  if (
    typeof process.getuid !== "function" ||
    typeof process.setuid !== "function" ||
    typeof process.setgid !== "function"
  ) {
    return;
  }
  if (process.getuid() === 0) {
    process.setgid("node");
    process.setuid("node");
  }
  if (process.getuid() === 0) {
    throw new Error("Gateway privilege drop failed.");
  }
}

function boundedPort(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 65535
    ? parsed
    : fallback;
}

function isLoopback(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function serviceUrl(value, name) {
  if (!value?.trim()) throw new Error(`${name} is required.`);
  const parsed = new URL(value);
  const admittedInternalQlo =
    name === "CRAYS_CLUBS_QLO_UPSTREAM" &&
    parsed.protocol === "http:" &&
    /^[a-z0-9-]+$/.test(parsed.hostname);
  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" && isLoopback(parsed.hostname)) &&
    !admittedInternalQlo
  ) {
    throw new Error(
      `${name} must use HTTPS, loopback HTTP or the internal Qlo service.`,
    );
  }
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function publicB2bUrl(value) {
  if (!value?.trim()) {
    throw new Error("CRAYS_CLUBS_B2B_START_URL is required.");
  }
  const parsed = new URL(value);
  const admittedLoopbackTest =
    process.env.NODE_ENV === "test" &&
    parsed.protocol === "http:" &&
    isLoopback(parsed.hostname);
  if (
    (parsed.protocol !== "https:" && !admittedLoopbackTest) ||
    parsed.origin !== coreBaseUrl.origin
  ) {
    throw new Error(
      "CRAYS_CLUBS_B2B_START_URL must share the admitted HTTPS Core origin.",
    );
  }
  return parsed;
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );
}

function baseHeaders(contentType) {
  return {
    "cache-control": "no-store",
    "content-type": contentType,
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-robots-tag": "noindex, nofollow, noarchive",
  };
}

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    ...baseHeaders("application/json; charset=utf-8"),
    ...extraHeaders,
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

function sendHtml(response, status, body, nonce) {
  response.writeHead(status, {
    ...baseHeaders("text/html; charset=utf-8"),
    "content-security-policy":
      `default-src 'none'; base-uri 'none'; form-action 'self'; ` +
      `frame-ancestors 'none'; connect-src 'self'; ` +
      `script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'`,
  });
  response.end(body);
}

function gatewayDocument({ title, body, nonce, script = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style nonce="${nonce}">
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#f7f3ec; color:#161616; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px; }
    main { width:min(720px,100%); border:1px solid rgba(22,22,22,.14); border-radius:20px; background:#fff; padding:clamp(24px,5vw,48px); box-shadow:0 20px 70px rgba(18,55,57,.08); }
    .eyebrow { margin:0 0 12px; color:#123739; font-size:.75rem; font-weight:750; letter-spacing:.16em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(2rem,7vw,3.4rem); line-height:1; letter-spacing:-.045em; }
    p { color:#5b5b57; line-height:1.65; }
    dl { display:grid; gap:12px; margin:28px 0; }
    dl div { display:grid; gap:4px; padding:12px 0; border-bottom:1px solid rgba(22,22,22,.1); }
    dt { color:#6b6b66; font-size:.78rem; text-transform:uppercase; letter-spacing:.08em; }
    dd { margin:0; font-weight:650; overflow-wrap:anywhere; }
    a,button { min-height:44px; border:0; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; padding:0 22px; background:#123739; color:#fff; font:inherit; font-weight:700; text-decoration:none; cursor:pointer; }
    button.secondary { background:#fff; color:#123739; outline:1px solid rgba(18,55,57,.28); }
    .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:28px; }
    [role=alert] { color:#a20e4d; font-weight:650; }
    @media (max-width:480px) { body { padding:12px; } main { border-radius:16px; padding:24px 20px; } .actions>* { width:100%; } }
  </style>
</head>
<body>
  <main>${body}</main>
  ${script ? `<script nonce="${nonce}">${script}</script>` : ""}
</body>
</html>`;
}

async function consumerToken() {
  return loadedConsumerToken;
}

async function coreProtectionHeaders() {
  if (!coreProtectionBypassFile) return {};
  return { "x-vercel-protection-bypass": loadedCoreProtectionBypass };
}

async function readJsonBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validExchangeInput(payload) {
  return (
    payload &&
    typeof payload === "object" &&
    /^[A-Za-z0-9_-]{43,128}$/.test(payload.code ?? "") &&
    /^[A-Za-z0-9_-]{43,128}$/.test(payload.browserVerifier ?? "")
  );
}

function safeReturnPath(value) {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    value.length <= 200
  )
    ? value
    : "/operations";
}

function browserSession(payload) {
  if (
    payload?.status !== "active" ||
    !payload.session ||
    typeof payload.session !== "object"
  ) {
    return null;
  }
  const session = payload.session;
  return {
    role: String(session.role ?? ""),
    propertyId: String(session.propertyId ?? ""),
    partnerTenantId: String(session.partnerTenantId ?? ""),
    legalEntityId: String(session.legalEntityId ?? ""),
    assuranceLevel: String(session.assuranceLevel ?? ""),
    expiresAt: String(session.expiresAt ?? ""),
  };
}

async function coreRequest(pathname, options = {}) {
  const target = new URL(pathname, coreBaseUrl);
  const token = await consumerToken();
  const protectionHeaders = await coreProtectionHeaders();
  return fetch(target, {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(7000),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "x-crays-clubs-team-host": canonicalHost,
      "x-correlation-id": `clubs-gateway-${randomUUID()}`,
      ...protectionHeaders,
      ...options.headers,
    },
  });
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ""), "utf8");
  const rightBuffer = Buffer.from(String(right ?? ""), "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function admittedProviderRequest(request) {
  return (
    constantTimeEqual(
      request.headers.authorization,
      `Bearer ${loadedConsumerToken}`,
    ) ||
    constantTimeEqual(
      request.headers["x-crays-clubs-provider-token"],
      loadedConsumerToken,
    )
  );
}

function localizedText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = localizedText(entry?.value ?? entry);
      if (text) return text;
    }
    return "";
  }
  if (value && typeof value === "object") {
    if ("value" in value) return localizedText(value.value);
    for (const entry of Object.values(value)) {
      const text = localizedText(entry);
      if (text) return text;
    }
  }
  return "";
}

function plainText(value) {
  return localizedText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

async function qloRequest(pathname, options = {}) {
  const target = new URL(pathname, qloUpstream);
  const authorization = Buffer.from(
    `${loadedQloProviderReadKey}:`,
    "utf8",
  ).toString("base64");
  return fetch(target, {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(7000),
    headers: {
      accept: "application/json",
      authorization: `Basic ${authorization}`,
      host: canonicalHost,
      "x-forwarded-host": canonicalHost,
      "x-forwarded-proto": "https",
      ...options.headers,
    },
  });
}

async function qloJson(pathname) {
  const upstream = await qloRequest(pathname);
  if (!upstream.ok) {
    throw new Error(`qlo_http_${upstream.status}`);
  }
  return upstream.json();
}

function receiptMedia(propertyKey, propertyReceipt) {
  return Object.entries(propertyReceipt.media ?? {})
    .map(([mediaKey, media]) => ({
      mediaKey,
      alt: String(media?.alt ?? ""),
      galleryOrder: safeInteger(media?.galleryOrder),
      sha256: String(media?.sha256 ?? ""),
      licenseReceiptId: String(media?.licenseReceiptId ?? ""),
      imagePath:
        `/api/provider/hotels/${encodeURIComponent(propertyKey)}` +
        `/images/${encodeURIComponent(mediaKey)}`,
    }))
    .sort((left, right) => left.galleryOrder - right.galleryOrder);
}

function projectedRoomTypes(propertyReceipt, qloRoomTypes) {
  const roomById = new Map(
    qloRoomTypes.map((room) => [safeInteger(room.id), room]),
  );
  return Object.entries(propertyReceipt.roomTypes ?? {})
    .map(([externalRoomTypeKey, roomReceipt]) => {
      const room = roomById.get(safeInteger(roomReceipt.qloRoomTypeId));
      if (!room) {
        throw new Error("qlo_receipt_room_type_missing");
      }
      return {
        externalRoomTypeKey,
        name: plainText(room.name),
        description: plainText(room.description),
        shortDescription: plainText(room.description_short),
        adults: safeInteger(room.adults),
        children: safeInteger(room.children),
        active: Boolean(safeInteger(room.active)),
        discoverable: Boolean(safeInteger(room.show_at_front)),
        bookable: false,
        rate: null,
        availability: null,
        availabilityStatus: "channel_manager_pending",
        paymentStatus: "payment_setup_pending",
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function providerHotels(request, response) {
  if (!admittedProviderRequest(request)) {
    return sendJson(response, 401, { status: "authentication_required" });
  }
  try {
    const [hotelPayload, roomTypePayload] = await Promise.all([
      qloJson("/api/hotels?display=full&output_format=JSON"),
      qloJson("/api/room_types?display=full&output_format=JSON"),
    ]);
    const hotels = Array.isArray(hotelPayload?.hotels)
      ? hotelPayload.hotels
      : [];
    const roomTypes = Array.isArray(roomTypePayload?.room_types)
      ? roomTypePayload.room_types
      : [];
    const hotelById = new Map(
      hotels.map((hotel) => [safeInteger(hotel.id), hotel]),
    );
    const projections = Object.entries(loadedQloImportReceipt.properties).map(
      ([externalKey, propertyReceipt]) => {
        const hotel = hotelById.get(safeInteger(propertyReceipt.hotelId));
        if (!hotel) throw new Error("qlo_receipt_hotel_missing");
        return {
          externalKey,
          propertyId: String(propertyReceipt.propertyId ?? ""),
          name: plainText(hotel.hotel_name),
          shortDescription: plainText(hotel.short_description),
          description: plainText(hotel.description),
          policies: plainText(hotel.policies),
          address: plainText(hotel.address),
          city: plainText(hotel.city),
          rating: safeInteger(hotel.rating),
          checkIn: String(hotel.check_in ?? ""),
          checkOut: String(hotel.check_out ?? ""),
          active: Boolean(safeInteger(hotel.active)),
          contentAuthority: "qlo",
          inventoryAuthority: "channel_manager_pending",
          paymentStatus: "payment_setup_pending",
          roomTypes: projectedRoomTypes(propertyReceipt, roomTypes),
          media: receiptMedia(externalKey, propertyReceipt),
        };
      },
    );
    return sendJson(response, 200, {
      status: "ready",
      authority: "qlo",
      inventoryStatus: "channel_manager_pending",
      paymentStatus: "payment_setup_pending",
      hotels: projections,
    });
  } catch {
    return sendJson(response, 502, { status: "qlo_temporarily_unavailable" });
  }
}

async function providerPropertyRoomInventory(
  request,
  response,
  propertyKey,
) {
  if (!admittedProviderRequest(request)) {
    return sendJson(response, 401, { status: "authentication_required" });
  }
  if (!loadedQloImportReceipt.properties[propertyKey]) {
    return sendJson(response, 404, { status: "not_found" });
  }
  try {
    const [roomTypePayload, physicalRoomPayload] = await Promise.all([
      qloJson("/api/hotel_room_types?display=full&output_format=JSON"),
      qloJson("/api/hotel_rooms?display=full&output_format=JSON"),
    ]);
    const projection = projectProviderPropertyRoomInventory({
      externalKey: propertyKey,
      importReceipt: loadedQloImportReceipt,
      roomTypeRows: Array.isArray(roomTypePayload?.hotel_room_types)
        ? roomTypePayload.hotel_room_types
        : [],
      physicalRoomRows: Array.isArray(physicalRoomPayload?.rooms)
        ? physicalRoomPayload.rooms
        : [],
    });
    if (!projection) {
      return sendJson(response, 404, { status: "not_found" });
    }
    return sendJson(response, 200, projection);
  } catch {
    return sendJson(response, 502, { status: "qlo_temporarily_unavailable" });
  }
}

async function providerPropertyServices(request, response, propertyKey) {
  if (!admittedProviderRequest(request)) {
    return sendJson(response, 401, { status: "authentication_required" });
  }
  const propertyReceipt = loadedQloImportReceipt.properties[propertyKey];
  if (!propertyReceipt) {
    return sendJson(response, 404, { status: "not_found" });
  }
  try {
    const serviceReceipts = propertyReceipt.services ?? {};
    const servicePayload = Object.keys(serviceReceipts).length > 0
      ? await qloJson("/api/services?display=full&output_format=JSON")
      : { services: [] };
    const projection = projectProviderPropertyServices({
      externalKey: propertyKey,
      importReceipt: loadedQloImportReceipt,
      serviceRows: Array.isArray(servicePayload?.services)
        ? servicePayload.services
        : [],
    });
    if (!projection) {
      return sendJson(response, 404, { status: "not_found" });
    }
    return sendJson(response, 200, projection);
  } catch {
    return sendJson(response, 502, { status: "qlo_temporarily_unavailable" });
  }
}

async function providerHotelImage(request, response, propertyKey, mediaKey) {
  if (!admittedProviderRequest(request)) {
    return sendJson(response, 401, { status: "authentication_required" });
  }
  const propertyReceipt = loadedQloImportReceipt.properties[propertyKey];
  const media = propertyReceipt?.media?.[mediaKey];
  if (!propertyReceipt || !media) {
    return sendJson(response, 404, { status: "not_found" });
  }
  try {
    const upstream = await qloRequest(
      `/api/images/hotels/${safeInteger(propertyReceipt.hotelId)}` +
        `/${safeInteger(media.qloImageId)}`,
      { headers: { accept: "image/avif,image/webp,image/png,image/jpeg" } },
    );
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !/^image\/(?:avif|jpeg|png|webp)$/i.test(contentType)) {
      throw new Error("qlo_image_unavailable");
    }
    response.writeHead(200, {
      ...baseHeaders(contentType),
      "content-disposition": "inline",
      etag: `\"${String(media.sha256 ?? "")}\"`,
    });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    sendJson(response, 502, { status: "qlo_temporarily_unavailable" });
  }
}

function forwardedCookies(upstream) {
  if (typeof upstream.headers.getSetCookie === "function") {
    return upstream.headers.getSetCookie();
  }
  const single = upstream.headers.get("set-cookie");
  return single ? [single] : [];
}

function applyCookies(headers, cookies) {
  if (cookies.length === 0) return headers;
  return { ...headers, "set-cookie": cookies };
}

async function exchangePage(response) {
  const nonce = randomBytes(18).toString("base64url");
  const body = `
    <p class="eyebrow">CRAYS Clubs · Team access</p>
    <h1>Opening your property workspace</h1>
    <p id="exchange-status" role="status">The single-use launch is being verified by CRAYS Core.</p>
    <p id="exchange-error" role="alert" hidden></p>`;
  const script = `
    (async function () {
      var status = document.getElementById("exchange-status");
      var error = document.getElementById("exchange-error");
      var query = new URLSearchParams(window.location.search);
      var fragment = new URLSearchParams(window.location.hash.slice(1));
      var code = query.get("code") || "";
      var browserVerifier = fragment.get("verifier") || "";
      history.replaceState({}, "", "/auth/exchange");
      if (!/^[A-Za-z0-9_-]{43,128}$/.test(code) || !/^[A-Za-z0-9_-]{43,128}$/.test(browserVerifier)) {
        status.hidden = true;
        error.hidden = false;
        error.textContent = "This launch link is incomplete or expired. Return to CRAYS.pro and start again.";
        return;
      }
      try {
        var result = await fetch("/auth/exchange/redeem", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: code, browserVerifier: browserVerifier })
        });
        var payload = await result.json();
        if (!result.ok || payload.status !== "consumed") throw new Error("launch_denied");
        window.location.replace(payload.returnPath || "/operations");
      } catch (_) {
        status.hidden = true;
        error.hidden = false;
        error.textContent = "CRAYS could not open this workspace. Return to CRAYS.pro and request a new launch.";
      }
    }());`;
  sendHtml(
    response,
    200,
    gatewayDocument({
      title: "CRAYS Clubs team access",
      body,
      nonce,
      script,
    }),
    nonce,
  );
}

async function redeem(request, response) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    return sendJson(response, 400, { status: "validation_error" });
  }
  if (!validExchangeInput(payload)) {
    return sendJson(response, 400, { status: "validation_error" });
  }
  try {
    const upstream = await coreRequest(
      "/api/crays/clubs/team/launch/redeem",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: payload.code,
          browserVerifier: payload.browserVerifier,
        }),
      },
    );
    const result = await upstream.json().catch(() => null);
    if (!upstream.ok || result?.status !== "consumed") {
      return sendJson(response, upstream.status, { status: "invalid" });
    }
    sendJson(
      response,
      200,
      {
        status: "consumed",
        returnPath: safeReturnPath(result.returnPath),
      },
      applyCookies({}, forwardedCookies(upstream)),
    );
  } catch {
    sendJson(response, 503, { status: "core_temporarily_unavailable" });
  }
}

async function sessionRequest(request, response, method) {
  try {
    const upstream = await coreRequest("/api/crays/clubs/team/session", {
      method,
      headers: request.headers.cookie
        ? { cookie: request.headers.cookie }
        : {},
    });
    const payload = await upstream.json().catch(() => null);
    if (method === "GET") {
      const session = browserSession(payload);
      if (!upstream.ok || !session) {
        return sendJson(response, upstream.status, {
          status: "authentication_required",
        });
      }
      return sendJson(response, 200, { status: "active", session });
    }
    sendJson(
      response,
      upstream.ok ? 200 : upstream.status,
      { status: upstream.ok ? "revoked" : "revoke_failed" },
      applyCookies({}, forwardedCookies(upstream)),
    );
  } catch {
    sendJson(response, 503, { status: "core_temporarily_unavailable" });
  }
}

async function readSession(cookie) {
  const upstream = await coreRequest("/api/crays/clubs/team/session", {
    method: "GET",
    headers: cookie ? { cookie } : {},
  });
  const payload = await upstream.json().catch(() => null);
  return {
    status: upstream.status,
    payload: {
      status: payload?.status,
      session: browserSession(payload),
    },
  };
}

async function operationsPage(request, response) {
  let result;
  try {
    result = await readSession(request.headers.cookie ?? "");
  } catch {
    return sendJson(response, 503, {
      status: "core_temporarily_unavailable",
    });
  }

  const nonce = randomBytes(18).toString("base64url");
  if (result.status !== 200 || result.payload?.status !== "active") {
    const body = `
      <p class="eyebrow">CRAYS Clubs · Holiday Manager</p>
      <h1>Property operations start in CRAYS.pro</h1>
      <p>Authenticate with the CRAYS.pro team account. CRAYS Core then resolves the active Franchise Partner, legal entity, property, capability and assurance before this host opens.</p>
      <div class="actions"><a href="${escapeHtml(b2bStartUrl.toString())}">Continue with CRAYS.pro</a></div>`;
    return sendHtml(
      response,
      401,
      gatewayDocument({
        title: "CRAYS Clubs Holiday Manager",
        body,
        nonce,
      }),
      nonce,
    );
  }

  const session = result.payload.session;
  const body = `
    <p class="eyebrow">CRAYS Clubs · Holiday Manager</p>
    <h1>Authorized property workspace</h1>
    <p>CRAYS Core revalidated this host session. Provider identifiers and native Qlo credentials remain server-side.</p>
    <dl>
      <div><dt>Role</dt><dd>${escapeHtml(session.role)}</dd></div>
      <div><dt>Property</dt><dd>${escapeHtml(session.propertyId)}</dd></div>
      <div><dt>Franchise Partner</dt><dd>${escapeHtml(session.partnerTenantId)}</dd></div>
      <div><dt>Legal entity</dt><dd>${escapeHtml(session.legalEntityId)}</dd></div>
      <div><dt>Assurance</dt><dd>${escapeHtml(session.assuranceLevel)}</dd></div>
      <div><dt>Session expiry</dt><dd>${escapeHtml(session.expiresAt)}</dd></div>
    </dl>
    <p>The native Qlo surface remains closed until the resource-scoped provider session bridge passes its own gate.</p>
    <form method="post" action="/logout"><button class="secondary" type="submit">End team session</button></form>`;
  sendHtml(
    response,
    200,
    gatewayDocument({
      title: "CRAYS Clubs property operations",
      body,
      nonce,
    }),
    nonce,
  );
}

async function logout(request, response) {
  try {
    const upstream = await coreRequest("/api/crays/clubs/team/session", {
      method: "DELETE",
      headers: request.headers.cookie
        ? { cookie: request.headers.cookie }
        : {},
    });
    response.writeHead(
      303,
      applyCookies(
        {
          ...baseHeaders("text/plain; charset=utf-8"),
          location: "/",
        },
        forwardedCookies(upstream),
      ),
    );
    response.end("Session ended.\n");
  } catch {
    sendJson(response, 503, { status: "core_temporarily_unavailable" });
  }
}

async function health(response) {
  try {
    const payload = await qloJson(
      "/api/hotels?display=%5Bid%5D&limit=1&output_format=JSON",
    );
    if (!Array.isArray(payload?.hotels)) throw new Error("qlo_unhealthy");
    sendJson(response, 200, { status: "ready", qlo: "provider_readable" });
  } catch {
    sendJson(response, 503, { status: "not_ready", qlo: "provider_unreadable" });
  }
}

function admittedHost(request) {
  const host = (request.headers.host ?? "").split(":")[0].toLowerCase();
  return host === canonicalHost || isLoopback(host);
}

const server = createServer(async (request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? canonicalHost}`,
  );
  try {
    if (request.method === "GET" && url.pathname === "/healthz") {
      return await health(response);
    }
    if (!admittedHost(request)) {
      return sendJson(response, 421, { status: "misdirected" });
    }
    if (request.method === "GET" && url.pathname === "/auth/exchange") {
      return await exchangePage(response);
    }
    if (
      request.method === "POST" &&
      url.pathname === "/auth/exchange/redeem"
    ) {
      return await redeem(request, response);
    }
    if (url.pathname === "/api/session" && request.method === "GET") {
      return await sessionRequest(request, response, "GET");
    }
    if (url.pathname === "/api/session" && request.method === "DELETE") {
      return await sessionRequest(request, response, "DELETE");
    }
    if (
      request.method === "GET" &&
      url.pathname === "/api/provider/hotels"
    ) {
      return await providerHotels(request, response);
    }
    const providerRoomInventoryMatch = url.pathname.match(
      /^\/api\/provider\/hotels\/([^/]+)\/room-inventory$/,
    );
    if (request.method === "GET" && providerRoomInventoryMatch) {
      return await providerPropertyRoomInventory(
        request,
        response,
        decodeURIComponent(providerRoomInventoryMatch[1]),
      );
    }
    const providerServicesMatch = url.pathname.match(
      /^\/api\/provider\/hotels\/([^/]+)\/services$/,
    );
    if (request.method === "GET" && providerServicesMatch) {
      return await providerPropertyServices(
        request,
        response,
        decodeURIComponent(providerServicesMatch[1]),
      );
    }
    const providerImageMatch = url.pathname.match(
      /^\/api\/provider\/hotels\/([^/]+)\/images\/([^/]+)$/,
    );
    if (request.method === "GET" && providerImageMatch) {
      return await providerHotelImage(
        request,
        response,
        decodeURIComponent(providerImageMatch[1]),
        decodeURIComponent(providerImageMatch[2]),
      );
    }
    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/operations")
    ) {
      return await operationsPage(request, response);
    }
    if (request.method === "POST" && url.pathname === "/logout") {
      return await logout(request, response);
    }
    return sendJson(response, 404, { status: "not_found" });
  } catch {
    return sendJson(response, 500, { status: "gateway_error" });
  }
});

server.listen(listenPort, "0.0.0.0");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
