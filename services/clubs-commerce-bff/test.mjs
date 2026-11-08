import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CONTRACT_VERSION,
  ClubsCommerceBffError,
  addHeldItemToVendure,
  assertSafePublicResponse,
  encryptVendureSession,
  decryptVendureSession,
  issueTrustedB2cAssertion,
  parseBrowserRequest,
  publicError,
  verifyTrustedB2cAssertion,
} from "./lib.mjs";

const secret = "cclub066-test-only-assertion-secret-0123456789abcdef";
const now = 1_788_257_600;

test("CCLUB068 health query loads the immutable predecessor contract", () => {
  const source = readFileSync(new URL("./lib.mjs", import.meta.url), "utf8");
  const bookingQuery = source.slice(
    source.indexOf("async function loadBookingContract"),
    source.indexOf("async function loadOrderCommandContract"),
  );
  const consequenceQuery = source.slice(
    source.indexOf("async function loadConsequenceContract"),
    source.indexOf("function assertBookingContract"),
  );
  assert.doesNotMatch(bookingQuery, /predecessor_booking_contract_id/);
  assert.match(consequenceQuery, /predecessor_booking_contract_id/);
});

test("only the six CCLUB068 browser operations are admitted", () => {
  assert.deepEqual(parseBrowserRequest({ operation: "prepared_models.read" }), {
    operation: "prepared_models.read",
  });
  assert.deepEqual(
    parseBrowserRequest({
      operation: "prepared_models.read",
      websiteProductType: "booking",
    }),
    { operation: "prepared_models.read", websiteProductType: "booking" },
  );
  for (const operation of [
    "test_checkout.settle",
    "order.cancel",
    "test_refund.create",
  ]) {
    assert.deepEqual(parseBrowserRequest({
      operation,
      cartReference: "cart_0123456789abcdef0123456789abcdef01234567",
      idempotencyKey: `idem-${operation.replaceAll(".", "-")}-0001`,
    }), {
      operation,
      cartReference: "cart_0123456789abcdef0123456789abcdef01234567",
      idempotencyKey: `idem-${operation.replaceAll(".", "-")}-0001`,
    });
  }
  assert.deepEqual(
    parseBrowserRequest({
      operation: "test_hold.issue",
      inventoryKey: "clubs.fc.golf.qlo-room-type-21",
      idempotencyKey: "idem-hold-test-0001",
    }),
    {
      operation: "test_hold.issue",
      inventoryKey: "clubs.fc.golf.qlo-room-type-21",
      idempotencyKey: "idem-hold-test-0001",
    },
  );
  assert.deepEqual(
    parseBrowserRequest({
      operation: "hold_bound_cart.create",
      holdReference: "th_0123456789abcdef0123456789abcdef",
      idempotencyKey: "idem-cart-test-0001",
    }),
    {
      operation: "hold_bound_cart.create",
      holdReference: "th_0123456789abcdef0123456789abcdef",
      idempotencyKey: "idem-cart-test-0001",
    },
  );
  for (const operation of [
    "cart.create",
    "checkout.create",
    "payment.create",
    "admin.query",
  ]) {
    assert.throws(
      () => parseBrowserRequest({ operation }),
      (error) => error.code === "BFF_OPERATION_DENIED",
    );
  }
});

test("browser authority and unknown fields fail closed", () => {
  for (const input of [
    { operation: "prepared_models.read", channelToken: "secret" },
    { operation: "prepared_models.read", adminToken: "secret" },
    { operation: "prepared_models.read", vendureChannelId: "2" },
    { operation: "prepared_models.read", price: 100 },
    { operation: "prepared_models.read", websiteProductType: "physical" },
    {
      operation: "test_hold.issue",
      inventoryKey: "clubs.fc.golf.qlo-room-type-21",
      idempotencyKey: "idem-hold-test-0002",
      price: 100,
    },
    {
      operation: "hold_bound_cart.create",
      holdReference: "th_0123456789abcdef0123456789abcdef",
      idempotencyKey: "short",
    },
    {
      operation: "test_checkout.settle",
      cartReference: "cart_0123456789abcdef0123456789abcdef01234567",
      idempotencyKey: "idem-checkout-test-0001",
      returnUrl: "https://attacker.invalid/paid",
    },
    {
      operation: "order.cancel",
      cartReference: "cart_0123456789abcdef0123456789abcdef01234567",
      idempotencyKey: "idem-cancel-test-0001",
      paymentState: "Settled",
    },
    {
      operation: "test_refund.create",
      cartReference: "cart_0123456789abcdef0123456789abcdef01234567",
      idempotencyKey: "idem-refund-test-0001",
      refundAmount: 10500,
    },
  ]) {
    assert.throws(() => parseBrowserRequest(input), ClubsCommerceBffError);
  }
});

test("trusted assertion is purpose and identity-provider scoped", () => {
  const issued = issueTrustedB2cAssertion(
    {
      accountId: "acct_384c05e7-e716-4dc9-864d-8c63bf13876c",
      issuedAtEpochSeconds: now,
      expiresAtEpochSeconds: now + 60,
      assertionId: "assertion-cclub066-test-001",
    },
    secret,
  );
  assert.deepEqual(
    verifyTrustedB2cAssertion(issued, secret, now + 1),
    {
      accountId: "acct_384c05e7-e716-4dc9-864d-8c63bf13876c",
      identityProvider: "auth0-crays",
      identityConnection: "google-oauth2",
      purpose: "b2c-customer",
      assertionId: "assertion-cclub066-test-001",
    },
  );
  assert.throws(
    () => verifyTrustedB2cAssertion(issued, `${secret}x`, now + 1),
    (error) => error.code === "BFF_AUTHENTICATION_REQUIRED",
  );
  assert.throws(
    () => verifyTrustedB2cAssertion(issued, secret, now + 61),
    (error) => error.code === "BFF_AUTHENTICATION_REQUIRED",
  );
});

test("B2B identity cannot be substituted into the B2C assertion", () => {
  assert.throws(
    () => issueTrustedB2cAssertion(
      {
        accountId: "tb@crays.org",
        issuedAtEpochSeconds: now,
        expiresAtEpochSeconds: now + 60,
        assertionId: "assertion-cclub066-test-002",
      },
      secret,
    ).encoded && verifyTrustedB2cAssertion(
      issueTrustedB2cAssertion({
        accountId: "tb@crays.org",
        issuedAtEpochSeconds: now,
        expiresAtEpochSeconds: now + 60,
        assertionId: "assertion-cclub066-test-002",
      }, secret),
      secret,
      now,
    ),
    (error) => error.code === "BFF_AUTHENTICATION_REQUIRED",
  );
});

test("safe responses reject provider authority and business identity", () => {
  assert.doesNotThrow(() => assertSafePublicResponse({
    contractVersion: CONTRACT_VERSION,
    state: "prepared",
    activationGate: "CCLUB-066",
  }));
  for (const response of [
    { channelToken: "secret" },
    { vendureChannelId: "2" },
    { identity: "tb@crays.org" },
    { header: "x-crays-commerce-context" },
  ]) {
    assert.throws(
      () => assertSafePublicResponse(response),
      (error) => error.code === "BFF_RESPONSE_AUTHORITY_LEAK",
    );
  }
});

test("Vendure session encryption keeps raw provider authority server-only", () => {
  const token = "provider-session-token-cclub066-test-only";
  const encrypted = encryptVendureSession(token, Buffer.alloc(32, 7));
  assert.equal(
    decryptVendureSession({
      vendure_session_token_sha256: encrypted.tokenSha256,
      vendure_session_ciphertext: encrypted.ciphertext,
      vendure_session_iv: encrypted.iv,
      vendure_session_auth_tag: encrypted.authTag,
    }, Buffer.alloc(32, 7)),
    token,
  );
  assert.throws(
    () => decryptVendureSession({
      vendure_session_token_sha256: "0".repeat(64),
      vendure_session_ciphertext: encrypted.ciphertext,
      vendure_session_iv: encrypted.iv,
      vendure_session_auth_tag: encrypted.authTag,
    }, Buffer.alloc(32, 7)),
    (error) => error.code === "BFF_PROVIDER_SESSION_INVALID",
  );
  assert.equal(encrypted.tokenSha256.length, 64);
  assert.ok(encrypted.ciphertext.length >= 16);
  assert.ok(encrypted.iv.length >= 12);
  assert.ok(encrypted.authTag.length >= 16);
  assert.equal(JSON.stringify(encrypted).includes(token), false);
  assert.doesNotThrow(() => assertSafePublicResponse({
    contractVersion: CONTRACT_VERSION,
    state: "cart_created",
    cartReference: "cart_0123456789abcdef0123456789abcdef01234567",
    orderCode: "TEST123",
    price: {
      currencyCode: "CHF",
      unitAmountMinor: 10500,
      evidenceClass: "test_only",
      providerConfirmed: false,
    },
    realChannelManagerCutoverGate: "CCLUB-120",
    liveMoneyAllowed: false,
  }));
});

test("hold-bound cart binds an immutable seller snapshot before checkout", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ body, headers: init.headers });
    if (body.operationName === "AddHeldBooking") {
      return new Response(JSON.stringify({
        data: {
          addItemToOrder: {
            __typename: "Order",
            id: "5",
            code: "CCLUB068ORDER5",
            active: true,
            state: "AddingItems",
            currencyCode: "CHF",
            totalWithTax: 10500,
            lines: [{
              id: "51",
              quantity: 1,
              productVariant: { id: "13", sku: "CRAYS-CLUBS-BOOKING-TEST-1" },
            }],
          },
        },
      }), {
        status: 200,
        headers: { "vendure-auth-token": "vendure-test-session-token" },
      });
    }
    return new Response(JSON.stringify({
      data: {
        craysPrepareOrderSellerSnapshot: {
          commandId: "7",
          snapshotId: "oss_12345678-1234-1234-1234-123456789012",
          state: "PREPARED",
        },
      },
    }), { status: 200 });
  };
  try {
    const result = await addHeldItemToVendure(
      "http://vendure:3000/shop-api",
      "clubs-channel-token",
      "cclub068-commerce-context-secret-0123456789abcdef",
      {
        accountId: "acct_384c05e7-e716-4dc9-864d-8c63bf13876c",
        assertionId: "assertion-cclub068-snapshot-0001",
      },
      {
        cart_id: "cart_0123456789abcdef0123456789abcdef01234567",
        deployment_cell_id: "vendure-xl-member-providers",
        operator_tenant_id: "tenant-clubs-association",
        operator_legal_entity_id:
          "legal-crays-business-nomads-club-association",
        store_id: "store-clubs-forest-city",
        store_operator_assignment_id: "assignment-clubs-forest-city",
        assignment_version: 1,
        binding_id: "binding-clubs-forest-city",
        binding_version: 1,
        vendure_seller_id: "2",
        vendure_channel_id: "2",
        primary_stock_location_id: "2",
        seller_binding_version: 1,
        vendure_variant_id: "13",
        currency_code: "CHF",
        unit_amount_minor: 10500,
        availability_snapshot_sha256: "a".repeat(64),
        target_set_sha256: "b".repeat(64),
      },
    );
    assert.equal(calls.length, 2);
    assert.equal(calls[1].body.operationName, "PrepareOrderSellerSnapshot");
    assert.match(
      calls[1].headers.authorization,
      /^Bearer vendure-test-session-token$/,
    );
    assert.equal(result.orderSellerSnapshotCommandId, "7");
    assert.match(result.orderSellerSnapshotId, /^oss_/);
    assert.equal(JSON.stringify(result).includes("clubs-channel-token"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("errors are collapsed to a small public vocabulary", () => {
  assert.deepEqual(
    publicError(new ClubsCommerceBffError("BFF_CONTRACT_CORRUPT")),
    {
      status: 503,
      payload: {
        contractVersion: CONTRACT_VERSION,
        state: "denied",
        code: "BFF_TEMPORARILY_UNAVAILABLE",
      },
    },
  );
});
