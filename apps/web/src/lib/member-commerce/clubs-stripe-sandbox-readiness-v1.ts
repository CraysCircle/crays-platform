import "server-only";

import type { PoolClient } from "pg";

import { getCorePgPool } from "@/db/client";

export const CLUBS_STRIPE_SANDBOX_READINESS_VERSION =
  "cclub-t5-stripe-sandbox-readiness.v1" as const;

export type ClubsStripeSandboxReadinessState =
  | "payment_setup_pending"
  | "structurally_ready";

export type ClubsStripeSandboxMissingSetup =
  | "STRIPE_TEST_CONNECTION_CONFIG"
  | "STRIPE_TEST_WEBHOOK_SIGNATURE_CONFIG"
  | "OWNER_AUTHORITY_BINDING"
  | "STRIPE_TEST_PRODUCT_PRICE_BINDING"
  | "STRIPE_TEST_ACCOUNTS_V2_BINDING"
  | "RECONCILIATION_REQUIRED";

type ReadinessRow = Readonly<{
  trusted_stay_authority_ready: boolean;
  reconciliation_required: boolean;
}>;

export type ClubsStripeSandboxReadinessSignals = Readonly<{
  connectionConfigured: boolean;
  signatureConfigured: boolean;
  trustedStayAuthorityReady: boolean;
  reconciliationRequired: boolean;
  checkedAt: string;
}>;

export type ClubsStripeSandboxReadiness = Readonly<{
  version: typeof CLUBS_STRIPE_SANDBOX_READINESS_VERSION;
  state: ClubsStripeSandboxReadinessState;
  livemode: false;
  accountBound: true;
  readOnly: true;
  sourceOnlyReadiness: true;
  providerWriteAuthorized: false;
  providerCallPermittedByThisRead: false;
  providerCalled: false;
  providerSuccessClaimed: false;
  paymentSuccessClaimed: false;
  secretsExposed: false;
  piiExposed: false;
  missingSetup: readonly ClubsStripeSandboxMissingSetup[];
  requiredExternalGate: "EXPLICIT_PROVIDER_WRITE_GO";
  checkedAt: string;
}>;

function testConnectionConfigured(env: NodeJS.ProcessEnv): boolean {
  if (env.CCLUB_STRIPE_TEST_CONNECTION_READY !== "true") return false;
  const credential = env.CCLUB_STRIPE_TEST_SECRET_KEY?.trim() ?? "";
  return /^(rk|sk)_test_[^\s]{8,}$/.test(credential);
}

function webhookSignatureConfigured(env: NodeJS.ProcessEnv): boolean {
  if (!testConnectionConfigured(env)) return false;
  const secret = env.CCLUB_STRIPE_TEST_WEBHOOK_SECRET?.trim() ?? "";
  return /^whsec_[^\s]{8,}$/.test(secret);
}

async function withTenantRead<T>(
  tenantId: string,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getCorePgPool().connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SELECT set_config('crays.app_role','core_service',true)");
    await client.query("SELECT set_config('crays.tenant_id',$1,true)", [tenantId]);
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function readPersistentReadiness(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  now: Date;
}>): Promise<ReadinessRow> {
  return withTenantRead(input.tenantId, async (client) => {
    const result = await client.query<ReadinessRow>(
      `WITH visible_stay_authorities AS (
         SELECT authority.tenant_id, authority.payment_authority_id
           FROM crays_core.clubs_stripe_sandbox_payment_authorities authority
           JOIN crays_core.clubs_stripe_sandbox_trusted_stay_adapter_receipts receipt
             ON receipt.tenant_id = authority.tenant_id
            AND receipt.adapter_receipt_id = authority.trusted_stay_adapter_receipt_id
            AND receipt.adapter_receipt_sha256 = authority.trusted_stay_adapter_receipt_sha256
            AND receipt.payment_authority_id = authority.payment_authority_id
            AND receipt.member_account_id = authority.member_account_id
            AND receipt.project_id = authority.project_id
            AND receipt.quote_id = authority.source_authority_id
            AND receipt.hold_id = authority.subject_reference
            AND receipt.adapter_receipt_sha256 = authority.source_authority_sha256
            AND receipt.stripe_product_id = authority.stripe_product_id
            AND receipt.stripe_price_id = authority.stripe_price_id
            AND receipt.amount_minor = authority.amount_minor
            AND receipt.currency = authority.currency
            AND receipt.operator_connected_account_id = authority.operator_connected_account_id
            AND receipt.ambassador_connected_account_id = authority.ambassador_connected_account_id
            AND receipt.software_connected_account_id = authority.software_connected_account_id
            AND receipt.global_concept_test_connected_account_id = authority.global_concept_test_connected_account_id
            AND receipt.product_readback_sha256 = authority.product_readback_sha256
            AND receipt.price_readback_sha256 = authority.price_readback_sha256
            AND receipt.beneficiary_binding_sha256 = authority.beneficiary_binding_sha256
            AND receipt.source_expires_at = authority.expires_at
          WHERE authority.tenant_id = $1
            AND authority.member_account_id = $2
            AND authority.payment_kind = 'STAY'
            AND authority.authority_state = 'READY'
            AND authority.livemode = false
            AND authority.expires_at > $3::timestamptz
            AND receipt.stripe_platform_account_id = 'acct_1TvjKnPonqvDpQ1m'
            AND length(btrim(receipt.owner_authority_id)) > 0
            AND receipt.provider_readback_verified = true
            AND receipt.persistable_to_0256 = true
            AND receipt.provider_callable = true
            AND receipt.persistence_allowed = true
            AND receipt.provider_use_allowed = true
            AND receipt.livemode = false
            AND receipt.source_expires_at > $3::timestamptz
       ),
       visible_payments AS (
         SELECT payment.payment_id, payment.payment_state
           FROM crays_core.clubs_stripe_sandbox_payments payment
           JOIN visible_stay_authorities authority
             ON authority.tenant_id = payment.tenant_id
            AND authority.payment_authority_id = payment.payment_authority_id
          WHERE payment.tenant_id = $1
            AND payment.livemode = false
       ),
       latest_reconciliation AS (
         SELECT DISTINCT ON (receipt.payment_id)
                receipt.payment_id,
                receipt.reconciliation_state
           FROM crays_core.clubs_stripe_sandbox_reconciliation_receipts receipt
           JOIN visible_payments payment ON payment.payment_id = receipt.payment_id
          WHERE receipt.tenant_id = $1
          ORDER BY receipt.payment_id, receipt.reconciled_at DESC,
                   receipt.reconciliation_receipt_id DESC
       )
       SELECT
         EXISTS (SELECT 1 FROM visible_stay_authorities)
           AS trusted_stay_authority_ready,
         (
           EXISTS (
             SELECT 1 FROM latest_reconciliation latest
              WHERE latest.reconciliation_state = 'MISMATCH'
           ) OR EXISTS (
             SELECT 1
               FROM visible_payments payment
               LEFT JOIN latest_reconciliation latest
                 ON latest.payment_id = payment.payment_id
              WHERE payment.payment_state IN ('SUCCEEDED', 'REFUNDED')
                AND (
                  latest.payment_id IS NULL OR
                  latest.reconciliation_state <> 'BALANCED'
                )
           )
         ) AS reconciliation_required`,
      [input.tenantId, input.memberAccountId, input.now.toISOString()],
    );
    const row = result.rows[0];
    if (!row) throw new Error("CCLUB_STRIPE_READINESS_ROW_MISSING");
    return row;
  });
}

function missingSetup(
  input: Omit<ClubsStripeSandboxReadinessSignals, "checkedAt">,
): readonly ClubsStripeSandboxMissingSetup[] {
  const missing: ClubsStripeSandboxMissingSetup[] = [];
  if (!input.connectionConfigured) missing.push("STRIPE_TEST_CONNECTION_CONFIG");
  if (!input.signatureConfigured) missing.push("STRIPE_TEST_WEBHOOK_SIGNATURE_CONFIG");
  if (!input.trustedStayAuthorityReady) {
    missing.push(
      "OWNER_AUTHORITY_BINDING",
      "STRIPE_TEST_PRODUCT_PRICE_BINDING",
      "STRIPE_TEST_ACCOUNTS_V2_BINDING",
    );
  }
  if (input.reconciliationRequired) missing.push("RECONCILIATION_REQUIRED");
  return Object.freeze(missing);
}

export function projectClubsStripeSandboxReadiness(
  signals: ClubsStripeSandboxReadinessSignals,
): ClubsStripeSandboxReadiness {
  const missing = missingSetup(signals);
  return Object.freeze({
    version: CLUBS_STRIPE_SANDBOX_READINESS_VERSION,
    state: missing.length === 0 ? "structurally_ready" : "payment_setup_pending",
    livemode: false,
    accountBound: true,
    readOnly: true,
    sourceOnlyReadiness: true,
    providerWriteAuthorized: false,
    providerCallPermittedByThisRead: false,
    providerCalled: false,
    providerSuccessClaimed: false,
    paymentSuccessClaimed: false,
    secretsExposed: false,
    piiExposed: false,
    missingSetup: missing,
    requiredExternalGate: "EXPLICIT_PROVIDER_WRITE_GO",
    checkedAt: signals.checkedAt,
  });
}

export async function readClubsStripeSandboxReadiness(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
}>): Promise<ClubsStripeSandboxReadiness> {
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  const readiness = await readPersistentReadiness({ ...input, now });
  return projectClubsStripeSandboxReadiness({
    connectionConfigured: testConnectionConfigured(env),
    signatureConfigured: webhookSignatureConfigured(env),
    trustedStayAuthorityReady: readiness.trusted_stay_authority_ready,
    reconciliationRequired: readiness.reconciliation_required,
    checkedAt: now.toISOString(),
  });
}
