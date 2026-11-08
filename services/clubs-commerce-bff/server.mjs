import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

import pg from "pg";

import {
  ClubsCommerceBffError,
  addHeldItemToVendure,
  assertSafePublicResponse,
  claimHoldBoundCart,
  claimOrderCommand,
  cancelOrderInVendure,
  completeHoldBoundCart,
  completeOrderCommand,
  decryptVendureSession,
  encryptVendureSession,
  issueTestHold,
  markHoldBoundCartUnknown,
  markOrderCommandUnknown,
  parseBrowserRequest,
  prepareHoldBoundCart,
  prepareOrderCommand,
  publicAppliedCart,
  publicOrderCommand,
  publicError,
  readAdapterHealth,
  readPreparedModels,
  sha256,
  settleTestCheckoutInVendure,
  refundTestPaymentInVendure,
  verifyTrustedB2cAssertion,
} from "./lib.mjs";

const { Pool } = pg;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function requiredSecretFile(name) {
  const value = readFileSync(required(name), "utf8").trim();
  if (!value) throw new Error(`${name}_EMPTY`);
  return value;
}

const databaseUrl = requiredSecretFile("CORE_DATABASE_URL_FILE");
const channelToken = requiredSecretFile("VENDURE_CHANNEL_TOKEN_FILE");
const assertionSecret = requiredSecretFile("BFF_ASSERTION_HMAC_SECRET_FILE");
const commerceContextSecret = requiredSecretFile(
  "COMMERCE_CONTEXT_HMAC_SECRET_FILE",
);
const sessionEncryptionKeyHex = requiredSecretFile(
  "CART_SESSION_ENCRYPTION_KEY_FILE",
);
const vendureShopApiUrl = required("VENDURE_SHOP_API_URL");
const vendureAdminApiUrl = required("VENDURE_ADMIN_API_URL");
const vendureAdminUsername = requiredSecretFile(
  "VENDURE_ADMIN_USERNAME_FILE",
);
const vendureAdminPassword = requiredSecretFile(
  "VENDURE_ADMIN_PASSWORD_FILE",
);
if (channelToken.length < 3 || channelToken.length > 300) {
  throw new Error("VENDURE_CHANNEL_TOKEN_INVALID");
}
if (Buffer.byteLength(assertionSecret, "utf8") < 32) {
  throw new Error("BFF_ASSERTION_HMAC_SECRET_INVALID");
}
if (Buffer.byteLength(commerceContextSecret, "utf8") < 32) {
  throw new Error("COMMERCE_CONTEXT_HMAC_SECRET_INVALID");
}
if (!/^[0-9a-f]{64}$/.test(sessionEncryptionKeyHex)) {
  throw new Error("CART_SESSION_ENCRYPTION_KEY_INVALID");
}
const sessionEncryptionKey = Buffer.from(sessionEncryptionKeyHex, "hex");
if (vendureShopApiUrl !==
    "http://crays-member-providers-vendure-1:3000/shop-api") {
  throw new Error("VENDURE_SHOP_API_URL_INVALID");
}
if (vendureAdminApiUrl !==
    "http://crays-member-providers-vendure-1:3000/admin-api") {
  throw new Error("VENDURE_ADMIN_API_URL_INVALID");
}
if (vendureAdminUsername.length < 3 || vendureAdminUsername.length > 200 ||
    vendureAdminPassword.length < 12 || vendureAdminPassword.length > 500) {
  throw new Error("VENDURE_ADMIN_CREDENTIALS_INVALID");
}

let allowedOrigins;
try {
  allowedOrigins = JSON.parse(required("CRAYS_ALLOWED_ORIGINS_JSON"));
} catch {
  throw new Error("CRAYS_ALLOWED_ORIGINS_JSON_INVALID");
}
if (
  !Array.isArray(allowedOrigins) ||
  allowedOrigins.length < 1 ||
  allowedOrigins.some(
    (origin) =>
      typeof origin !== "string" ||
      !/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{2,5})?$/.test(origin),
  )
) {
  throw new Error("CRAYS_ALLOWED_ORIGINS_JSON_INVALID");
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 4,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  application_name: "crays-clubs-commerce-bff-cclub068",
});

const responseHeaders = Object.freeze({
  "cache-control": "private, no-store, max-age=0",
  "content-type": "application/json; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
});

function send(response, status, payload) {
  assertSafePublicResponse(payload);
  response.writeHead(status, responseHeaders);
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const contentType = request.headers["content-type"] ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new ClubsCommerceBffError("BFF_REQUEST_INVALID", 400);
  }
  const lengthHeader = request.headers["content-length"];
  if (
    lengthHeader !== undefined &&
    (!/^\d+$/.test(lengthHeader) || Number(lengthHeader) > 8_192)
  ) {
    throw new ClubsCommerceBffError("BFF_REQUEST_TOO_LARGE", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8_192) {
      throw new ClubsCommerceBffError("BFF_REQUEST_TOO_LARGE", 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ClubsCommerceBffError("BFF_REQUEST_INVALID", 400);
  }
}

function requireOrigin(request) {
  const origin = request.headers.origin;
  if (typeof origin !== "string" || !allowedOrigins.includes(origin)) {
    throw new ClubsCommerceBffError("BFF_ORIGIN_DENIED", 403);
  }
}

async function handler(request, response) {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/healthz") {
      send(response, 200, await readAdapterHealth(pool, channelToken));
      return;
    }
    if (
      request.method !== "POST" ||
      url.pathname !== "/v1/clubs/commerce" ||
      url.search
    ) {
      send(response, 404, {
        contractVersion: "cclub068.clubs-booking-consequence-bff.v1",
        state: "denied",
        code: "BFF_ROUTE_NOT_FOUND",
      });
      return;
    }
    requireOrigin(request);
    const authority = verifyTrustedB2cAssertion(
      {
        encoded: request.headers["x-crays-bff-assertion"],
        signature: request.headers["x-crays-bff-assertion-signature"],
      },
      assertionSecret,
      Math.floor(Date.now() / 1_000),
    );
    const parsed = parseBrowserRequest(await readJson(request));
    if (parsed.operation === "prepared_models.read") {
      send(
        response,
        200,
        await readPreparedModels(pool, channelToken, authority, parsed),
      );
      return;
    }
    if (parsed.operation === "test_hold.issue") {
      send(response, 200, await issueTestHold(pool, authority, parsed));
      return;
    }
    if ([
      "test_checkout.settle",
      "order.cancel",
      "test_refund.create",
    ].includes(parsed.operation)) {
      const prepared = await prepareOrderCommand(pool, authority, parsed);
      if (prepared.provider_state === "APPLIED") {
        send(response, 200, publicOrderCommand(prepared));
        return;
      }
      if (prepared.provider_state !== "PERSISTED_PENDING_PROVIDER") {
        throw new ClubsCommerceBffError(
          "BFF_BOOKING_RECONCILIATION_REQUIRED",
          503,
        );
      }
      const claimTokenSha256 = sha256(randomBytes(32).toString("hex"));
      const claimState = await claimOrderCommand(
        pool,
        authority,
        prepared.command_receipt_id,
        claimTokenSha256,
        new Date(Date.now() + 30_000),
      );
      if (claimState !== "CLAIMED") {
        throw new ClubsCommerceBffError(
          "BFF_BOOKING_RECONCILIATION_REQUIRED",
          503,
        );
      }
      try {
        let provider;
        if (parsed.operation === "test_checkout.settle") {
          const sessionToken = decryptVendureSession(
            prepared,
            sessionEncryptionKey,
          );
          provider = await settleTestCheckoutInVendure(
            vendureShopApiUrl,
            channelToken,
            commerceContextSecret,
            sessionToken,
            authority,
            prepared,
          );
        } else if (parsed.operation === "order.cancel") {
          provider = await cancelOrderInVendure(
            vendureAdminApiUrl,
            channelToken,
            commerceContextSecret,
            vendureAdminUsername,
            vendureAdminPassword,
            authority,
            prepared,
          );
        } else {
          provider = await refundTestPaymentInVendure(
            vendureAdminApiUrl,
            channelToken,
            commerceContextSecret,
            vendureAdminUsername,
            vendureAdminPassword,
            authority,
            prepared,
          );
        }
        const completed = await completeOrderCommand(
          pool,
          authority,
          prepared,
          claimTokenSha256,
          provider,
        );
        send(response, 200, publicOrderCommand({ ...prepared, ...completed }));
        return;
      } catch (error) {
        if (process.env.CCLUB067_DIAGNOSTIC_MODE === "true") {
          process.stderr.write(`${JSON.stringify({
            event: "cclub067-order-command-provider-unknown",
            operation: parsed.operation,
            name: error?.name,
            code: error?.code,
            message: error?.message,
          })}\n`);
        }
        await markOrderCommandUnknown(
          pool,
          authority,
          prepared.command_receipt_id,
          claimTokenSha256,
        );
        throw new ClubsCommerceBffError(
          "BFF_BOOKING_RECONCILIATION_REQUIRED",
          503,
        );
      }
    }
    const prepared = await prepareHoldBoundCart(pool, authority, parsed);
    if (prepared.provider_state === "APPLIED") {
      send(
        response,
        200,
        publicAppliedCart(prepared, prepared.vendure_order_code),
      );
      return;
    }
    if (prepared.provider_state !== "PERSISTED_PENDING_PROVIDER") {
      throw new ClubsCommerceBffError(
        "BFF_BOOKING_RECONCILIATION_REQUIRED",
        503,
      );
    }
    const claimTokenSha256 = sha256(randomBytes(32).toString("hex"));
    const claimState = await claimHoldBoundCart(
      pool,
      authority,
      prepared.cart_id,
      claimTokenSha256,
      new Date(Date.now() + 30_000),
    );
    if (claimState !== "CLAIMED") {
      throw new ClubsCommerceBffError(
        "BFF_BOOKING_RECONCILIATION_REQUIRED",
        503,
      );
    }
    try {
      const provider = await addHeldItemToVendure(
        vendureShopApiUrl,
        channelToken,
        commerceContextSecret,
        authority,
        prepared,
      );
      const encryptedSession = encryptVendureSession(
        provider.sessionToken,
        sessionEncryptionKey,
      );
      const completed = await completeHoldBoundCart(
        pool,
        authority,
        prepared,
        claimTokenSha256,
        provider,
        encryptedSession,
      );
      send(
        response,
        200,
        publicAppliedCart(prepared, completed.vendure_order_code),
      );
      return;
    } catch {
      await markHoldBoundCartUnknown(
        pool,
        authority,
        prepared.cart_id,
        claimTokenSha256,
      );
      throw new ClubsCommerceBffError(
        "BFF_BOOKING_RECONCILIATION_REQUIRED",
        503,
      );
    }
  } catch (error) {
    const safe = publicError(error);
    send(response, safe.status, safe.payload);
  }
}

const server = createServer(handler);
server.requestTimeout = 20_000;
server.headersTimeout = 12_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 40;

const port = Number(process.env.PORT ?? "8080");
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT_INVALID");
}

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(
    JSON.stringify({
      event: "clubs-commerce-bff-ready",
      contractVersion: "cclub068.clubs-booking-consequence-bff.v1",
      port,
    }) + "\n",
  );
});

async function shutdown(signal) {
  process.stdout.write(JSON.stringify({ event: "shutdown", signal }) + "\n");
  server.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
