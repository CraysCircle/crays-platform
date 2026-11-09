import { Pool, type PoolClient } from "pg";

export const CLUBS_POST0223_ISOLATED_TARGET = {
  protocol: "postgresql:",
  hostname: "127.0.0.1",
  port: "54329",
  database: "crays_platform",
} as const;

export type ClubsPost0223Verification = {
  status: "PASS";
  assertions: number;
  target: { hostname: string; port: string; database: string };
  transactionReadOnly: true;
  objectCounts: { tables: number; columns: number; routines: number; triggers: number; policies: number };
  requiredObjects: string[];
  rlsEnabledObjects: string[];
  correctedTriggerNames: string[];
  stage9ConstraintCount: number;
  emptyEvidenceTables: string[];
  productionMutationPerformed: false;
  externalMutationPerformed: false;
  formalCountersChanged: false;
};

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function assertClubsPost0223IsolatedTarget(connectionString: string) {
  const target = new URL(connectionString);
  check(
    target.protocol === "postgresql:" || target.protocol === "postgres:",
    "POST-0223 verifier requires PostgreSQL",
  );
  check(target.hostname === CLUBS_POST0223_ISOLATED_TARGET.hostname, "POST-0223 verifier rejects non-loopback hosts");
  check((target.port || "5432") === CLUBS_POST0223_ISOLATED_TARGET.port, "POST-0223 verifier rejects non-isolated ports");
  check(
    target.pathname.replace(/^\//, "") === CLUBS_POST0223_ISOLATED_TARGET.database,
    "POST-0223 verifier rejects unexpected databases",
  );
  check(target.protocol !== "postgres:" || target.hostname === "127.0.0.1", "POST-0223 verifier target invariant");
  return {
    hostname: target.hostname,
    port: target.port || "5432",
    database: target.pathname.replace(/^\//, ""),
  };
}

async function verifyObject(client: PoolClient, objectName: string) {
  const result = await client.query<{ object_name: string | null }>("select to_regclass($1)::text as object_name", [objectName]);
  check(result.rows[0]?.object_name, `required POST-0223 object is missing: ${objectName}`);
}

async function verifyRls(client: PoolClient, objectName: string) {
  const result = await client.query<{ enabled: boolean }>(
    "select c.relrowsecurity as enabled from pg_class c where c.oid=to_regclass($1)",
    [objectName],
  );
  check(result.rows[0]?.enabled === true, `RLS is not enabled: ${objectName}`);
}

async function verifyEmpty(client: PoolClient, sql: string, tableName: string) {
  const result = await client.query<{ count: number }>(sql);
  check(result.rows[0]?.count === 0, `real-evidence table is not empty: ${tableName}`);
}

export async function verifyClubsPost0223DatabaseContract(connectionString: string): Promise<ClubsPost0223Verification> {
  const target = assertClubsPost0223IsolatedTarget(connectionString);
  let assertions = 4;
  const pool = new Pool({ connectionString, max: 1, ssl: false, application_name: "cclub-v129-post0223-readonly-verifier" });
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    transactionOpen = true;
    const readOnly = await client.query<{ read_only: string }>(
      "select current_setting('transaction_read_only') as read_only",
    );
    check(readOnly.rows[0]?.read_only === "on", "verification transaction is not read-only");
    assertions += 1;

    const counts = await client.query<{
      tables: number;
      columns: number;
      routines: number;
      triggers: number;
      policies: number;
    }>(`select
      (select count(*)::int from information_schema.tables where table_schema not in ('pg_catalog','information_schema')) as tables,
      (select count(*)::int from information_schema.columns where table_schema not in ('pg_catalog','information_schema')) as columns,
      (select count(*)::int from information_schema.routines where routine_schema not in ('pg_catalog','information_schema')) as routines,
      (select count(*)::int from information_schema.triggers where trigger_schema not in ('pg_catalog','information_schema')) as triggers,
      (select count(*)::int from pg_policies where schemaname not in ('pg_catalog','information_schema')) as policies`);
    const objectCounts = counts.rows[0];
    check(Boolean(objectCounts), "POST-0223 object counts unavailable");
    check(objectCounts.tables === 469, "POST-0223 table count drift");
    check(objectCounts.columns === 8187, "POST-0223 column count drift");
    check(objectCounts.routines === 344, "POST-0223 routine count drift");
    check(objectCounts.triggers === 871, "POST-0223 trigger count drift");
    check(objectCounts.policies === 421, "POST-0223 policy count drift");
    assertions += 6;

    const requiredObjects = [
      'public."CraysClubBookingRevenueAllocation"',
      "crays_core.clubs_stripe_customer_create_commands",
      "crays_core.clubs_hotel_stripe_webhook_inbox",
      "crays_audit.clubs_hotel_consequence_observability_receipts",
      "crays_core.clubs_hotel_final_bookings",
      "crays_core.clubs_hotel_stage9_financial_terminal_gate_receipts",
      'public."CraysClubNcrv2EligibilityRealEvidenceCombinationBindingReceipt"',
      'public."CraysClubNcrv2FormalAuthorityDecisionReceipt"',
    ];
    for (const objectName of requiredObjects) {
      await verifyObject(client, objectName);
      assertions += 1;
    }

    const rlsEnabledObjects = [
      'public."CraysClubBookingRevenueAllocation"',
      "crays_core.clubs_stripe_customer_create_commands",
      "crays_core.clubs_hotel_stripe_webhook_inbox",
      "crays_audit.clubs_hotel_consequence_observability_receipts",
      "crays_core.clubs_hotel_stage9_financial_terminal_gate_receipts",
      'public."CraysClubNcrv2EligibilityRealEvidenceCombinationBindingReceipt"',
    ];
    for (const objectName of rlsEnabledObjects) {
      await verifyRls(client, objectName);
      assertions += 1;
    }

    const helper = await client.query<{ definition: string }>(
      "select pg_get_functiondef('crays_core.current_tenant_id()'::regprocedure) as definition",
    );
    check(helper.rows[0]?.definition.includes("app.tenant_id"), "tenant helper does not preserve app.tenant_id scope");
    assertions += 1;

    const triggerResult = await client.query<{ name: string }>(`select tgname as name from pg_trigger
      where tgrelid='public."CraysClubNcrv2EligibilityRealEvidenceCombinationBindingReceipt"'::regclass
        and not tgisinternal order by tgname`);
    const correctedTriggerNames = triggerResult.rows.map((row) => row.name);
    check(correctedTriggerNames.length === 2, "0185 corrected trigger count drift");
    check(correctedTriggerNames.includes("cclub_ncrv2_elig_combination_binding_complete"), "0185 complete trigger missing");
    check(correctedTriggerNames.includes("cclub_ncrv2_elig_combination_binding_immutable"), "0185 immutable trigger missing");
    check(new Set(correctedTriggerNames).size === correctedTriggerNames.length, "0185 trigger names collide");
    assertions += 4;

    const stage9 = await client.query<{ definition: string; constraint_count: number }>(`select
      string_agg(pg_get_constraintdef(oid), E'\n' order by conname) as definition,
      count(*)::int as constraint_count
      from pg_constraint where conrelid='crays_core.clubs_hotel_stage9_financial_terminal_gate_receipts'::regclass`);
    const stage9Definition = stage9.rows[0]?.definition ?? "";
    const stage9ConstraintCount = stage9.rows[0]?.constraint_count ?? 0;
    check(stage9ConstraintCount === 24, "Stage-9 constraint count drift");
    for (const token of [
      "STAGE9_FINANCIAL_TERMINAL_TECHNICALLY_ELIGIBLE_NOT_APPLIED",
      "booking_mutation_performed = false",
      "provider_mutation_performed = false",
      "formal_applied = false",
    ]) {
      check(stage9Definition.includes(token), `Stage-9 fail-closed token missing: ${token}`);
      assertions += 1;
    }
    assertions += 1;

    const emptyEvidenceTables = [
      'public."CraysClubBookingRevenueAllocation"',
      "crays_core.clubs_stripe_customer_create_provider_receipts",
      "crays_core.clubs_hotel_final_bookings",
      "crays_core.clubs_hotel_stage9_financial_terminal_gate_receipts",
      'public."CraysClubNcrv2EligibilityRealEvidenceCombinationBindingReceipt"',
      'public."CraysClubNcrv2FormalAuthorityDecisionReceipt"',
    ];
    const emptyQueries = [
      'select count(*)::int as count from public."CraysClubBookingRevenueAllocation"',
      "select count(*)::int as count from crays_core.clubs_stripe_customer_create_provider_receipts",
      "select count(*)::int as count from crays_core.clubs_hotel_final_bookings",
      "select count(*)::int as count from crays_core.clubs_hotel_stage9_financial_terminal_gate_receipts",
      'select count(*)::int as count from public."CraysClubNcrv2EligibilityRealEvidenceCombinationBindingReceipt"',
      'select count(*)::int as count from public."CraysClubNcrv2FormalAuthorityDecisionReceipt"',
    ];
    for (let index = 0; index < emptyEvidenceTables.length; index += 1) {
      await verifyEmpty(client, emptyQueries[index]!, emptyEvidenceTables[index]!);
      assertions += 1;
    }

    await client.query("rollback");
    transactionOpen = false;
    return {
      status: "PASS",
      assertions,
      target,
      transactionReadOnly: true,
      objectCounts,
      requiredObjects,
      rlsEnabledObjects,
      correctedTriggerNames,
      stage9ConstraintCount,
      emptyEvidenceTables,
      productionMutationPerformed: false,
      externalMutationPerformed: false,
      formalCountersChanged: false,
    };
  } finally {
    if (transactionOpen) await client.query("rollback").catch(() => undefined);
    client.release();
    await pool.end();
  }
}
