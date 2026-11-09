import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  FOREST_CITY_GOLF_PROPERTY_ID,
  FOREST_CITY_MARINA_PROPERTY_ID,
  FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY,
  FOREST_CITY_SUNDAY_SANDBOX_OFFERS,
  ForestCitySundaySandboxContractError,
  calculateForestCitySundaySandboxQuote,
  forestCitySundaySandboxRequestSha256,
  validateForestCitySundaySandboxHoldEvidence,
  validateForestCitySundaySandboxStay,
} from "./forest-city-sunday-sandbox-booking-contract";

test("publishes one honest synthetic sandbox scenario with four property-level offers", () => {
  assert.deepEqual(
    {
      environment: FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY.environment,
      syntheticSource: FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY.syntheticSource,
      providerAuthority: FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY.providerAuthority,
      productionAuthority:
        FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY.productionAuthority,
      paymentAuthority: FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY.paymentAuthority,
      roomRateAllocationReady:
        FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY.roomRateAllocationReady,
    },
    {
      environment: "sandbox",
      syntheticSource: true,
      providerAuthority: false,
      productionAuthority: false,
      paymentAuthority: false,
      roomRateAllocationReady: false,
    },
  );
  assert.equal(FOREST_CITY_SUNDAY_SANDBOX_OFFERS.length, 4);
  assert.ok(
    FOREST_CITY_SUNDAY_SANDBOX_OFFERS.every(
      (offer) =>
        offer.roomCategoryId === null &&
        offer.allocationScope === "sandbox_property_level_not_room_category" &&
        offer.capacityUnits === 3,
    ),
  );
});

test("Golf supports night, exact week and exact month without conflating rates", () => {
  assert.equal(
    calculateForestCitySundaySandboxQuote({
      propertyId: FOREST_CITY_GOLF_PROPERTY_ID,
      stayUnit: "night",
      checkIn: "2026-09-01",
      checkOut: "2026-09-04",
    }).totalMinor,
    78_000,
  );
  assert.equal(
    validateForestCitySundaySandboxStay({
      propertyId: FOREST_CITY_GOLF_PROPERTY_ID,
      stayUnit: "week",
      checkIn: "2026-09-01",
      checkOut: "2026-09-08",
    }).nights,
    7,
  );
  assert.equal(
    validateForestCitySundaySandboxStay({
      propertyId: FOREST_CITY_GOLF_PROPERTY_ID,
      stayUnit: "month",
      checkIn: "2026-09-01",
      checkOut: "2026-10-01",
    }).nights,
    30,
  );
  assert.throws(
    () =>
      validateForestCitySundaySandboxStay({
        propertyId: FOREST_CITY_GOLF_PROPERTY_ID,
        stayUnit: "week",
        checkIn: "2026-09-01",
        checkOut: "2026-09-09",
      }),
    (error) =>
      error instanceof ForestCitySundaySandboxContractError &&
      error.code === "SANDBOX_INVALID_STAY",
  );
});

test("Marina is month-only and requires party GO, membership and Property Admission", () => {
  assert.equal(
    calculateForestCitySundaySandboxQuote({
      propertyId: FOREST_CITY_MARINA_PROPERTY_ID,
      stayUnit: "month",
      checkIn: "2026-09-01",
      checkOut: "2026-10-01",
    }).totalMinor,
    350_000,
  );
  assert.throws(
    () =>
      validateForestCitySundaySandboxStay({
        propertyId: FOREST_CITY_MARINA_PROPERTY_ID,
        stayUnit: "night",
        checkIn: "2026-09-01",
        checkOut: "2026-09-02",
      }),
    (error) =>
      error instanceof ForestCitySundaySandboxContractError &&
      error.code === "SANDBOX_INVALID_STAY",
  );
  assert.throws(
    () =>
      validateForestCitySundaySandboxHoldEvidence(
        FOREST_CITY_MARINA_PROPERTY_ID,
        { partyGoReceiptId: "go-receipt" },
      ),
    (error) =>
      error instanceof ForestCitySundaySandboxContractError &&
      error.code === "SANDBOX_MEMBERSHIP_REQUIRED",
  );
  assert.deepEqual(
    validateForestCitySundaySandboxHoldEvidence(
      FOREST_CITY_MARINA_PROPERTY_ID,
      {
        partyGoReceiptId: "go-receipt",
        membershipId: "membership-receipt",
        admissionGrantId: "admission-grant",
      },
    ),
    {
      partyGoReceiptId: "go-receipt",
      membershipId: "membership-receipt",
      admissionGrantId: "admission-grant",
    },
  );
});

test("Golf also requires a current party-GO receipt before a hold", () => {
  assert.throws(
    () =>
      validateForestCitySundaySandboxHoldEvidence(
        FOREST_CITY_GOLF_PROPERTY_ID,
        {},
      ),
    (error) =>
      error instanceof ForestCitySundaySandboxContractError &&
      error.code === "SANDBOX_PARTY_GO_REQUIRED",
  );
});

test("canonical request hashes are replay-stable and content-sensitive", () => {
  const left = forestCitySundaySandboxRequestSha256({
    checkIn: "2026-09-01",
    guest: { adults: 2, name: "Ada" },
  });
  const reordered = forestCitySundaySandboxRequestSha256({
    guest: { name: "Ada", adults: 2 },
    checkIn: "2026-09-01",
  });
  const changed = forestCitySundaySandboxRequestSha256({
    guest: { name: "Ada", adults: 3 },
    checkIn: "2026-09-01",
  });
  assert.equal(left, reordered);
  assert.notEqual(left, changed);
  assert.match(left, /^[a-f0-9]{64}$/);
});

test("migration and repository retain sandbox, RLS, replay and no-oversell guards", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "database/migrations/0238_cclub_sunday_forest_city_sandbox_booking.sql",
    ),
    "utf8",
  );
  const repository = readFileSync(
    resolve(
      process.cwd(),
      "src/db/forest-city-sunday-sandbox-booking-repository.ts",
    ),
    "utf8",
  );
  assert.match(migration, /force row level security/i);
  assert.match(migration, /append-only/i);
  assert.match(migration, /check \(not provider_authority\)/i);
  assert.match(migration, /check \(not production_authority\)/i);
  assert.match(migration, /check \(not payment_authority\)/i);
  assert.doesNotMatch(
    migration,
    /insert\s+into\s+crays_core\.(clubs_properties|stores|store_operator_assignments)/i,
  );
  assert.match(repository, /pg_advisory_xact_lock/);
  assert.match(repository, /expires_at>clock_timestamp\(\)/);
  assert.match(repository, /active_hold_units/);
  assert.match(repository, /confirmed_booking_units/);
  assert.match(repository, /SANDBOX_IDEMPOTENCY_CONFLICT/);
  assert.doesNotMatch(`${migration}\n${repository}`, /stripe/i);
});
