import { createHash, randomUUID } from "node:crypto";

export const HOTEL_STRIPE_TEST_SCENARIOS = Object.freeze([
  { kind: "PAYMENT_SUCCESS", expectedOutcome: "PAYMENT_AND_BOOKING_CORRELATED" },
  { kind: "THREE_DS_ACTION_REQUIRED", expectedOutcome: "CUSTOMER_ACTION_REQUIRED" },
  { kind: "CARD_DECLINE", expectedOutcome: "PAYMENT_FAILED_RETRY_SAFE" },
  { kind: "WEBHOOK_REPLAY", expectedOutcome: "REPLAY_IDEMPOTENT" },
  { kind: "DUPLICATE_SUCCESS_EVENT", expectedOutcome: "DUPLICATE_NO_SECOND_BOOKING" },
  { kind: "REFUND_SUCCESS", expectedOutcome: "REFUND_VERIFIED" },
  { kind: "DELAYED_WEBHOOK_AFTER_HOLD_EXPIRY", expectedOutcome: "LATE_SUCCESS_NOT_BOOKED_COMPENSATION_REQUIRED" },
] as const);

export type HotelStripeTestScenario = (typeof HOTEL_STRIPE_TEST_SCENARIOS)[number];
export type HotelStripeTestExecutionMode = "OFFLINE_SIMULATION" | "STRIPE_TEST_MODE";
export type HotelStripeTestScenarioObservation = Readonly<{
  scenarioKind: HotelStripeTestScenario["kind"];
  observedOutcome: HotelStripeTestScenario["expectedOutcome"];
  livemode: false;
  realMoneyMoved: false;
  idempotencyPreserved: true;
  secondBookingCreated: false;
  providerEvidenceVerified: boolean;
  providerObjectSha256: string;
  observedAt: string;
}>;

export interface HotelStripeTestModeTransport {
  readonly executionMode: HotelStripeTestExecutionMode;
  readonly realMoneyCapable: false;
  execute(input: Readonly<{
    scenario: HotelStripeTestScenario;
    sequenceNo: number;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }>): Promise<HotelStripeTestScenarioObservation>;
}

export type HotelStripeScenarioMatrix = Readonly<{
  executionMode: HotelStripeTestExecutionMode;
  scenarioSetSha256: string;
  amountMinor: number;
  currency: string;
  observations: readonly HotelStripeTestScenarioObservation[];
  resultSha256: string;
  externalTestProviderMutationPerformed: boolean;
  stripeLivemode: false;
  realMoneyMoved: false;
  productionObjectObserved: false;
}>;

export type HotelStripeScenarioEvidencePool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
    release(): void;
  }>;
};

const SHA = /^[0-9a-f]{64}$/;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const sha256 = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const scenarioSetSha256 = sha256(HOTEL_STRIPE_TEST_SCENARIOS);

function normalizeTime(value: string): string {
  const date = new Date(value); if (!Number.isFinite(date.getTime())) throw new Error("STRIPE_TEST_SCENARIO_TIME_INVALID"); return date.toISOString();
}

export function createOfflineHotelStripeTestModeTransport(startedAt: string): HotelStripeTestModeTransport {
  const base = new Date(normalizeTime(startedAt)).getTime();
  return Object.freeze({
    executionMode: "OFFLINE_SIMULATION" as const,
    realMoneyCapable: false as const,
    async execute(input: Parameters<HotelStripeTestModeTransport["execute"]>[0]) {
      const expected = HOTEL_STRIPE_TEST_SCENARIOS[input.sequenceNo - 1];
      if (!expected || expected.kind !== input.scenario.kind) throw new Error("STRIPE_TEST_SCENARIO_ORDER_CONFLICT");
      const providerObjectSha256 = sha256({ fixture: "offline-no-provider", ...input });
      return Object.freeze({
        scenarioKind: input.scenario.kind,
        observedOutcome: input.scenario.expectedOutcome,
        livemode: false as const,
        realMoneyMoved: false as const,
        idempotencyPreserved: true as const,
        secondBookingCreated: false as const,
        providerEvidenceVerified: false,
        providerObjectSha256,
        observedAt: new Date(base + input.sequenceNo * 1000).toISOString(),
      });
    },
  });
}

export async function executeHotelStripeTestScenarioMatrix(input: Readonly<{
  transport: HotelStripeTestModeTransport;
  amountMinor: number;
  currency: string;
  testModeAuthorizationReceiptSha256?: string;
}>): Promise<HotelStripeScenarioMatrix> {
  if (input.transport.realMoneyCapable !== false) throw new Error("STRIPE_TEST_TRANSPORT_REAL_MONEY_CAPABLE");
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("STRIPE_TEST_AMOUNT_INVALID");
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("STRIPE_TEST_CURRENCY_INVALID");
  if (input.transport.executionMode === "STRIPE_TEST_MODE" && !SHA.test(input.testModeAuthorizationReceiptSha256 ?? "")) {
    throw new Error("STRIPE_TEST_MODE_EXTERNAL_AUTHORIZATION_REQUIRED");
  }
  if (input.transport.executionMode === "OFFLINE_SIMULATION" && input.testModeAuthorizationReceiptSha256 !== undefined) {
    throw new Error("OFFLINE_SIMULATION_MUST_NOT_CONSUME_EXTERNAL_AUTHORITY");
  }
  const observations: HotelStripeTestScenarioObservation[] = [];
  for (let index = 0; index < HOTEL_STRIPE_TEST_SCENARIOS.length; index += 1) {
    const scenario = HOTEL_STRIPE_TEST_SCENARIOS[index];
    const observation = await input.transport.execute({
      scenario, sequenceNo: index + 1, amountMinor: input.amountMinor, currency,
      idempotencyKey: `cclub079:${scenarioSetSha256}:${index + 1}`,
    });
    if (observation.scenarioKind !== scenario.kind || observation.observedOutcome !== scenario.expectedOutcome) throw new Error("STRIPE_TEST_SCENARIO_OUTCOME_MISMATCH");
    if (observation.livemode !== false || observation.realMoneyMoved !== false) throw new Error("STRIPE_TEST_ZERO_REAL_MONEY_GATE_FAILED");
    if (!observation.idempotencyPreserved || observation.secondBookingCreated) throw new Error("STRIPE_TEST_IDEMPOTENCY_OR_OVERBOOKING_FAILED");
    if (!SHA.test(observation.providerObjectSha256)) throw new Error("STRIPE_TEST_EVIDENCE_HASH_INVALID");
    normalizeTime(observation.observedAt);
    if (input.transport.executionMode === "OFFLINE_SIMULATION" && observation.providerEvidenceVerified) throw new Error("OFFLINE_SIMULATION_CLAIMS_PROVIDER_EVIDENCE");
    if (input.transport.executionMode === "STRIPE_TEST_MODE" && !observation.providerEvidenceVerified) throw new Error("STRIPE_TEST_MODE_PROVIDER_EVIDENCE_MISSING");
    observations.push(Object.freeze(observation));
  }
  const resultMaterial = { executionMode: input.transport.executionMode, scenarioSetSha256,
    amountMinor: input.amountMinor, currency, observations };
  return Object.freeze({ ...resultMaterial, resultSha256: sha256(resultMaterial),
    externalTestProviderMutationPerformed: input.transport.executionMode === "STRIPE_TEST_MODE",
    stripeLivemode: false as const, realMoneyMoved: false as const, productionObjectObserved: false as const });
}

export async function persistHotelStripeTestScenarioMatrix(input: Readonly<{
  pool: HotelStripeScenarioEvidencePool;
  tenantId: string;
  matrix: HotelStripeScenarioMatrix;
  testModeAuthorityId?: string;
  executedAt: string;
}>): Promise<Readonly<{ scenarioRunId: string; resultSha256: string; replayed: boolean }>> {
  const executedAt = normalizeTime(input.executedAt);
  if (!input.tenantId.trim() || input.matrix.observations.length !== 7) throw new Error("STRIPE_TEST_MATRIX_INCOMPLETE");
  if (input.matrix.scenarioSetSha256 !== scenarioSetSha256 || !SHA.test(input.matrix.resultSha256)) throw new Error("STRIPE_TEST_MATRIX_HASH_INVALID");
  if (input.matrix.executionMode === "STRIPE_TEST_MODE" && !input.testModeAuthorityId) throw new Error("STRIPE_TEST_MODE_AUTHORITY_ID_REQUIRED");
  if (input.matrix.executionMode === "OFFLINE_SIMULATION" && input.testModeAuthorityId) throw new Error("OFFLINE_MATRIX_AUTHORITY_FORBIDDEN");
  const db = await input.pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('app.tenant_id',$1,true)", [input.tenantId]);
    const replay = (await db.query<{ scenario_run_id: string; result_sha256: string }>(
      `SELECT scenario_run_id,result_sha256 FROM crays_core.clubs_hotel_stripe_test_mode_scenario_runs
        WHERE tenant_id=$1 AND result_sha256=$2 FOR UPDATE`, [input.tenantId,input.matrix.resultSha256],
    )).rows[0];
    if (replay) { await db.query("COMMIT"); return { scenarioRunId: replay.scenario_run_id, resultSha256: replay.result_sha256, replayed: true }; }
    const scenarioRunId = randomUUID();
    await db.query(
      `INSERT INTO crays_core.clubs_hotel_stripe_test_mode_scenario_runs
       (scenario_run_id,tenant_id,test_mode_authority_id,execution_mode,scenario_set_sha256,amount_minor,
        currency,scenario_count,run_state,external_test_provider_mutation_performed,stripe_livemode,
        real_money_moved,production_object_observed,result_sha256,formal_applied,executed_at,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,7,$8,$9,false,false,false,$10,false,$11::timestamptz,$11::timestamptz)`,
      [scenarioRunId,input.tenantId,input.testModeAuthorityId ?? null,input.matrix.executionMode,
        input.matrix.scenarioSetSha256,input.matrix.amountMinor,input.matrix.currency,
        input.matrix.executionMode === "OFFLINE_SIMULATION" ? "OFFLINE_VERIFIED" : "TEST_MODE_PROVIDER_VERIFIED",
        input.matrix.externalTestProviderMutationPerformed,input.matrix.resultSha256,executedAt],
    );
    for (let index = 0; index < input.matrix.observations.length; index += 1) {
      const observation = input.matrix.observations[index], scenario = HOTEL_STRIPE_TEST_SCENARIOS[index];
      const evidenceClass = input.matrix.executionMode === "OFFLINE_SIMULATION" ? "OFFLINE_TRANSPORT_SIMULATION" : "STRIPE_TEST_MODE_PROVIDER_RECEIPT";
      const receiptSha256 = sha256({ scenarioRunId, sequenceNo: index + 1, scenario, observation, evidenceClass });
      await db.query(
        `INSERT INTO crays_core.clubs_hotel_stripe_test_mode_scenario_receipts
         (scenario_receipt_id,tenant_id,scenario_run_id,sequence_no,scenario_kind,expected_outcome,
          observed_outcome,evidence_class,provider_evidence_verified,stripe_livemode,real_money_moved,
          idempotency_preserved,second_booking_created,provider_object_sha256,receipt_sha256,observed_at,formal_applied)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,false,false,true,false,$10,$11,$12::timestamptz,false)`,
        [randomUUID(),input.tenantId,scenarioRunId,index + 1,scenario.kind,scenario.expectedOutcome,
          observation.observedOutcome,evidenceClass,observation.providerEvidenceVerified,
          observation.providerObjectSha256,receiptSha256,observation.observedAt],
      );
    }
    await db.query("COMMIT");
    return { scenarioRunId, resultSha256: input.matrix.resultSha256, replayed: false };
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
}

export const HOTEL_STRIPE_TEST_SCENARIO_SET_SHA256 = scenarioSetSha256;
