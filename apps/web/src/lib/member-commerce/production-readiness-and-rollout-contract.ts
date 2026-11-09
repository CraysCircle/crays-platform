import { createHash } from "node:crypto";

export const PRODUCTION_READINESS_AND_ROLLOUT_VERSION = "ncrv2-171-175.v1" as const;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export const currentCapacityDecision = Object.freeze({
  classification: "VPS_TEST_ONLY" as const,
  measuredAtUtc: "2026-07-29T11:04:48Z",
  logicalCpu: 8,
  ramBytes: 16_710_197_248,
  rootStorageBytes: 498_131_243_008,
  activeHumanTesters: 1,
  productionCapacityProven: false,
  enlargementDecision: "DEFER_UNTIL_ADMITTED_WORKLOAD_MEASUREMENT" as const,
  reason: "NCRV2-169_AND_170_NOT_PASSED",
});

export const productionTopology = Object.freeze({
  status: "PROVISIONAL_NOT_ADMITTED" as const,
  vendure: "vertical-region cell; server-side StoreOperatorAssignment; Seller/Channel never security boundary",
  vendurePlanningCeilingOperatorsPerCell: 50,
  erpnext: "one Partner site and database; Partner company/warehouse scope; no shared business ledger",
  coreDatabase: "HA PostgreSQL with tenant-first keys, RLS, PITR and measured failover before production",
  providerDatabases: "separate credentials, backup sets and failure domains from CRAYS Core",
  objectStorage: "versioned encrypted object storage with Partner-prefixed policy and independent restore",
  office: "separate Collabora worker pool with WOPI allowlist and bounded conversion queues",
  talk: "dedicated HPB and TURN pool with capacity admission and no collaboration fallback",
  mail: "separate mail failure domain; mailbox truth remains mail-server owned",
  workers: "partitioned outbox/inbox/reconciliation workers with Partner quotas and dead-letter repair",
  shardEarlierWhen: Object.freeze([
    "sustained_cpu_or_memory_above_60_percent",
    "p95_or_queue_age_exceeds_accepted_slo",
    "database_or_object_storage_isolation_requires_separation",
    "blast_radius_or_legal_boundary_requires_dedicated_cell",
  ]),
  hundredsPerVerticalSupportedByMultipleCells: true,
});

export const licensingAndSupport = Object.freeze([
  Object.freeze({ product: "Nextcloud", test: "community", production: "ENTERPRISE_QUOTE_AND_SUPPORT_DECISION_REQUIRED" }),
  Object.freeze({ product: "Collabora Online", test: "CODE_TEST_ONLY", production: "SUPPORTED_SUBSCRIPTION_AND_CAPACITY_QUOTE_REQUIRED" }),
  Object.freeze({ product: "Vendure", test: "open_source_core", production: "ENTERPRISE_FEATURE_SUPPORT_AND_MARKETPLACE_REVIEW_REQUIRED" }),
  Object.freeze({ product: "Stripe Connect", test: "test_mode_only", production: "COUNTRY_PRICING_MOR_LIABILITY_AND_CONNECT_MODEL_APPROVAL_REQUIRED" }),
] as const);

export const migrationStages = Object.freeze([
  "partner_inventory_and_legal_purpose",
  "canonical_person_organization_relationship_resolution_without_email_only_merge",
  "provider_contact_dedupe_and_projection_mapping",
  "single_primary_personal_calendar_consolidation_and_explicit_additional_calendar_decisions",
  "files_mail_functional_calendars_and_provider_ids_dry_run",
  "versioned_store_operator_assignment_and_immutable_seller_history_import",
  "freeze_window_checksum_count_and_redirect_manifest",
  "partner_scoped_cutover_and_reconciliation",
  "partner_scoped_rollback_without_global_reset",
] as const);

export const rolloutStages = Object.freeze([
  "internal_pilot",
  "selected_independent_operator_and_store",
  "selected_end_to_end_process",
  "selected_vertical_cohort",
  "broader_multi_vertical_adoption",
] as const);

export function createPartnerRolloutAdmission(input: Readonly<{
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  vertical: "coffee" | "retail" | "gym" | "clubs";
  stage: (typeof rolloutStages)[number];
  phase16Passed: boolean;
  migrationReconciled: boolean;
  licensingApproved: boolean;
  capacityCellAdmitted: boolean;
  rollbackReceiptId?: string;
}>) {
  if (!input.partnerTenantId.trim() || !input.operatorLegalEntityId.trim() || !input.storeId.trim() ||
      !(["coffee", "retail", "gym", "clubs"] as const).includes(input.vertical) || !rolloutStages.includes(input.stage)) {
    throw new Error("ROLLOUT_SCOPE_INVALID");
  }
  const blockers = Object.freeze([
    ...(input.phase16Passed ? [] : ["PHASE16_NOT_PASSED"]),
    ...(input.migrationReconciled ? [] : ["MIGRATION_NOT_RECONCILED"]),
    ...(input.licensingApproved ? [] : ["LICENSING_NOT_APPROVED"]),
    ...(input.capacityCellAdmitted ? [] : ["CAPACITY_CELL_NOT_ADMITTED"]),
    ...(input.rollbackReceiptId?.trim() ? [] : ["ROLLBACK_RECEIPT_MISSING"]),
  ]);
  const body = {
    contractVersion: PRODUCTION_READINESS_AND_ROLLOUT_VERSION,
    ...input,
    blockers,
    admitted: blockers.length === 0,
    globalFallbackAllowed: false as const,
    rollbackScope: "EXACT_PARTNER_OPERATOR_STORE" as const,
  };
  return Object.freeze({ ...body, decisionSha256: digest(body) });
}
