import { createHash, randomUUID } from "node:crypto";

export const BOOKING_REVENUE_POLICY_VERSION = "CCLUB_BOOKING_REVENUE_V1";

export const BOOKING_REVENUE_BASIS_POINTS = {
  MARKETING_CONTRIBUTION: 1_000,
  PERSONAL_TECHNOLOGY_RIGHT: 500,
  GLOBAL_CONCEPT_RIGHT: 25,
  OPERATING_REMAINDER: 8_475,
} as const;

export type BookingRevenueAllocationKind = keyof typeof BOOKING_REVENUE_BASIS_POINTS;
export type BeneficiaryResolutionState = "RESOLVED" | "UNRESOLVED";

export type BookingRevenueBeneficiary = Readonly<{
  kind: string;
  reference: string;
  evidenceReference?: string;
}>;

export type ConfirmedAmbassadorAttribution = Readonly<{
  state: "CONFIRMED";
  ambassadorId: string;
  evidenceReference: string;
}>;

export type CreateBookingRevenuePlanInput = Readonly<{
  tenantId: string;
  projectKey: string;
  franchiseKey: string;
  locationKey: string;
  bookingId: string;
  bookingVersion: number;
  sourceEventId: string;
  currency: string;
  grossAmountMinor: bigint;
  recordedAt: Date;
  confirmedAmbassador?: ConfirmedAmbassadorAttribution;
  marketingFallbackBeneficiary?: BookingRevenueBeneficiary;
  personalTechnologyBeneficiary?: BookingRevenueBeneficiary;
  globalConceptBeneficiary?: BookingRevenueBeneficiary;
  operatingBeneficiary?: BookingRevenueBeneficiary;
}>;

export type BookingRevenueAllocation = Readonly<{
  id: string;
  kind: BookingRevenueAllocationKind;
  basisPoints: number;
  amountMinor: bigint;
  roundingRank: number;
  resolution: Readonly<{
    id: string;
    state: BeneficiaryResolutionState;
    beneficiaryKind?: string;
    beneficiaryReference?: string;
    reasonCode: string;
    evidenceReference?: string;
  }>;
}>;

export type BookingRevenuePlan = Readonly<{
  journalId: string;
  input: CreateBookingRevenuePlanInput;
  allocations: readonly BookingRevenueAllocation[];
  dispatchReady: boolean;
  unresolvedAllocationKinds: readonly BookingRevenueAllocationKind[];
  idempotencyKey: string;
}>;

type RankedAllocation = {
  kind: BookingRevenueAllocationKind;
  basisPoints: number;
  amountMinor: bigint;
  remainder: bigint;
  roundingRank: number;
};

const ALLOCATION_ORDER: readonly BookingRevenueAllocationKind[] = [
  "MARKETING_CONTRIBUTION",
  "PERSONAL_TECHNOLOGY_RIGHT",
  "GLOBAL_CONCEPT_RIGHT",
  "OPERATING_REMAINDER",
];

function requireNonEmpty(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${name} must not be empty`);
  return normalized;
}

function validateInput(input: CreateBookingRevenuePlanInput): void {
  requireNonEmpty(input.tenantId, "tenantId");
  requireNonEmpty(input.projectKey, "projectKey");
  requireNonEmpty(input.franchiseKey, "franchiseKey");
  requireNonEmpty(input.locationKey, "locationKey");
  requireNonEmpty(input.bookingId, "bookingId");
  requireNonEmpty(input.sourceEventId, "sourceEventId");
  if (!Number.isSafeInteger(input.bookingVersion) || input.bookingVersion < 1) {
    throw new Error("bookingVersion must be a positive safe integer");
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new Error("currency must be an ISO-style uppercase three-letter code");
  }
  if (input.grossAmountMinor < 0n) {
    throw new Error("grossAmountMinor must be non-negative");
  }
  if (!Number.isFinite(input.recordedAt.getTime())) {
    throw new Error("recordedAt must be a valid timestamp");
  }
}

function allocateMinorUnits(grossAmountMinor: bigint): readonly RankedAllocation[] {
  const denominator = 10_000n;
  const ranked = ALLOCATION_ORDER.map((kind, roundingRank) => {
    const basisPoints = BOOKING_REVENUE_BASIS_POINTS[kind];
    const numerator = grossAmountMinor * BigInt(basisPoints);
    return {
      kind,
      basisPoints,
      amountMinor: numerator / denominator,
      remainder: numerator % denominator,
      roundingRank,
    };
  });

  const allocated = ranked.reduce((sum, item) => sum + item.amountMinor, 0n);
  let residual = grossAmountMinor - allocated;
  const byRemainder = [...ranked].sort((left, right) => {
    if (left.remainder === right.remainder) return left.roundingRank - right.roundingRank;
    return left.remainder > right.remainder ? -1 : 1;
  });

  for (const item of byRemainder) {
    if (residual === 0n) break;
    item.amountMinor += 1n;
    residual -= 1n;
  }

  if (residual !== 0n) throw new Error("minor-unit allocation did not balance");
  return ranked;
}

function resolutionFor(
  kind: BookingRevenueAllocationKind,
  input: CreateBookingRevenuePlanInput,
): BookingRevenueAllocation["resolution"] {
  let beneficiary: BookingRevenueBeneficiary | undefined;
  let reasonCode: string;

  if (kind === "MARKETING_CONTRIBUTION" && input.confirmedAmbassador) {
    beneficiary = {
      kind: "AMBASSADOR",
      reference: requireNonEmpty(input.confirmedAmbassador.ambassadorId, "confirmedAmbassador.ambassadorId"),
      evidenceReference: requireNonEmpty(
        input.confirmedAmbassador.evidenceReference,
        "confirmedAmbassador.evidenceReference",
      ),
    };
    reasonCode = "CONFIRMED_AMBASSADOR_RECEIVES_MARKETING_CONTRIBUTION";
  } else if (kind === "MARKETING_CONTRIBUTION") {
    beneficiary = input.marketingFallbackBeneficiary;
    reasonCode = beneficiary ? "MARKETING_POLICY_BENEFICIARY_RESOLVED" : "MARKETING_BENEFICIARY_PENDING";
  } else if (kind === "PERSONAL_TECHNOLOGY_RIGHT") {
    beneficiary = input.personalTechnologyBeneficiary;
    reasonCode = beneficiary ? "PERSONAL_TECHNOLOGY_RIGHT_RESOLVED" : "PERSONAL_TECHNOLOGY_RIGHT_PENDING";
  } else if (kind === "GLOBAL_CONCEPT_RIGHT") {
    beneficiary = input.globalConceptBeneficiary;
    reasonCode = beneficiary ? "GLOBAL_CONCEPT_COMPANY_RESOLVED" : "UNNAMED_GLOBAL_CONCEPT_COMPANY";
  } else {
    beneficiary = input.operatingBeneficiary;
    reasonCode = beneficiary ? "OPERATING_BENEFICIARY_RESOLVED" : "OPERATING_BENEFICIARY_PENDING";
  }

  if (!beneficiary) {
    return { id: randomUUID(), state: "UNRESOLVED", reasonCode };
  }

  return {
    id: randomUUID(),
    state: "RESOLVED",
    beneficiaryKind: requireNonEmpty(beneficiary.kind, `${kind}.beneficiary.kind`),
    beneficiaryReference: requireNonEmpty(beneficiary.reference, `${kind}.beneficiary.reference`),
    reasonCode,
    evidenceReference: beneficiary.evidenceReference,
  };
}

function stableIdempotencyKey(input: CreateBookingRevenuePlanInput): string {
  const material = [
    BOOKING_REVENUE_POLICY_VERSION,
    input.tenantId,
    input.projectKey,
    input.franchiseKey,
    input.locationKey,
    input.bookingId,
    String(input.bookingVersion),
    input.sourceEventId,
    input.currency,
    input.grossAmountMinor.toString(),
  ].join("\u001f");
  return `cclub-booking-revenue:${createHash("sha256").update(material).digest("hex")}`;
}

export function createBookingRevenuePlan(input: CreateBookingRevenuePlanInput): BookingRevenuePlan {
  validateInput(input);
  const allocations = allocateMinorUnits(input.grossAmountMinor).map((allocation) => ({
    id: randomUUID(),
    kind: allocation.kind,
    basisPoints: allocation.basisPoints,
    amountMinor: allocation.amountMinor,
    roundingRank: allocation.roundingRank,
    resolution: resolutionFor(allocation.kind, input),
  }));
  const unresolvedAllocationKinds = allocations
    .filter((allocation) => allocation.resolution.state === "UNRESOLVED")
    .map((allocation) => allocation.kind);

  return {
    journalId: randomUUID(),
    input,
    allocations,
    dispatchReady: unresolvedAllocationKinds.length === 0,
    unresolvedAllocationKinds,
    idempotencyKey: stableIdempotencyKey(input),
  };
}

export type BookingRevenueSqlClient = Readonly<{
  query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ) => Promise<{ rowCount: number; rows: readonly Row[] }>;
}>;

export type BookingRevenueTransactionRunner = Readonly<{
  transaction: <T>(run: (client: BookingRevenueSqlClient) => Promise<T>) => Promise<T>;
}>;

type PersistedJournalIdentity = Readonly<{
  id: string;
  project_key: string;
  franchise_key: string;
  location_key: string;
  booking_id: string;
  booking_version: string | number;
  currency: string;
  gross_amount_minor: string;
  confirmed_ambassador_id: string | null;
  allocation_policy_version: string;
}>;

type PersistedAllocationIdentity = Readonly<{
  id: string;
  basis_points: number;
  amount_minor: string;
  rounding_rank: number;
}>;

type PersistedResolutionIdentity = Readonly<{
  resolution_state: BeneficiaryResolutionState;
  beneficiary_kind: string | null;
  beneficiary_reference: string | null;
  reason_code: string;
  evidence_reference: string | null;
}>;

function assertIdempotent(condition: boolean, field: string): void {
  if (!condition) throw new Error(`BOOKING_REVENUE_IDEMPOTENCY_CONFLICT:${field}`);
}

function assertJournalReplayMatches(
  persisted: PersistedJournalIdentity,
  plan: BookingRevenuePlan,
): void {
  assertIdempotent(persisted.project_key === plan.input.projectKey, "projectKey");
  assertIdempotent(persisted.franchise_key === plan.input.franchiseKey, "franchiseKey");
  assertIdempotent(persisted.location_key === plan.input.locationKey, "locationKey");
  assertIdempotent(persisted.booking_id === plan.input.bookingId, "bookingId");
  assertIdempotent(String(persisted.booking_version) === String(plan.input.bookingVersion), "bookingVersion");
  assertIdempotent(persisted.currency === plan.input.currency, "currency");
  assertIdempotent(persisted.gross_amount_minor === plan.input.grossAmountMinor.toString(), "grossAmountMinor");
  assertIdempotent(
    persisted.confirmed_ambassador_id === (plan.input.confirmedAmbassador?.ambassadorId ?? null),
    "confirmedAmbassador",
  );
  assertIdempotent(
    persisted.allocation_policy_version === BOOKING_REVENUE_POLICY_VERSION,
    "allocationPolicyVersion",
  );
}

function assertAllocationReplayMatches(
  persisted: PersistedAllocationIdentity,
  allocation: BookingRevenueAllocation,
): void {
  assertIdempotent(persisted.basis_points === allocation.basisPoints, `${allocation.kind}.basisPoints`);
  assertIdempotent(persisted.amount_minor === allocation.amountMinor.toString(), `${allocation.kind}.amountMinor`);
  assertIdempotent(persisted.rounding_rank === allocation.roundingRank, `${allocation.kind}.roundingRank`);
}

function assertResolutionReplayMatches(
  persisted: PersistedResolutionIdentity,
  allocation: BookingRevenueAllocation,
): void {
  assertIdempotent(
    persisted.resolution_state === allocation.resolution.state,
    `${allocation.kind}.resolutionState`,
  );
  assertIdempotent(
    persisted.beneficiary_kind === (allocation.resolution.beneficiaryKind ?? null),
    `${allocation.kind}.beneficiaryKind`,
  );
  assertIdempotent(
    persisted.beneficiary_reference === (allocation.resolution.beneficiaryReference ?? null),
    `${allocation.kind}.beneficiaryReference`,
  );
  assertIdempotent(persisted.reason_code === allocation.resolution.reasonCode, `${allocation.kind}.reasonCode`);
  assertIdempotent(
    persisted.evidence_reference === (allocation.resolution.evidenceReference ?? null),
    `${allocation.kind}.evidenceReference`,
  );
}

export class BookingRevenueLedgerRepository {
  constructor(private readonly database: BookingRevenueTransactionRunner) {}

  async record(plan: BookingRevenuePlan): Promise<{ dispatchPrepared: boolean }> {
    return this.database.transaction(async (client) => {
      await client.query("SELECT set_config('crays.app_role', 'core_service', true), set_config('crays.tenant_id', $1, true), set_config('app.tenant_id', $1, true)", [plan.input.tenantId]);
      const insertedJournal = await client.query<{ id: string }>(
        `INSERT INTO "CraysClubBookingRevenueJournal" (
          "id", "tenant_id", "project_key", "franchise_key", "location_key", "booking_id",
          "booking_version", "source_event_id", "currency", "gross_amount_minor",
          "confirmed_ambassador_id", "allocation_policy_version", "recorded_at"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT ("tenant_id", "source_event_id") DO NOTHING
        RETURNING "id"`,
        [
          plan.journalId,
          plan.input.tenantId,
          plan.input.projectKey,
          plan.input.franchiseKey,
          plan.input.locationKey,
          plan.input.bookingId,
          plan.input.bookingVersion,
          plan.input.sourceEventId,
          plan.input.currency,
          plan.input.grossAmountMinor.toString(),
          plan.input.confirmedAmbassador?.ambassadorId ?? null,
          BOOKING_REVENUE_POLICY_VERSION,
          plan.input.recordedAt.toISOString(),
        ],
      );

      let journalId = insertedJournal.rows[0]?.id;
      if (!journalId) {
        const existingJournal = await client.query<PersistedJournalIdentity>(
          `SELECT "id", "project_key", "franchise_key", "location_key", "booking_id",
             "booking_version", "currency", "gross_amount_minor", "confirmed_ambassador_id",
             "allocation_policy_version"
           FROM "CraysClubBookingRevenueJournal"
           WHERE "tenant_id" = $1 AND "source_event_id" = $2
           FOR SHARE`,
          [plan.input.tenantId, plan.input.sourceEventId],
        );
        const persisted = existingJournal.rows[0];
        if (!persisted) throw new Error("BOOKING_REVENUE_IDEMPOTENCY_LOOKUP_FAILED:journal");
        assertJournalReplayMatches(persisted, plan);
        journalId = persisted.id;
      }

      for (const allocation of plan.allocations) {
        const insertedAllocation = await client.query<{ id: string }>(
          `INSERT INTO "CraysClubBookingRevenueAllocation" (
            "id", "tenant_id", "journal_id", "allocation_kind", "basis_points", "amount_minor", "rounding_rank"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT ("tenant_id", "journal_id", "allocation_kind") DO NOTHING
          RETURNING "id"`,
          [
            allocation.id,
            plan.input.tenantId,
            journalId,
            allocation.kind,
            allocation.basisPoints,
            allocation.amountMinor.toString(),
            allocation.roundingRank,
          ],
        );

        let allocationId = insertedAllocation.rows[0]?.id;
        if (!allocationId) {
          const existingAllocation = await client.query<PersistedAllocationIdentity>(
            `SELECT "id", "basis_points", "amount_minor", "rounding_rank"
             FROM "CraysClubBookingRevenueAllocation"
             WHERE "tenant_id" = $1 AND "journal_id" = $2 AND "allocation_kind" = $3
             FOR SHARE`,
            [plan.input.tenantId, journalId, allocation.kind],
          );
          const persisted = existingAllocation.rows[0];
          if (!persisted) {
            throw new Error(`BOOKING_REVENUE_IDEMPOTENCY_LOOKUP_FAILED:${allocation.kind}`);
          }
          assertAllocationReplayMatches(persisted, allocation);
          allocationId = persisted.id;
        }

        const insertedResolution = await client.query(
          `INSERT INTO "CraysClubBookingRevenueBeneficiaryResolution" (
            "id", "tenant_id", "allocation_id", "resolution_version", "resolution_state",
            "beneficiary_kind", "beneficiary_reference", "reason_code", "evidence_reference", "resolved_at"
          ) VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9)
          ON CONFLICT ("tenant_id", "allocation_id", "resolution_version") DO NOTHING
          RETURNING "id"`,
          [
            allocation.resolution.id,
            plan.input.tenantId,
            allocationId,
            allocation.resolution.state,
            allocation.resolution.beneficiaryKind ?? null,
            allocation.resolution.beneficiaryReference ?? null,
            allocation.resolution.reasonCode,
            allocation.resolution.evidenceReference ?? null,
            plan.input.recordedAt.toISOString(),
          ],
        );

        if (insertedResolution.rowCount === 0) {
          const existingResolution = await client.query<PersistedResolutionIdentity>(
            `SELECT "resolution_state", "beneficiary_kind", "beneficiary_reference", "reason_code",
               "evidence_reference"
             FROM "CraysClubBookingRevenueBeneficiaryResolution"
             WHERE "tenant_id" = $1 AND "allocation_id" = $2 AND "resolution_version" = 1
             FOR SHARE`,
            [plan.input.tenantId, allocationId],
          );
          const persisted = existingResolution.rows[0];
          if (!persisted) {
            throw new Error(`BOOKING_REVENUE_IDEMPOTENCY_LOOKUP_FAILED:${allocation.kind}.resolution`);
          }
          assertResolutionReplayMatches(persisted, allocation);
        }
      }

      if (!plan.dispatchReady) return { dispatchPrepared: false };

      await client.query(
        `INSERT INTO "CraysClubBookingRevenueDispatchOutbox" (
          "id", "tenant_id", "journal_id", "provider_kind", "command_kind", "idempotency_key",
          "command_payload", "state", "attempt_count", "next_attempt_at"
        ) VALUES ($1,$2,$3,'STRIPE_CONNECT','CREATE_BOOKING_SPLIT',$4,$5::jsonb,'PENDING',0,$6)
        ON CONFLICT ("tenant_id", "idempotency_key") DO NOTHING`,
        [
          randomUUID(),
          plan.input.tenantId,
          journalId,
          plan.idempotencyKey,
          JSON.stringify({
            schemaVersion: 1,
            bookingId: plan.input.bookingId,
            bookingVersion: plan.input.bookingVersion,
            projectKey: plan.input.projectKey,
            franchiseKey: plan.input.franchiseKey,
            locationKey: plan.input.locationKey,
            currency: plan.input.currency,
            grossAmountMinor: plan.input.grossAmountMinor.toString(),
            allocations: plan.allocations.map((allocation) => ({
              kind: allocation.kind,
              basisPoints: allocation.basisPoints,
              amountMinor: allocation.amountMinor.toString(),
              beneficiaryKind: allocation.resolution.beneficiaryKind,
              beneficiaryReference: allocation.resolution.beneficiaryReference,
            })),
          }),
          plan.input.recordedAt.toISOString(),
        ],
      );
      return { dispatchPrepared: true };
    });
  }
}
