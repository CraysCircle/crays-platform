import "server-only";

import { createHash } from "node:crypto";

import type { BookingRevenueAllocationReceipt } from "./booking-revenue-erp-dispatch-preflight";

export type BookingRevenueErpBridgeSqlClient = Readonly<{
  query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ) => Promise<{ rowCount: number; rows: readonly Row[] }>;
}>;

export type BookingRevenueErpBridgeDatabase = Readonly<{
  transaction: <T>(run: (client: BookingRevenueErpBridgeSqlClient) => Promise<T>) => Promise<T>;
}>;

export type BookingRevenueErpBridgeOutput = Readonly<{
  outboxId: string;
  postingBatchId: string;
  allocationReceipt: BookingRevenueAllocationReceipt;
  bookingReferenceSha256: string;
  payloadSha256: string;
  replayed: boolean;
}>;

type JournalRow = Readonly<{
  id: string;
  tenant_id: string;
  project_key: string;
  franchise_key: string;
  location_key: string;
  booking_id: string;
  booking_version: string | number;
  source_event_id: string;
  currency: string;
  gross_amount_minor: string | number;
  confirmed_ambassador_id: string | null;
  allocation_policy_version: string;
}>;

type FinanceEventRow = Readonly<{
  id: string;
  tenant_id: string;
  booking_id: string;
  booking_version: string | number;
  revenue_journal_id: string | null;
  event_kind: string;
  currency: string;
  amount_minor: string | number;
}>;

type AllocationRow = Readonly<{
  id: string;
  allocation_kind: string;
  basis_points: number;
  amount_minor: string | number;
  rounding_rank: number;
  resolution_state: string | null;
  beneficiary_kind: string | null;
  beneficiary_reference: string | null;
  evidence_reference: string | null;
}>;

type AnyRow = Record<string, unknown>;

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const CURRENCY = /^[A-Z]{3}$/;

function reject(code: string): never {
  throw new Error("CCLUB_REVENUE_ERP_BRIDGE_" + code);
}

function uuid(value: string, label: string): string {
  if (!UUID.test(value)) reject(label + "_UUID_INVALID");
  return value;
}

function id(value: string, label: string): string {
  if (!ID.test(value)) reject(label + "_ID_INVALID");
  return value;
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  return JSON.stringify(value);
}

function integer(value: string | number, label: string, minimum = 0): number {
  const number = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < minimum) reject(label + "_INTEGER_INVALID");
  return number;
}

function instant(value: string, label: string): string {
  if (!Number.isFinite(Date.parse(value))) reject(label + "_INSTANT_INVALID");
  return value;
}

function deterministicUuid(seed: string): string {
  const raw = sha(seed).slice(0, 32).split("");
  raw[12] = "4";
  raw[16] = ["8", "9", "a", "b"][Number.parseInt(raw[16] ?? "0", 16) % 4] ?? "8";
  const value = raw.join("");
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join("-");
}

function same(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left instanceof Date && typeof right === "string") {
    return left.toISOString() === new Date(right).toISOString();
  }
  if (right instanceof Date && typeof left === "string") {
    return right.toISOString() === new Date(left).toISOString();
  }
  return false;
}

function assertRow(row: AnyRow | undefined, expected: AnyRow, label: string): void {
  if (!row) reject(label + "_MISSING");
  for (const [key, value] of Object.entries(expected)) {
    if (!same(row[key], value)) reject(label + "_CONFLICT_" + key.toUpperCase());
  }
}

function requireResolution(
  allocation: AllocationRow,
  expectedKind: string,
  label: string,
): { reference: string; evidence: string } {
  if (allocation.resolution_state !== "RESOLVED") reject(label + "_UNRESOLVED");
  if (allocation.beneficiary_kind !== expectedKind) reject(label + "_BENEFICIARY_KIND_INVALID");
  if (!allocation.beneficiary_reference || !ID.test(allocation.beneficiary_reference)) {
    reject(label + "_BENEFICIARY_REFERENCE_INVALID");
  }
  if (!allocation.evidence_reference || !ID.test(allocation.evidence_reference)) {
    reject(label + "_EVIDENCE_REFERENCE_INVALID");
  }
  return {
    reference: allocation.beneficiary_reference,
    evidence: allocation.evidence_reference,
  };
}

export async function enqueueBookingRevenueToErp(input: Readonly<{
  database: BookingRevenueErpBridgeDatabase;
  tenantId: string;
  journalId: string;
  financeEventId: string;
  preparedAt: string;
}>): Promise<BookingRevenueErpBridgeOutput> {
  const tenantId = uuid(input.tenantId, "TENANT");
  const journalId = uuid(input.journalId, "JOURNAL");
  const financeEventId = uuid(input.financeEventId, "FINANCE_EVENT");
  const preparedAt = instant(input.preparedAt, "PREPARED_AT");

  return input.database.transaction(async (client) => {
    await client.query(
      "/* cclub-phase9-erp-v41:rls */ SELECT set_config('crays.app_role', 'core_service', true), " +
        "set_config('crays.tenant_id', $1, true), set_config('app.tenant_id', $1, true)",
      [tenantId],
    );

    const journalResult = await client.query<JournalRow>(
      "/* cclub-phase9-erp-v41:journal */ " +
        'SELECT "id"::text, "tenant_id"::text, "project_key", "franchise_key", "location_key", ' +
        '"booking_id", "booking_version", "source_event_id", "currency", "gross_amount_minor", ' +
        '"confirmed_ambassador_id", "allocation_policy_version" ' +
        'FROM "CraysClubBookingRevenueJournal" ' +
        'WHERE "tenant_id" = $1::uuid AND "id" = $2::uuid FOR UPDATE',
      [tenantId, journalId],
    );
    const journal = journalResult.rows[0];
    if (!journal) reject("JOURNAL_NOT_FOUND");
    if (!CURRENCY.test(journal.currency)) reject("CURRENCY_INVALID");
    const gross = integer(journal.gross_amount_minor, "GROSS", 1);
    const bookingVersion = integer(journal.booking_version, "BOOKING_VERSION", 1);
    [journal.project_key, journal.franchise_key, journal.location_key, journal.booking_id].forEach(
      (value, index) => id(value, "JOURNAL_IDENTITY_" + index),
    );

    const financeResult = await client.query<FinanceEventRow>(
      "/* cclub-phase9-erp-v41:finance-event */ " +
        'SELECT "id"::text, "tenant_id"::text, "booking_id", "booking_version", ' +
        '"revenue_journal_id"::text, "event_kind", "currency", "amount_minor" ' +
        'FROM "CraysClubBookingFinanceEvent" ' +
        'WHERE "tenant_id" = $1::uuid AND "id" = $2::uuid FOR UPDATE',
      [tenantId, financeEventId],
    );
    const finance = financeResult.rows[0];
    if (!finance) reject("FINANCE_EVENT_NOT_FOUND");
    if (
      finance.event_kind !== "PAYMENT_CAPTURED" ||
      finance.revenue_journal_id !== journalId ||
      finance.booking_id !== journal.booking_id ||
      integer(finance.booking_version, "FINANCE_BOOKING_VERSION", 1) !== bookingVersion ||
      finance.currency !== journal.currency ||
      integer(finance.amount_minor, "FINANCE_AMOUNT", 1) !== gross
    ) reject("FINANCE_EVENT_LINEAGE_MISMATCH");

    const allocationResult = await client.query<AllocationRow>(
      "/* cclub-phase9-erp-v41:allocations */ " +
        'SELECT a."id"::text, a."allocation_kind", a."basis_points", a."amount_minor", ' +
        'a."rounding_rank", r."resolution_state", r."beneficiary_kind", ' +
        'r."beneficiary_reference", r."evidence_reference" ' +
        'FROM "CraysClubBookingRevenueAllocation" a ' +
        'LEFT JOIN LATERAL (SELECT "resolution_state", "beneficiary_kind", ' +
        '"beneficiary_reference", "evidence_reference" ' +
        'FROM "CraysClubBookingRevenueBeneficiaryResolution" r0 ' +
        'WHERE r0."tenant_id" = a."tenant_id" AND r0."allocation_id" = a."id" ' +
        'ORDER BY r0."resolution_version" DESC LIMIT 1) r ON true ' +
        'WHERE a."tenant_id" = $1::uuid AND a."journal_id" = $2::uuid ' +
        'ORDER BY a."rounding_rank", a."allocation_kind" FOR UPDATE OF a',
      [tenantId, journalId],
    );
    if (allocationResult.rows.length !== 4) reject("ALLOCATION_COUNT_INVALID");

    const allocationByKind = new Map(
      allocationResult.rows.map((row) => [row.allocation_kind, row]),
    );
    const marketing = allocationByKind.get("MARKETING_CONTRIBUTION");
    const technology = allocationByKind.get("PERSONAL_TECHNOLOGY_RIGHT");
    const globalConcept = allocationByKind.get("GLOBAL_CONCEPT_RIGHT");
    const operating = allocationByKind.get("OPERATING_REMAINDER");
    if (!marketing || !technology || !globalConcept || !operating) {
      reject("ALLOCATION_KIND_SET_INVALID");
    }

    const expectedAmounts = {
      marketing: Math.floor((gross * 1000) / 10000),
      technology: Math.floor((gross * 500) / 10000),
      globalConcept: Math.floor((gross * 25) / 10000),
    };
    const operatingAmount =
      gross - expectedAmounts.marketing - expectedAmounts.technology - expectedAmounts.globalConcept;
    const exact = [
      [marketing, 1000, expectedAmounts.marketing],
      [technology, 500, expectedAmounts.technology],
      [globalConcept, 25, expectedAmounts.globalConcept],
      [operating, 8475, operatingAmount],
    ] as const;
    for (const [allocation, bps, amount] of exact) {
      if (
        allocation.basis_points !== bps ||
        integer(allocation.amount_minor, "ALLOCATION_AMOUNT") !== amount
      ) reject("ALLOCATION_MATH_INVALID");
    }

    let marketingAssignment: "CONFIRMED_AMBASSADOR" | "CRAYS_MARKETING_FUND";
    let marketingResolution: { reference: string; evidence: string };
    if (journal.confirmed_ambassador_id) {
      id(journal.confirmed_ambassador_id, "CONFIRMED_AMBASSADOR");
      marketingAssignment = "CONFIRMED_AMBASSADOR";
      marketingResolution = requireResolution(marketing, "AMBASSADOR", "MARKETING");
      if (marketingResolution.reference !== journal.confirmed_ambassador_id) {
        reject("AMBASSADOR_ATTRIBUTION_MISMATCH");
      }
    } else {
      marketingAssignment = "CRAYS_MARKETING_FUND";
      marketingResolution = requireResolution(marketing, "CRAYS_MARKETING_FUND", "MARKETING");
    }
    const technologyResolution = requireResolution(
      technology,
      "PERSONAL_TECHNOLOGY_RIGHT_HOLDER",
      "TECHNOLOGY",
    );
    const globalResolution = requireResolution(
      globalConcept,
      "GLOBAL_CONCEPT_COMPANY",
      "GLOBAL_CONCEPT",
    );
    const operatingResolution = requireResolution(
      operating,
      "FRANCHISE_OPERATING_ENTITY",
      "OPERATING",
    );

    const bookingReferenceSha256 = sha(
      canonical({
        tenantId,
        projectKey: journal.project_key,
        franchiseKey: journal.franchise_key,
        locationKey: journal.location_key,
        bookingId: journal.booking_id,
        bookingVersion,
      }),
    );

    const postingBatchId = deterministicUuid(
      "posting-batch|" + tenantId + "|" + financeEventId + "|PAYMENT_CAPTURE",
    );
    const outboxId = deterministicUuid(
      "erp-outbox|" + tenantId + "|" + postingBatchId + "|BOOKING_REVENUE_EXPORT_V1",
    );

    const allocationCore = {
      currency: journal.currency,
      totalMinor: gross,
      marketing: {
        bps: 1000 as const,
        amountMinor: expectedAmounts.marketing,
        assignment: marketingAssignment,
        beneficiaryReferenceSha256: sha(marketingResolution.reference),
        confirmationReceiptSha256:
          marketingAssignment === "CONFIRMED_AMBASSADOR"
            ? sha(marketingResolution.evidence)
            : undefined,
      },
      technology: {
        bps: 500 as const,
        amountMinor: expectedAmounts.technology,
        beneficiaryReferenceSha256: sha(technologyResolution.reference),
      },
      globalConcept: {
        bps: 25 as const,
        amountMinor: expectedAmounts.globalConcept,
        companyState: "RESOLVED" as const,
        companyReferenceSha256: sha(globalResolution.reference),
        companyResolutionReceiptSha256: sha(globalResolution.evidence),
      },
      operating: {
        bps: 8475 as const,
        amountMinor: operatingAmount,
        beneficiaryReferenceSha256: sha(operatingResolution.reference),
      },
      containsPii: false as const,
    };
    const allocationReceiptSha256 = sha(canonical(allocationCore));
    const allocationReceiptId = "allocation_receipt_v1_" + allocationReceiptSha256.slice(0, 32);

    const lineSpecs = [
      {
        number: 1,
        accountRole: "PAYMENT_PROVIDER_CLEARING",
        beneficiaryKind: null,
        beneficiaryReference: null,
        debitMinor: gross,
        creditMinor: 0,
      },
      {
        number: 2,
        accountRole:
          marketingAssignment === "CONFIRMED_AMBASSADOR"
            ? "AMBASSADOR_MARKETING_PAYABLE"
            : "MARKETING_CONTRIBUTION_PAYABLE",
        beneficiaryKind: marketing.beneficiary_kind,
        beneficiaryReference: marketingResolution.reference,
        debitMinor: 0,
        creditMinor: expectedAmounts.marketing,
      },
      {
        number: 3,
        accountRole: "PERSONAL_TECHNOLOGY_RIGHT_PAYABLE",
        beneficiaryKind: technology.beneficiary_kind,
        beneficiaryReference: technologyResolution.reference,
        debitMinor: 0,
        creditMinor: expectedAmounts.technology,
      },
      {
        number: 4,
        accountRole: "GLOBAL_CONCEPT_RIGHT_PAYABLE",
        beneficiaryKind: globalConcept.beneficiary_kind,
        beneficiaryReference: globalResolution.reference,
        debitMinor: 0,
        creditMinor: expectedAmounts.globalConcept,
      },
      {
        number: 5,
        accountRole: "FRANCHISE_OPERATING_PAYABLE",
        beneficiaryKind: operating.beneficiary_kind,
        beneficiaryReference: operatingResolution.reference,
        debitMinor: 0,
        creditMinor: operatingAmount,
      },
    ];

    const payloadSha256 = sha(
      canonical({
        contractVersion: 1,
        tenantId,
        postingBatchId,
        financeEventId,
        currency: journal.currency,
        allocationReceiptSha256,
        lines: lineSpecs.map((line) => ({
          lineNumber: line.number,
          accountRole: line.accountRole,
          beneficiaryReferenceSha256: line.beneficiaryReference
            ? sha(line.beneficiaryReference)
            : null,
          debitMinor: line.debitMinor,
          creditMinor: line.creditMinor,
        })),
      }),
    );
    const sourceEventSha256 = sha(
      canonical({
        eventType: "BOOKING_REVENUE_ALLOCATION_READY",
        eventId: outboxId,
        allocationReceiptId,
        allocationReceiptSha256,
        bookingReferenceSha256,
        payloadSha256,
      }),
    );
    const allocationReceipt: BookingRevenueAllocationReceipt = Object.freeze({
      allocationReceiptId,
      allocationReceiptSha256,
      sourceEventId: outboxId,
      sourceEventSha256,
      ...allocationCore,
    });

    const receiptExpected: AnyRow = {
      id: allocationReceiptId,
      tenant_id: tenantId,
      journal_id: journalId,
      source_event_id: outboxId,
      source_event_sha256: sourceEventSha256,
      allocation_receipt_sha256: allocationReceiptSha256,
      currency: journal.currency,
      total_minor: gross,
      marketing_bps: 1000,
      marketing_minor: expectedAmounts.marketing,
      marketing_assignment: marketingAssignment,
      marketing_beneficiary_sha256: allocationCore.marketing.beneficiaryReferenceSha256,
      ambassador_confirmation_receipt_sha256:
        allocationCore.marketing.confirmationReceiptSha256 ?? null,
      technology_bps: 500,
      technology_minor: expectedAmounts.technology,
      technology_beneficiary_sha256: allocationCore.technology.beneficiaryReferenceSha256,
      global_concept_bps: 25,
      global_concept_minor: expectedAmounts.globalConcept,
      global_concept_company_sha256: allocationCore.globalConcept.companyReferenceSha256,
      global_concept_resolution_receipt_sha256:
        allocationCore.globalConcept.companyResolutionReceiptSha256,
      operating_bps: 8475,
      operating_minor: operatingAmount,
      operating_beneficiary_sha256: allocationCore.operating.beneficiaryReferenceSha256,
    };
    const receiptInsert = await client.query(
      "/* cclub-phase9-erp-v41:receipt-insert */ " +
        'INSERT INTO "CraysClubBookingRevenueAllocationReceipt" ' +
        '("id","tenant_id","journal_id","source_event_id","source_event_sha256",' +
        '"allocation_receipt_sha256","currency","total_minor","marketing_bps",' +
        '"marketing_minor","marketing_assignment","marketing_beneficiary_sha256",' +
        '"ambassador_confirmation_receipt_sha256","technology_bps","technology_minor",' +
        '"technology_beneficiary_sha256","global_concept_bps","global_concept_minor",' +
        '"global_concept_company_sha256","global_concept_resolution_receipt_sha256",' +
        '"operating_bps","operating_minor","operating_beneficiary_sha256") ' +
        "VALUES ($1,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) " +
        "ON CONFLICT DO NOTHING",
      Object.values(receiptExpected),
    );
    const receiptRead = await client.query<AnyRow>(
      "/* cclub-phase9-erp-v41:receipt-read */ " +
        'SELECT "id","tenant_id"::text,"journal_id"::text,"source_event_id"::text,' +
        '"source_event_sha256","allocation_receipt_sha256","currency","total_minor",' +
        '"marketing_bps","marketing_minor","marketing_assignment","marketing_beneficiary_sha256",' +
        '"ambassador_confirmation_receipt_sha256","technology_bps","technology_minor",' +
        '"technology_beneficiary_sha256","global_concept_bps","global_concept_minor",' +
        '"global_concept_company_sha256","global_concept_resolution_receipt_sha256",' +
        '"operating_bps","operating_minor","operating_beneficiary_sha256" ' +
        'FROM "CraysClubBookingRevenueAllocationReceipt" ' +
        'WHERE "tenant_id" = $1::uuid AND "id" = $2',
      [tenantId, allocationReceiptId],
    );
    assertRow(receiptRead.rows[0], receiptExpected, "RECEIPT");

    const batchExpected: AnyRow = {
      id: postingBatchId,
      tenant_id: tenantId,
      finance_event_id: financeEventId,
      posting_kind: "PAYMENT_CAPTURE",
      currency: journal.currency,
      semantic_mapping_version: "cclub-booking-revenue-erp-v1",
      prepared_at: preparedAt,
    };
    await client.query(
      "/* cclub-phase9-erp-v41:batch-insert */ " +
        'INSERT INTO "CraysClubErpPostingBatch" ' +
        '("id","tenant_id","finance_event_id","posting_kind","currency","semantic_mapping_version","prepared_at") ' +
        "VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::timestamptz) ON CONFLICT DO NOTHING",
      Object.values(batchExpected),
    );
    const batchRead = await client.query<AnyRow>(
      "/* cclub-phase9-erp-v41:batch-read */ " +
        'SELECT "id"::text,"tenant_id"::text,"finance_event_id"::text,"posting_kind",' +
        '"currency","semantic_mapping_version","prepared_at" FROM "CraysClubErpPostingBatch" ' +
        'WHERE "tenant_id" = $1::uuid AND "id" = $2::uuid',
      [tenantId, postingBatchId],
    );
    assertRow(batchRead.rows[0], batchExpected, "POSTING_BATCH");

    for (const line of lineSpecs) {
      const lineExpected: AnyRow = {
        id: deterministicUuid(postingBatchId + "|line|" + line.number),
        tenant_id: tenantId,
        posting_batch_id: postingBatchId,
        line_number: line.number,
        account_role: line.accountRole,
        beneficiary_kind: line.beneficiaryKind,
        beneficiary_reference: line.beneficiaryReference,
        debit_minor: line.debitMinor,
        credit_minor: line.creditMinor,
        project_key: journal.project_key,
        franchise_key: journal.franchise_key,
        location_key: journal.location_key,
        booking_id: journal.booking_id,
      };
      await client.query(
        "/* cclub-phase9-erp-v41:line-insert */ " +
          'INSERT INTO "CraysClubErpJournalLine" ' +
          '("id","tenant_id","posting_batch_id","line_number","account_role",' +
          '"beneficiary_kind","beneficiary_reference","debit_minor","credit_minor",' +
          '"project_key","franchise_key","location_key","booking_id") ' +
          "VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) " +
          "ON CONFLICT DO NOTHING",
        Object.values(lineExpected),
      );
      const lineRead = await client.query<AnyRow>(
        "/* cclub-phase9-erp-v41:line-read */ " +
          'SELECT "id"::text,"tenant_id"::text,"posting_batch_id"::text,"line_number",' +
          '"account_role","beneficiary_kind","beneficiary_reference","debit_minor",' +
          '"credit_minor","project_key","franchise_key","location_key","booking_id" ' +
          'FROM "CraysClubErpJournalLine" ' +
          'WHERE "tenant_id" = $1::uuid AND "id" = $2::uuid',
        [tenantId, lineExpected.id],
      );
      assertRow(lineRead.rows[0], lineExpected, "JOURNAL_LINE_" + line.number);
    }

    const outboxExpected: AnyRow = {
      id: outboxId,
      tenant_id: tenantId,
      posting_batch_id: postingBatchId,
      erp_target_kind: "BOOKING_REVENUE_EXPORT_V1",
      idempotency_key: "cclub.erp.revenue." + sourceEventSha256,
      payload_hash: payloadSha256,
      state: "PENDING",
      attempt_count: 0,
      next_attempt_at: preparedAt,
      lease_owner: null,
      lease_id: null,
      lease_version: 0,
      lease_until: null,
      erp_reference: null,
      last_error_code: null,
      source_event_kind: "BOOKING_REVENUE_ALLOCATION_READY",
      source_event_sha256: sourceEventSha256,
      booking_reference_sha256: bookingReferenceSha256,
      allocation_receipt_id: allocationReceiptId,
      allocation_receipt_sha256: allocationReceiptSha256,
    };
    await client.query(
      "/* cclub-phase9-erp-v41:outbox-insert */ " +
        'INSERT INTO "CraysClubErpDispatchOutbox" ' +
        '("id","tenant_id","posting_batch_id","erp_target_kind","idempotency_key",' +
        '"payload_hash","state","attempt_count","next_attempt_at","lease_owner",' +
        '"lease_id","lease_version","lease_until","erp_reference","last_error_code",' +
        '"source_event_kind","source_event_sha256","booking_reference_sha256",' +
        '"allocation_receipt_id","allocation_receipt_sha256") ' +
        "VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9::timestamptz,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) " +
        "ON CONFLICT DO NOTHING",
      Object.values(outboxExpected),
    );
    const outboxRead = await client.query<AnyRow>(
      "/* cclub-phase9-erp-v41:outbox-read */ " +
        'SELECT "id"::text,"tenant_id"::text,"posting_batch_id"::text,"erp_target_kind",' +
        '"idempotency_key","payload_hash","state","attempt_count","next_attempt_at",' +
        '"lease_owner","lease_id","lease_version","lease_until","erp_reference",' +
        '"last_error_code","source_event_kind","source_event_sha256",' +
        '"booking_reference_sha256","allocation_receipt_id","allocation_receipt_sha256" ' +
        'FROM "CraysClubErpDispatchOutbox" ' +
        'WHERE "tenant_id" = $1::uuid AND "id" = $2::uuid',
      [tenantId, outboxId],
    );
    assertRow(outboxRead.rows[0], outboxExpected, "ERP_OUTBOX");

    return Object.freeze({
      outboxId,
      postingBatchId,
      allocationReceipt,
      bookingReferenceSha256,
      payloadSha256,
      replayed: receiptInsert.rowCount === 0,
    });
  });
}
