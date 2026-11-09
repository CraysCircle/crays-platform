import "server-only";

import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

import { getCorePgPool } from "@/db/client";
import type {
  AmbassadorBackofficeReadiness,
  AmbassadorBackofficeReadinessInput,
} from "./ambassador-backoffice-contract";
import type { BookingRevenueAllocation } from "./franchise-revenue-allocation-contract";
import type { StripeAutomaticBookingSplitPlan } from "./stripe-automatic-booking-split-contract";

const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,180}$/;
const PROVIDER_ID = /^[A-Za-z0-9_][A-Za-z0-9_-]{2,180}$/;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stableId(prefix: string, value: unknown): string {
  return prefix + "_" + digest(value).slice(0, 48);
}

function exact(value: string, pattern: RegExp, code: string): string {
  if (typeof value !== "string" || !pattern.test(value.trim())) {
    throw new Error(code);
  }
  return value.trim();
}

function instant(value: string, code: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return new Date(parsed).toISOString();
}

async function transaction<T>(
  tenantId: string,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  exact(tenantId, ID, "CCLUB_PHASE8_TENANT_INVALID");
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    await client.query(
      "select set_config('crays.app_role','core_service',true)",
    );
    await client.query(
      "select set_config('crays.tenant_id',$1,true)",
      [tenantId],
    );
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export type AmbassadorPaperworkReceiptInput = Readonly<{
  paperworkReceiptId: string;
  documentKind:
    | "FRANCHISE_OR_AMBASSADOR_AGREEMENT"
    | "AGREEMENT_AMENDMENT"
    | "ESIGNATURE_COMPLETION"
    | "IDENTITY_OR_KYB"
    | "TAX_RESIDENCY"
    | "WITHHOLDING_FORM"
    | "STRIPE_ONBOARDING"
    | "BANK_OWNERSHIP"
    | "ERP_PAYEE_MASTER"
    | "INVOICE_OR_SELF_BILLING_POLICY"
    | "OTHER_REQUIRED";
  documentReference: string;
  documentSha256: string;
  storageProvider:
    | "NEXTCLOUD"
    | "STRIPE"
    | "ERPNEXT"
    | "ESIGN_PROVIDER"
    | "CRAYS_CORE";
  documentState:
    | "RECEIVED"
    | "VERIFIED"
    | "SIGNED"
    | "SUPERSEDED"
    | "REVOKED";
  authorityReceiptSha256: string;
}>;

export async function persistAmbassadorBackofficeAuthority(input: {
  tenantId: string;
  authorityId: string;
  authorityVersion: number;
  readinessInput: AmbassadorBackofficeReadinessInput;
  readiness: AmbassadorBackofficeReadiness;
  paperwork: readonly AmbassadorPaperworkReceiptInput[];
  createdAt: string;
}) {
  const authorityId = exact(
    input.authorityId,
    ID,
    "CCLUB_AMBASSADOR_AUTHORITY_ID_INVALID",
  );
  if (
    !Number.isSafeInteger(input.authorityVersion) ||
    input.authorityVersion < 1 ||
    input.readiness.readinessReceiptHash !==
      digest({
        contractVersion: input.readiness.contractVersion,
        projectId: input.readiness.projectId,
        partnerTenantId: input.readiness.partnerTenantId,
        operatorLegalEntityId: input.readiness.operatorLegalEntityId,
        ambassadorPartyId: input.readiness.ambassadorPartyId,
        ambassadorRelationshipVersion:
          input.readiness.ambassadorRelationshipVersion,
        state: input.readiness.state,
        blockers: input.readiness.blockers,
        erpBinding: input.readiness.erpBinding,
        paperworkBinding: input.readiness.paperworkBinding,
        stripeBindingReceiptHash:
          input.readiness.stripeBindingReceiptHash,
        visibleScopes: input.readiness.visibleScopes,
        foreignAmbassadorAccess:
          input.readiness.foreignAmbassadorAccess,
        foreignProjectAccess: input.readiness.foreignProjectAccess,
        performsProviderMutation:
          input.readiness.performsProviderMutation,
      })
  ) {
    throw new Error("CCLUB_AMBASSADOR_READINESS_RECEIPT_CONFLICT");
  }

  const createdAt = instant(
    input.createdAt,
    "CCLUB_AMBASSADOR_CREATED_AT_INVALID",
  );
  return transaction(input.tenantId, async (client) => {
    const inserted = await client.query<{
      readiness_receipt_sha256: string;
    }>(
      `insert into crays_core.clubs_ambassador_backoffice_authority_versions (
         authority_id,authority_version,tenant_id,project_id,partner_tenant_id,
         operator_legal_entity_id,ambassador_party_id,
         ambassador_relationship_version,readiness_state,readiness_snapshot,
         readiness_receipt_sha256,activated_role_assignment_receipt_sha256,
         stripe_account_binding_receipt_sha256,
         erp_payee_binding_receipt_sha256,
         paperwork_manifest_receipt_sha256,created_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16
       ) on conflict (authority_id,authority_version) do nothing
       returning readiness_receipt_sha256`,
      [
        authorityId,
        input.authorityVersion,
        input.tenantId,
        input.readiness.projectId,
        input.readiness.partnerTenantId,
        input.readiness.operatorLegalEntityId,
        input.readiness.ambassadorPartyId,
        input.readiness.ambassadorRelationshipVersion,
        input.readiness.state,
        JSON.stringify(input.readiness),
        input.readiness.readinessReceiptHash,
        input.readinessInput.roleAssignmentReceipt.receiptHash,
        input.readinessInput.stripeAccountBindingReceipt.receiptHash,
        input.readinessInput.erpPayeeBindingReceipt.receiptHash,
        input.readinessInput.paperworkManifestReceipt.receiptHash,
        createdAt,
      ],
    );

    if (!inserted.rows[0]) {
      const replay = await client.query<{
        readiness_receipt_sha256: string;
      }>(
        `select readiness_receipt_sha256
           from crays_core.clubs_ambassador_backoffice_authority_versions
          where authority_id=$1 and authority_version=$2`,
        [authorityId, input.authorityVersion],
      );
      if (
        replay.rows[0]?.readiness_receipt_sha256 !==
        input.readiness.readinessReceiptHash
      ) {
        throw new Error("CCLUB_AMBASSADOR_AUTHORITY_REPLAY_CONFLICT");
      }
    }

    for (const document of input.paperwork) {
      exact(
        document.paperworkReceiptId,
        ID,
        "CCLUB_AMBASSADOR_PAPERWORK_INVALID",
      );
      exact(
        document.documentReference,
        ID,
        "CCLUB_AMBASSADOR_PAPERWORK_INVALID",
      );
      exact(
        document.documentSha256,
        HASH,
        "CCLUB_AMBASSADOR_PAPERWORK_INVALID",
      );
      exact(
        document.authorityReceiptSha256,
        HASH,
        "CCLUB_AMBASSADOR_PAPERWORK_INVALID",
      );
      await client.query(
        `insert into crays_core.clubs_ambassador_paperwork_receipts (
           paperwork_receipt_id,tenant_id,authority_id,authority_version,
           project_id,ambassador_party_id,document_kind,document_reference,
           document_sha256,storage_provider,document_state,
           authority_receipt_sha256,created_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (
           tenant_id,authority_id,authority_version,document_kind,
           document_reference,document_sha256
         ) do nothing`,
        [
          document.paperworkReceiptId,
          input.tenantId,
          authorityId,
          input.authorityVersion,
          input.readiness.projectId,
          input.readiness.ambassadorPartyId,
          document.documentKind,
          document.documentReference,
          document.documentSha256,
          document.storageProvider,
          document.documentState,
          document.authorityReceiptSha256,
          createdAt,
        ],
      );
    }
    return Object.freeze({
      authorityId,
      authorityVersion: input.authorityVersion,
      readinessReceiptSha256:
        input.readiness.readinessReceiptHash,
      replayed: !inserted.rows[0],
    });
  });
}

export async function persistAutomaticBookingSplit(input: {
  tenantId: string;
  allocation: BookingRevenueAllocation;
  plan: StripeAutomaticBookingSplitPlan;
  paymentCommandId: string;
  paymentCommandSha256: string;
  createdAt: string;
}) {
  const { allocation, plan } = input;
  if (
    plan.projectId !== allocation.projectId ||
    plan.partnerTenantId !== allocation.partnerTenantId ||
    plan.operatorLegalEntityId !== allocation.operatorLegalEntityId ||
    plan.bookingId !== allocation.bookingId ||
    plan.orderId !== allocation.orderId ||
    plan.allocationReceiptHash !==
      allocation.allocationReceiptHash ||
    plan.paymentIntent.amountMinor !==
      allocation.allocationBaseMinor ||
    plan.paymentIntent.applicationFeeAmountMinor !==
      allocation.allocatedMinor ||
    plan.transfers.length !== 3
  ) {
    throw new Error("CCLUB_STRIPE_SPLIT_PLAN_SCOPE_CONFLICT");
  }
  exact(
    input.paymentCommandId,
    ID,
    "CCLUB_STRIPE_PAYMENT_COMMAND_INVALID",
  );
  exact(
    input.paymentCommandSha256,
    HASH,
    "CCLUB_STRIPE_PAYMENT_COMMAND_INVALID",
  );
  const createdAt = instant(
    input.createdAt,
    "CCLUB_STRIPE_SPLIT_CREATED_AT_INVALID",
  );
  const splitCommandId = stableId("clubs_split", {
    tenantId: input.tenantId,
    splitPlanHash: plan.splitPlanHash,
  });

  return transaction(input.tenantId, async (client) => {
    const inserted = await client.query<{
      split_plan_sha256: string;
    }>(
      `insert into crays_core.clubs_booking_revenue_split_commands (
         split_command_id,tenant_id,project_id,partner_tenant_id,
         operator_legal_entity_id,booking_id,order_id,policy_id,
         policy_version,policy_sha256,allocation_receipt_sha256,
         split_plan_sha256,payment_command_id,payment_command_sha256,
         stripe_api_version,stripe_charge_mode,operator_stripe_account_id,
         merchant_of_record_legal_entity_id,currency,
         booking_payment_amount_minor,application_fee_bps,
         application_fee_amount_minor,platform_contractual_retention_minor,
         transfer_group,command_state,created_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
         'DIRECT_CHARGE',$16,$17,$18,$19,1525,$20,0,$21,'PREPARED',$22
       ) on conflict (tenant_id,booking_id) do nothing
       returning split_plan_sha256`,
      [
        splitCommandId,
        input.tenantId,
        plan.projectId,
        plan.partnerTenantId,
        plan.operatorLegalEntityId,
        plan.bookingId,
        plan.orderId,
        allocation.policyId,
        allocation.policyVersion,
        allocation.policyHash,
        allocation.allocationReceiptHash,
        plan.splitPlanHash,
        input.paymentCommandId,
        input.paymentCommandSha256,
        plan.stripeApiVersion,
        plan.paymentIntent.createOnConnectedAccountId,
        plan.paymentIntent.merchantOfRecordLegalEntityId,
        allocation.currency,
        plan.paymentIntent.amountMinor,
        plan.paymentIntent.applicationFeeAmountMinor,
        plan.paymentIntent.transferGroup,
        createdAt,
      ],
    );

    if (!inserted.rows[0]) {
      const replay = await client.query<{
        split_plan_sha256: string;
      }>(
        `select split_plan_sha256
           from crays_core.clubs_booking_revenue_split_commands
          where tenant_id=$1 and booking_id=$2`,
        [input.tenantId, plan.bookingId],
      );
      if (replay.rows[0]?.split_plan_sha256 !== plan.splitPlanHash) {
        throw new Error("CCLUB_STRIPE_SPLIT_REPLAY_CONFLICT");
      }
      return Object.freeze({
        splitCommandId,
        splitPlanSha256: plan.splitPlanHash,
        replayed: true,
      });
    }

    for (const transfer of plan.transfers) {
      const allocationLine = allocation.lines.find(
        (line) => line.code === transfer.allocationCode,
      );
      if (
        !allocationLine ||
        allocationLine.amountMinor !== transfer.amountMinor
      ) {
        throw new Error("CCLUB_STRIPE_SPLIT_LINE_CONFLICT");
      }
      const splitLineId = stableId("clubs_split_line", {
        splitCommandId,
        allocationCode: transfer.allocationCode,
      });
      await client.query(
        `insert into crays_core.clubs_booking_revenue_split_lines (
           split_line_id,tenant_id,split_command_id,allocation_code,rate_bps,
           amount_minor,beneficiary_party_id,beneficiary_ledger_account_id,
           destination_stripe_account_id,destination_account_binding_version,
           capability_receipt_sha256,requirements_receipt_sha256,
           cross_border_authority,cross_border_authority_receipt_sha256,
           transfer_idempotency_key,created_at
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
         )`,
        [
          splitLineId,
          input.tenantId,
          splitCommandId,
          transfer.allocationCode,
          allocationLine.rateBps,
          transfer.amountMinor,
          allocationLine.beneficiary.partyId,
          allocationLine.beneficiary.ledgerAccountId,
          transfer.destinationConnectedAccountId,
          transfer.accountBindingVersion,
          transfer.capabilityReceiptHash,
          transfer.requirementsReceiptHash,
          transfer.crossBorderAuthority,
          transfer.crossBorderAuthorityReceiptHash,
          transfer.transferIdempotencyKey,
          createdAt,
        ],
      );
    }

    const directChargeOutboxId = stableId("clubs_stripe_outbox", {
      splitCommandId,
      operationKind: "DIRECT_CHARGE",
    });
    await client.query(
      `insert into crays_core.clubs_stripe_split_outbox (
         outbox_id,tenant_id,split_command_id,split_line_id,operation_kind,
         execution_order,idempotency_key,request_payload,request_sha256,
         delivery_state,attempt_count,next_attempt_at,created_at,updated_at
       ) values (
         $1,$2,$3,null,'DIRECT_CHARGE',1,$4,$5::jsonb,$6,
         'PENDING',0,$7,$7,$7
       )`,
      [
        directChargeOutboxId,
        input.tenantId,
        splitCommandId,
        plan.paymentIntent.idempotencyKey,
        JSON.stringify(plan.paymentIntent),
        digest(plan.paymentIntent),
        createdAt,
      ],
    );
    return Object.freeze({
      splitCommandId,
      directChargeOutboxId,
      splitPlanSha256: plan.splitPlanHash,
      replayed: false,
    });
  });
}

export async function recordStripePaymentAndReleaseTransfers(input: {
  tenantId: string;
  splitCommandId: string;
  providerEventId: string;
  paymentIntentId: string;
  chargeId: string;
  applicationFeeId: string;
  operatorStripeAccountId: string;
  amountMinor: number;
  applicationFeeAmountMinor: number;
  currency: string;
  signatureVerificationReceiptSha256: string;
  providerPayloadSha256: string;
  observedAt: string;
}) {
  [
    input.splitCommandId,
    input.providerEventId,
    input.paymentIntentId,
    input.chargeId,
    input.applicationFeeId,
    input.operatorStripeAccountId,
  ].forEach((value) =>
    exact(value, PROVIDER_ID, "CCLUB_STRIPE_PAYMENT_RECEIPT_INVALID"),
  );
  exact(
    input.signatureVerificationReceiptSha256,
    HASH,
    "CCLUB_STRIPE_PAYMENT_RECEIPT_INVALID",
  );
  exact(
    input.providerPayloadSha256,
    HASH,
    "CCLUB_STRIPE_PAYMENT_RECEIPT_INVALID",
  );
  const observedAt = instant(
    input.observedAt,
    "CCLUB_STRIPE_PAYMENT_RECEIPT_INVALID",
  );

  return transaction(input.tenantId, async (client) => {
    const command = await client.query<{
      split_command_id: string;
      booking_payment_amount_minor: string;
      application_fee_amount_minor: string;
      currency: string;
      operator_stripe_account_id: string;
      transfer_group: string;
    }>(
      `select split_command_id,booking_payment_amount_minor,
              application_fee_amount_minor,currency,
              operator_stripe_account_id,transfer_group
         from crays_core.clubs_booking_revenue_split_commands
        where tenant_id=$1 and split_command_id=$2
        for share`,
      [input.tenantId, input.splitCommandId],
    );
    const row = command.rows[0];
    if (
      !row ||
      Number(row.booking_payment_amount_minor) !== input.amountMinor ||
      Number(row.application_fee_amount_minor) !==
        input.applicationFeeAmountMinor ||
      row.currency !== input.currency ||
      row.operator_stripe_account_id !== input.operatorStripeAccountId
    ) {
      throw new Error("CCLUB_STRIPE_PAYMENT_RECEIPT_SCOPE_CONFLICT");
    }

    const receiptBody = {
      splitCommandId: input.splitCommandId,
      providerEventId: input.providerEventId,
      paymentIntentId: input.paymentIntentId,
      chargeId: input.chargeId,
      applicationFeeId: input.applicationFeeId,
      operatorStripeAccountId: input.operatorStripeAccountId,
      amountMinor: input.amountMinor,
      applicationFeeAmountMinor: input.applicationFeeAmountMinor,
      currency: input.currency,
      signatureVerificationReceiptSha256:
        input.signatureVerificationReceiptSha256,
      providerPayloadSha256: input.providerPayloadSha256,
      observedAt,
    };
    const receiptSha256 = digest(receiptBody);
    const providerReceiptId = stableId(
      "clubs_stripe_receipt",
      receiptBody,
    );
    const inserted = await client.query(
      `insert into crays_core.clubs_stripe_split_provider_receipts (
         provider_receipt_id,tenant_id,split_command_id,split_line_id,
         outbox_id,provider_event_id,provider_object_type,
         provider_object_id,provider_account_id,provider_state,
         amount_minor,currency,signature_verification_receipt_sha256,
         provider_payload_sha256,receipt_sha256,observed_at,created_at
       ) select $1,$2,$3,null,o.outbox_id,$4,'PAYMENT_INTENT',$5,$6,
                'SUCCEEDED_APPLICATION_FEE_CONFIRMED',$7,$8,$9,$10,$11,$12,$12
           from crays_core.clubs_stripe_split_outbox o
          where o.tenant_id=$2 and o.split_command_id=$3
            and o.operation_kind='DIRECT_CHARGE'
       on conflict (tenant_id,provider_event_id,provider_object_id) do nothing`,
      [
        providerReceiptId,
        input.tenantId,
        input.splitCommandId,
        input.providerEventId,
        input.paymentIntentId,
        input.operatorStripeAccountId,
        input.amountMinor,
        input.currency,
        input.signatureVerificationReceiptSha256,
        input.providerPayloadSha256,
        receiptSha256,
        observedAt,
      ],
    );

    if (!inserted.rowCount) {
      const replay = await client.query<{ receipt_sha256: string }>(
        `select receipt_sha256
           from crays_core.clubs_stripe_split_provider_receipts
          where tenant_id=$1 and provider_event_id=$2
            and provider_object_id=$3`,
        [input.tenantId, input.providerEventId, input.paymentIntentId],
      );
      if (replay.rows[0]?.receipt_sha256 !== receiptSha256) {
        throw new Error("CCLUB_STRIPE_PAYMENT_RECEIPT_REPLAY_CONFLICT");
      }
    }

    await client.query(
      `update crays_core.clubs_stripe_split_outbox
          set delivery_state='ACKNOWLEDGED_PENDING_RECONCILIATION',
              lease_owner_sha256=null,lease_expires_at=null,
              updated_at=$3
        where tenant_id=$1 and split_command_id=$2
          and operation_kind='DIRECT_CHARGE'
          and delivery_state in (
            'PENDING','CLAIMED','FAILED_RETRYABLE',
            'UNKNOWN_RECONCILIATION_REQUIRED',
            'ACKNOWLEDGED_PENDING_RECONCILIATION'
          )`,
      [input.tenantId, input.splitCommandId, observedAt],
    );

    const lines = await client.query<{
      split_line_id: string;
      allocation_code: string;
      amount_minor: string;
      destination_stripe_account_id: string;
      transfer_idempotency_key: string;
    }>(
      `select split_line_id,allocation_code,amount_minor,
              destination_stripe_account_id,transfer_idempotency_key
         from crays_core.clubs_booking_revenue_split_lines
        where tenant_id=$1 and split_command_id=$2
        order by case allocation_code
          when 'PROJECT_MARKETING_CONTRIBUTION' then 1
          when 'TECHNOLOGY_MARKETING_FEE' then 2
          else 3 end`,
      [input.tenantId, input.splitCommandId],
    );
    if (lines.rows.length !== 3) {
      throw new Error("CCLUB_STRIPE_THREE_TRANSFER_LINES_REQUIRED");
    }

    const transferOutboxIds: string[] = [];
    for (const [index, line] of lines.rows.entries()) {
      const payload = {
        amountMinor: Number(line.amount_minor),
        currency: input.currency.toLowerCase(),
        destinationConnectedAccountId:
          line.destination_stripe_account_id,
        transferGroup: row.transfer_group,
        sourceAuthority: "APPLICATION_FEE_PROCEEDS",
        paymentIntentId: input.paymentIntentId,
        applicationFeeId: input.applicationFeeId,
        paymentReceiptSha256: receiptSha256,
        allocationCode: line.allocation_code,
      };
      const outboxId = stableId("clubs_stripe_outbox", {
        splitCommandId: input.splitCommandId,
        splitLineId: line.split_line_id,
        operationKind: "BENEFICIARY_TRANSFER",
      });
      transferOutboxIds.push(outboxId);
      await client.query(
        `insert into crays_core.clubs_stripe_split_outbox (
           outbox_id,tenant_id,split_command_id,split_line_id,
           operation_kind,execution_order,idempotency_key,
           request_payload,request_sha256,delivery_state,
           attempt_count,next_attempt_at,created_at,updated_at
         ) values (
           $1,$2,$3,$4,'BENEFICIARY_TRANSFER',$5,$6,$7::jsonb,$8,
           'PENDING',0,$9,$9,$9
         ) on conflict (
           tenant_id,split_command_id,operation_kind,execution_order
         ) do nothing`,
        [
          outboxId,
          input.tenantId,
          input.splitCommandId,
          line.split_line_id,
          index + 2,
          line.transfer_idempotency_key,
          JSON.stringify(payload),
          digest(payload),
          observedAt,
        ],
      );
    }

    return Object.freeze({
      providerReceiptId,
      paymentReceiptSha256: receiptSha256,
      transferOutboxIds: Object.freeze(transferOutboxIds),
      replayed: !inserted.rowCount,
      performsProviderMutation: false as const,
    });
  });
}



export type AmbassadorErpSettlementBinding = Readonly<{
  ambassadorAuthorityId: string | null;
  ambassadorAuthorityVersion: number | null;
  erpSiteId: string;
  erpCompanyId: string;
  erpSupplierId: string;
  erpCostCenterId: string;
  erpPayableAccountId: string;
  erpCommissionItemId: string;
  erpTaxTemplateId: string;
  documentPolicy:
    | "SUPPLIER_INVOICE"
    | "SELF_BILLING_INVOICE"
    | "CREDIT_NOTE"
    | "JOURNAL_ENTRY";
}>;

export async function recordBeneficiaryTransferAndReleaseErp(input: {
  tenantId: string;
  splitCommandId: string;
  splitLineId: string;
  providerEventId: string;
  transferId: string;
  platformStripeAccountId: string;
  destinationStripeAccountId: string;
  amountMinor: number;
  currency: string;
  signatureVerificationReceiptSha256: string;
  providerPayloadSha256: string;
  erpBinding: AmbassadorErpSettlementBinding;
  observedAt: string;
}) {
  [
    input.splitCommandId,
    input.splitLineId,
    input.providerEventId,
    input.transferId,
    input.platformStripeAccountId,
    input.destinationStripeAccountId,
  ].forEach((value) =>
    exact(value, PROVIDER_ID, "CCLUB_STRIPE_TRANSFER_RECEIPT_INVALID"),
  );
  exact(
    input.signatureVerificationReceiptSha256,
    HASH,
    "CCLUB_STRIPE_TRANSFER_RECEIPT_INVALID",
  );
  exact(
    input.providerPayloadSha256,
    HASH,
    "CCLUB_STRIPE_TRANSFER_RECEIPT_INVALID",
  );
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 1) {
    throw new Error("CCLUB_STRIPE_TRANSFER_AMOUNT_INVALID");
  }
  const observedAt = instant(
    input.observedAt,
    "CCLUB_STRIPE_TRANSFER_RECEIPT_INVALID",
  );

  return transaction(input.tenantId, async (client) => {
    const scope = await client.query<{
      split_line_id: string;
      allocation_code: string;
      amount_minor: string;
      beneficiary_party_id: string;
      beneficiary_ledger_account_id: string;
      destination_stripe_account_id: string;
      transfer_idempotency_key: string;
      outbox_id: string;
      request_sha256: string;
      project_id: string;
      partner_tenant_id: string;
      operator_legal_entity_id: string;
      booking_id: string;
      order_id: string;
      allocation_receipt_sha256: string;
    }>(
      `select l.split_line_id,l.allocation_code,l.amount_minor,
              l.beneficiary_party_id,l.beneficiary_ledger_account_id,
              l.destination_stripe_account_id,l.transfer_idempotency_key,
              o.outbox_id,o.request_sha256,c.project_id,c.partner_tenant_id,
              c.operator_legal_entity_id,c.booking_id,c.order_id,
              c.allocation_receipt_sha256
         from crays_core.clubs_booking_revenue_split_lines l
         join crays_core.clubs_booking_revenue_split_commands c
           on c.split_command_id=l.split_command_id
          and c.tenant_id=l.tenant_id
         join crays_core.clubs_stripe_split_outbox o
           on o.split_line_id=l.split_line_id
          and o.split_command_id=l.split_command_id
          and o.tenant_id=l.tenant_id
          and o.operation_kind='BENEFICIARY_TRANSFER'
        where l.tenant_id=$1 and l.split_command_id=$2
          and l.split_line_id=$3
        for update of o`,
      [input.tenantId, input.splitCommandId, input.splitLineId],
    );
    const row = scope.rows[0];
    if (
      !row ||
      Number(row.amount_minor) !== input.amountMinor ||
      row.destination_stripe_account_id !==
        input.destinationStripeAccountId ||
      !/^[A-Z]{3}$/.test(input.currency)
    ) {
      throw new Error("CCLUB_STRIPE_TRANSFER_RECEIPT_SCOPE_CONFLICT");
    }

    const receiptBody = {
      splitCommandId: input.splitCommandId,
      splitLineId: input.splitLineId,
      providerEventId: input.providerEventId,
      transferId: input.transferId,
      platformStripeAccountId: input.platformStripeAccountId,
      destinationStripeAccountId: input.destinationStripeAccountId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      signatureVerificationReceiptSha256:
        input.signatureVerificationReceiptSha256,
      providerPayloadSha256: input.providerPayloadSha256,
      observedAt,
    };
    const transferReceiptSha256 = digest(receiptBody);
    const providerReceiptId = stableId(
      "clubs_stripe_receipt",
      receiptBody,
    );
    const insertedReceipt = await client.query(
      `insert into crays_core.clubs_stripe_split_provider_receipts (
         provider_receipt_id,tenant_id,split_command_id,split_line_id,
         outbox_id,provider_event_id,provider_object_type,
         provider_object_id,provider_account_id,provider_state,
         amount_minor,currency,signature_verification_receipt_sha256,
         provider_payload_sha256,receipt_sha256,observed_at,created_at
       ) values (
         $1,$2,$3,$4,$5,$6,'TRANSFER',$7,$8,'SUCCEEDED',
         $9,$10,$11,$12,$13,$14,$14
       ) on conflict (
         tenant_id,provider_event_id,provider_object_id
       ) do nothing`,
      [
        providerReceiptId,
        input.tenantId,
        input.splitCommandId,
        input.splitLineId,
        row.outbox_id,
        input.providerEventId,
        input.transferId,
        input.platformStripeAccountId,
        input.amountMinor,
        input.currency,
        input.signatureVerificationReceiptSha256,
        input.providerPayloadSha256,
        transferReceiptSha256,
        observedAt,
      ],
    );
    if (!insertedReceipt.rowCount) {
      const replay = await client.query<{ receipt_sha256: string }>(
        `select receipt_sha256
           from crays_core.clubs_stripe_split_provider_receipts
          where tenant_id=$1 and provider_event_id=$2
            and provider_object_id=$3`,
        [input.tenantId, input.providerEventId, input.transferId],
      );
      if (
        replay.rows[0]?.receipt_sha256 !== transferReceiptSha256
      ) {
        throw new Error("CCLUB_STRIPE_TRANSFER_RECEIPT_REPLAY_CONFLICT");
      }
    }

    await client.query(
      `update crays_core.clubs_stripe_split_outbox
          set delivery_state='ACKNOWLEDGED_PENDING_RECONCILIATION',
              lease_owner_sha256=null,lease_expires_at=null,
              last_error_code=null,updated_at=$4
        where tenant_id=$1 and split_command_id=$2 and outbox_id=$3
          and delivery_state in (
            'PENDING','CLAIMED','FAILED_RETRYABLE',
            'UNKNOWN_RECONCILIATION_REQUIRED',
            'ACKNOWLEDGED_PENDING_RECONCILIATION'
          )`,
      [
        input.tenantId,
        input.splitCommandId,
        row.outbox_id,
        observedAt,
      ],
    );

    const erp = input.erpBinding;
    [
      erp.erpSiteId,
      erp.erpCompanyId,
      erp.erpSupplierId,
      erp.erpCostCenterId,
      erp.erpPayableAccountId,
      erp.erpCommissionItemId,
      erp.erpTaxTemplateId,
    ].forEach((value) =>
      exact(value, ID, "CCLUB_AMBASSADOR_ERP_BINDING_INVALID"),
    );
    if (
      (erp.ambassadorAuthorityId === null) !==
        (erp.ambassadorAuthorityVersion === null) ||
      (erp.ambassadorAuthorityId !== null &&
        (!ID.test(erp.ambassadorAuthorityId) ||
          !Number.isSafeInteger(erp.ambassadorAuthorityVersion) ||
          (erp.ambassadorAuthorityVersion ?? 0) < 1))
    ) {
      throw new Error("CCLUB_AMBASSADOR_ERP_AUTHORITY_INVALID");
    }

    const erpPayload = {
      consequenceType: "AMBASSADOR_OR_RIGHTSHOLDER_BOOKING_ALLOCATION",
      projectId: row.project_id,
      partnerTenantId: row.partner_tenant_id,
      operatorLegalEntityId: row.operator_legal_entity_id,
      bookingId: row.booking_id,
      orderId: row.order_id,
      splitCommandId: input.splitCommandId,
      splitLineId: input.splitLineId,
      allocationCode: row.allocation_code,
      beneficiaryPartyId: row.beneficiary_party_id,
      beneficiaryLedgerAccountId:
        row.beneficiary_ledger_account_id,
      amountMinor: input.amountMinor,
      currency: input.currency,
      allocationReceiptSha256: row.allocation_receipt_sha256,
      stripeTransferId: input.transferId,
      stripeTransferReceiptSha256: transferReceiptSha256,
      erpSiteId: erp.erpSiteId,
      erpCompanyId: erp.erpCompanyId,
      erpSupplierId: erp.erpSupplierId,
      erpCostCenterId: erp.erpCostCenterId,
      erpPayableAccountId: erp.erpPayableAccountId,
      erpCommissionItemId: erp.erpCommissionItemId,
      erpTaxTemplateId: erp.erpTaxTemplateId,
      documentPolicy: erp.documentPolicy,
    };
    const erpPayloadSha256 = digest(erpPayload);
    const erpIdempotencyKey =
      "ambassador-erp-" +
      digest({
        splitLineId: input.splitLineId,
        transferReceiptSha256,
        erpPayloadSha256,
      });
    const erpOutboxId = stableId("clubs_ambassador_erp_outbox", {
      tenantId: input.tenantId,
      erpIdempotencyKey,
    });
    await client.query(
      `insert into crays_core.clubs_ambassador_erp_outbox (
         erp_outbox_id,tenant_id,split_command_id,split_line_id,
         ambassador_authority_id,ambassador_authority_version,
         erp_site_id,erp_company_id,erp_supplier_id,erp_cost_center_id,
         erp_payable_account_id,erp_commission_item_id,erp_tax_template_id,
         currency,document_policy,idempotency_key,payload,payload_sha256,
         delivery_state,attempt_count,next_attempt_at,created_at,updated_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
         $17::jsonb,$18,'PENDING',0,$19,$19,$19
       ) on conflict (tenant_id,split_line_id,document_policy) do nothing`,
      [
        erpOutboxId,
        input.tenantId,
        input.splitCommandId,
        input.splitLineId,
        erp.ambassadorAuthorityId,
        erp.ambassadorAuthorityVersion,
        erp.erpSiteId,
        erp.erpCompanyId,
        erp.erpSupplierId,
        erp.erpCostCenterId,
        erp.erpPayableAccountId,
        erp.erpCommissionItemId,
        erp.erpTaxTemplateId,
        input.currency,
        erp.documentPolicy,
        erpIdempotencyKey,
        JSON.stringify(erpPayload),
        erpPayloadSha256,
        observedAt,
      ],
    );

    return Object.freeze({
      providerReceiptId,
      transferReceiptSha256,
      erpOutboxId,
      erpPayloadSha256,
      replayed: !insertedReceipt.rowCount,
      performsProviderMutation: false as const,
    });
  });
}

export async function readOwnAmbassadorBackoffice(input: {
  tenantId: string;
  projectId: string;
  ambassadorPartyId: string;
}) {
  exact(input.projectId, ID, "CCLUB_AMBASSADOR_READ_SCOPE_INVALID");
  exact(
    input.ambassadorPartyId,
    ID,
    "CCLUB_AMBASSADOR_READ_SCOPE_INVALID",
  );

  return transaction(input.tenantId, async (client) => {
    const authority = await client.query<{
      authority_id: string;
      authority_version: string;
      operator_legal_entity_id: string;
      ambassador_relationship_version: string;
      readiness_state: string;
      readiness_snapshot: unknown;
      readiness_receipt_sha256: string;
      created_at: Date;
    }>(
      `select authority_id,authority_version,operator_legal_entity_id,
              ambassador_relationship_version,readiness_state,
              readiness_snapshot,readiness_receipt_sha256,created_at
         from crays_core.clubs_ambassador_backoffice_authority_versions
        where tenant_id=$1 and project_id=$2 and ambassador_party_id=$3
        order by authority_version desc
        limit 1`,
      [input.tenantId, input.projectId, input.ambassadorPartyId],
    );
    const current = authority.rows[0];
    if (!current) {
      return Object.freeze({
        state: "NO_ADMITTED_AMBASSADOR_AUTHORITY" as const,
        projectId: input.projectId,
        ambassadorPartyId: input.ambassadorPartyId,
        paperwork: Object.freeze([]),
        bookingAllocations: Object.freeze([]),
      });
    }

    const [paperwork, allocations] = await Promise.all([
      client.query<{
        document_kind: string;
        document_reference: string;
        document_sha256: string;
        storage_provider: string;
        document_state: string;
        created_at: Date;
      }>(
        `select document_kind,document_reference,document_sha256,
                storage_provider,document_state,created_at
           from crays_core.clubs_ambassador_paperwork_receipts
          where tenant_id=$1 and authority_id=$2 and authority_version=$3
          order by created_at,document_kind`,
        [
          input.tenantId,
          current.authority_id,
          current.authority_version,
        ],
      ),
      client.query<{
        booking_id: string;
        order_id: string;
        allocation_code: string;
        rate_bps: number;
        amount_minor: string;
        currency: string;
        destination_stripe_account_id: string;
        stripe_delivery_state: string;
        transfer_provider_object_id: string | null;
        erp_delivery_state: string | null;
        erp_reconciliation_state: string | null;
        created_at: Date;
      }>(
        `select c.booking_id,c.order_id,l.allocation_code,l.rate_bps,
                l.amount_minor,c.currency,l.destination_stripe_account_id,
                o.delivery_state stripe_delivery_state,
                pr.provider_object_id transfer_provider_object_id,
                eo.delivery_state erp_delivery_state,
                er.reconciliation_state erp_reconciliation_state,
                c.created_at
           from crays_core.clubs_booking_revenue_split_lines l
           join crays_core.clubs_booking_revenue_split_commands c
             on c.split_command_id=l.split_command_id
            and c.tenant_id=l.tenant_id
           join crays_core.clubs_stripe_split_outbox o
             on o.split_line_id=l.split_line_id
            and o.tenant_id=l.tenant_id
            and o.operation_kind='BENEFICIARY_TRANSFER'
           left join lateral (
             select provider_object_id
               from crays_core.clubs_stripe_split_provider_receipts p
              where p.tenant_id=l.tenant_id
                and p.split_line_id=l.split_line_id
                and p.provider_object_type='TRANSFER'
              order by p.observed_at desc limit 1
           ) pr on true
           left join crays_core.clubs_ambassador_erp_outbox eo
             on eo.tenant_id=l.tenant_id
            and eo.split_line_id=l.split_line_id
           left join lateral (
             select reconciliation_state
               from crays_core.clubs_ambassador_erp_receipts r
              where r.tenant_id=l.tenant_id
                and r.split_line_id=l.split_line_id
              order by r.observed_at desc limit 1
           ) er on true
          where l.tenant_id=$1
            and c.project_id=$2
            and l.beneficiary_party_id=$3
          order by c.created_at desc,c.booking_id`,
        [input.tenantId, input.projectId, input.ambassadorPartyId],
      ),
    ]);

    return Object.freeze({
      state: "AMBASSADOR_BACKOFFICE" as const,
      projectId: input.projectId,
      ambassadorPartyId: input.ambassadorPartyId,
      authority: Object.freeze({
        authorityId: current.authority_id,
        authorityVersion: Number(current.authority_version),
        operatorLegalEntityId: current.operator_legal_entity_id,
        ambassadorRelationshipVersion: Number(
          current.ambassador_relationship_version,
        ),
        readinessState: current.readiness_state,
        readinessSnapshot: current.readiness_snapshot,
        readinessReceiptSha256:
          current.readiness_receipt_sha256,
        createdAt: current.created_at.toISOString(),
      }),
      paperwork: Object.freeze(
        paperwork.rows.map((row) =>
          Object.freeze({
            documentKind: row.document_kind,
            documentReference: row.document_reference,
            documentSha256: row.document_sha256,
            storageProvider: row.storage_provider,
            documentState: row.document_state,
            createdAt: row.created_at.toISOString(),
          }),
        ),
      ),
      bookingAllocations: Object.freeze(
        allocations.rows.map((row) =>
          Object.freeze({
            bookingId: row.booking_id,
            orderId: row.order_id,
            allocationCode: row.allocation_code,
            rateBps: row.rate_bps,
            amountMinor: Number(row.amount_minor),
            currency: row.currency,
            destinationStripeAccountId:
              row.destination_stripe_account_id,
            stripeDeliveryState: row.stripe_delivery_state,
            transferProviderObjectId:
              row.transfer_provider_object_id,
            erpDeliveryState: row.erp_delivery_state,
            erpReconciliationState:
              row.erp_reconciliation_state,
            createdAt: row.created_at.toISOString(),
          }),
        ),
      ),
      foreignAmbassadorAccess: false as const,
      foreignProjectAccess: false as const,
    });
  });
}



export async function persistAmbassadorAccountBinding(input: {
  tenantId: string;
  canonicalAccountId: string;
  projectId: string;
  ambassadorPartyId: string;
  authorityId: string;
  authorityVersion: number;
  roleAssignmentId: string;
  roleAssignmentVersion: number;
  roleAssignmentReceiptSha256: string;
  validFrom: string;
}) {
  [
    input.canonicalAccountId,
    input.projectId,
    input.ambassadorPartyId,
    input.authorityId,
    input.roleAssignmentId,
  ].forEach((value) =>
    exact(value, ID, "CCLUB_AMBASSADOR_ACCOUNT_BINDING_INVALID"),
  );
  if (
    !Number.isSafeInteger(input.authorityVersion) ||
    input.authorityVersion < 1 ||
    !Number.isSafeInteger(input.roleAssignmentVersion) ||
    input.roleAssignmentVersion < 1
  ) {
    throw new Error("CCLUB_AMBASSADOR_ACCOUNT_BINDING_INVALID");
  }
  exact(
    input.roleAssignmentReceiptSha256,
    HASH,
    "CCLUB_AMBASSADOR_ACCOUNT_BINDING_INVALID",
  );
  const validFrom = instant(
    input.validFrom,
    "CCLUB_AMBASSADOR_ACCOUNT_BINDING_INVALID",
  );
  const body = {
    tenantId: input.tenantId,
    canonicalAccountId: input.canonicalAccountId,
    projectId: input.projectId,
    ambassadorPartyId: input.ambassadorPartyId,
    authorityId: input.authorityId,
    authorityVersion: input.authorityVersion,
    roleAssignmentId: input.roleAssignmentId,
    roleAssignmentVersion: input.roleAssignmentVersion,
    roleAssignmentReceiptSha256:
      input.roleAssignmentReceiptSha256,
    validFrom,
  };
  const bindingReceiptSha256 = digest(body);
  const accountBindingId = stableId(
    "clubs_ambassador_account",
    body,
  );

  return transaction(input.tenantId, async (client) => {
    const authority = await client.query<{
      ambassador_party_id: string;
      project_id: string;
      readiness_state: string;
    }>(
      `select ambassador_party_id,project_id,readiness_state
         from crays_core.clubs_ambassador_backoffice_authority_versions
        where tenant_id=$1 and authority_id=$2 and authority_version=$3
        for share`,
      [input.tenantId, input.authorityId, input.authorityVersion],
    );
    const row = authority.rows[0];
    if (
      !row ||
      row.ambassador_party_id !== input.ambassadorPartyId ||
      row.project_id !== input.projectId ||
      row.readiness_state !==
        "READY_FOR_ATTRIBUTION_AND_AUTOMATIC_SETTLEMENT"
    ) {
      throw new Error(
        "CCLUB_AMBASSADOR_ACCOUNT_AUTHORITY_NOT_READY",
      );
    }

    const inserted = await client.query(
      `insert into crays_core.clubs_ambassador_account_bindings (
         account_binding_id,tenant_id,canonical_account_id,project_id,
         ambassador_party_id,authority_id,authority_version,
         role_assignment_id,role_assignment_version,
         role_assignment_receipt_sha256,binding_receipt_sha256,
         valid_from,created_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12
       ) on conflict (
         tenant_id,canonical_account_id,project_id,ambassador_party_id,
         authority_id,authority_version
       ) do nothing`,
      [
        accountBindingId,
        input.tenantId,
        input.canonicalAccountId,
        input.projectId,
        input.ambassadorPartyId,
        input.authorityId,
        input.authorityVersion,
        input.roleAssignmentId,
        input.roleAssignmentVersion,
        input.roleAssignmentReceiptSha256,
        bindingReceiptSha256,
        validFrom,
      ],
    );
    if (!inserted.rowCount) {
      const replay = await client.query<{
        binding_receipt_sha256: string;
      }>(
        `select binding_receipt_sha256
           from crays_core.clubs_ambassador_account_bindings
          where tenant_id=$1 and canonical_account_id=$2
            and project_id=$3 and ambassador_party_id=$4
            and authority_id=$5 and authority_version=$6`,
        [
          input.tenantId,
          input.canonicalAccountId,
          input.projectId,
          input.ambassadorPartyId,
          input.authorityId,
          input.authorityVersion,
        ],
      );
      if (
        replay.rows[0]?.binding_receipt_sha256 !==
        bindingReceiptSha256
      ) {
        throw new Error(
          "CCLUB_AMBASSADOR_ACCOUNT_BINDING_REPLAY_CONFLICT",
        );
      }
    }

    return Object.freeze({
      accountBindingId,
      bindingReceiptSha256,
      replayed: !inserted.rowCount,
    });
  });
}

export async function readOwnAmbassadorBackofficeByAccount(input: {
  tenantId: string;
  canonicalAccountId: string;
  roleAssignmentId: string;
}) {
  exact(
    input.canonicalAccountId,
    ID,
    "CCLUB_AMBASSADOR_ACCOUNT_SCOPE_INVALID",
  );
  exact(
    input.roleAssignmentId,
    ID,
    "CCLUB_AMBASSADOR_ACCOUNT_SCOPE_INVALID",
  );

  const binding = await transaction(
    input.tenantId,
    async (client) => {
      const result = await client.query<{
        project_id: string;
        ambassador_party_id: string;
      }>(
        `select b.project_id,b.ambassador_party_id
           from crays_core.clubs_ambassador_account_bindings b
           left join crays_core.clubs_ambassador_account_binding_revocations r
             on r.tenant_id=b.tenant_id
            and r.account_binding_id=b.account_binding_id
          where b.tenant_id=$1
            and b.canonical_account_id=$2
            and b.role_assignment_id=$3
            and b.valid_from<=transaction_timestamp()
            and r.revocation_receipt_id is null
          order by b.valid_from desc`,
        [
          input.tenantId,
          input.canonicalAccountId,
          input.roleAssignmentId,
        ],
      );
      if (result.rows.length !== 1) {
        throw new Error(
          result.rows.length === 0
            ? "CCLUB_AMBASSADOR_ACCOUNT_BINDING_NOT_FOUND"
            : "CCLUB_AMBASSADOR_ACCOUNT_BINDING_AMBIGUOUS",
        );
      }
      return result.rows[0];
    },
  );

  return readOwnAmbassadorBackoffice({
    tenantId: input.tenantId,
    projectId: binding.project_id,
    ambassadorPartyId: binding.ambassador_party_id,
  });
}

