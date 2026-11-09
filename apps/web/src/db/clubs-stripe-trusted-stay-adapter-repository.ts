import "server-only";

import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import {
  ClubsStayStep4RepositoryError,
  readCanonicalClubsStayStep4SourceWithClient,
} from "@/db/clubs-stay-step4-repository";
import {
  clubsStripeSha256,
} from "@/lib/member-commerce/clubs-stripe-sandbox-contract";
import {
  readClubsStripeSandboxSetupReadback,
  type ClubsStripeSandboxSetupReadback,
} from "@/lib/member-commerce/clubs-stripe-sandbox-provider";
import {
  CLUBS_STRIPE_TRUSTED_STAY_ADAPTER_VERSION,
  CLUBS_STRIPE_STAY_OWNER_SETUP_VERSION,
  CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID,
  clubsStripePaymentSetupPending,
  type ClubsStripePaymentSetupPending,
  type ClubsStripeTrustedStayAdapterReceipt,
  type ClubsStripeTrustedStayProvisioningAuthority,
  type ClubsStripeTrustedStaySourceInput,
} from "@/lib/member-commerce/clubs-stripe-trusted-stay-adapter-contract";
import type { ClubsStayStep4SourceReceipt } from "@/lib/member-commerce/clubs-stay-step4-contract";

const SHA256 = /^[a-f0-9]{64}$/;
const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,254}$/;
const ACCOUNT = /^acct_[A-Za-z0-9]{8,}$/;

type TrustedReceiptRow = {
  adapter_receipt_id: string;
  adapter_receipt_sha256: string;
  payment_authority_id: string;
  member_account_id: string;
  project_id: string;
  quote_id: string;
  hold_id: string;
  team_go_evidence_id: string;
  t3_source_receipt_sha256: string;
  pricing_snapshot_sha256: string;
  tax_snapshot_sha256: string;
  fee_snapshot_sha256: string;
  deposit_snapshot_sha256: string;
  seller_snapshot_sha256: string;
  cancellation_snapshot_sha256: string;
  refund_boundary_sha256: string;
  payable_basis: "TOTAL" | "DEPOSIT_DUE";
  amount_minor: string | number;
  currency: string;
  source_expires_at: Date | string;
  stripe_platform_account_id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  product_readback_sha256: string;
  price_readback_sha256: string;
  provider_readback_sha256: string;
  operator_connected_account_id: string;
  ambassador_connected_account_id: string;
  software_connected_account_id: string;
  global_concept_test_connected_account_id: string;
  beneficiary_binding_sha256: string;
  price_creation_fingerprint: string;
  binding_fingerprint: string;
  owner_authority_id: string;
  owner_authority_sha256: string;
  provider_readback_verified: boolean;
  persistable_to_0256: boolean;
  provider_callable: boolean;
  persistence_allowed: boolean;
  provider_use_allowed: boolean;
  livemode: boolean;
  adapter_receipt_json: unknown;
  provider_observed_at: Date | string;
  created_at: Date | string;
};

export class ClubsStripeTrustedStayAdapterRepositoryError extends Error {
  constructor(
    readonly code:
      | "CCLUB_TRUSTED_STAY_SETUP_INVALID"
      | "CCLUB_TRUSTED_STAY_PROVIDER_READBACK_MISMATCH"
      | "CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT"
      | "CCLUB_TRUSTED_STAY_AUTHORITY_REPLAY_CONFLICT",
  ) {
    super(code);
    this.name = "ClubsStripeTrustedStayAdapterRepositoryError";
  }
}

function fail(
  code: ClubsStripeTrustedStayAdapterRepositoryError["code"],
): never {
  throw new ClubsStripeTrustedStayAdapterRepositoryError(code);
}

function instant(value: Date | string, code: ClubsStripeTrustedStayAdapterRepositoryError["code"]) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) fail(code);
  return date.toISOString();
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT");
  }
  return value as Record<string, unknown>;
}

function assertMetadataSubset(
  actual: Readonly<Record<string, string>>,
  expected: Readonly<Record<string, string>>,
) {
  const serialized = JSON.stringify(actual).toLowerCase();
  if (serialized.includes("gym") || serialized.includes("crays.pro") || serialized.includes("craysgym")) {
    fail("CCLUB_TRUSTED_STAY_PROVIDER_READBACK_MISMATCH");
  }
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) fail("CCLUB_TRUSTED_STAY_PROVIDER_READBACK_MISMATCH");
  }
}

function requireSetup(
  setup: ClubsStripeTrustedStayProvisioningAuthority,
  observedAt: string,
) {
  if (
    setup.version !== CLUBS_STRIPE_STAY_OWNER_SETUP_VERSION ||
    !OPAQUE.test(setup.ownerAuthorityId) ||
    !SHA256.test(setup.ownerAuthoritySha256) ||
    !OPAQUE.test(setup.projectId) ||
    !/^prod_[A-Za-z0-9]{8,}$/.test(setup.stripeProductId) ||
    !/^price_[A-Za-z0-9]{8,}$/.test(setup.stripePriceId) ||
    !OPAQUE.test(setup.productTaxCode) ||
    !["exclusive", "inclusive", "unspecified"].includes(setup.priceTaxBehavior) ||
    !ACCOUNT.test(setup.ambassadorConnectedAccountId) ||
    !ACCOUNT.test(setup.softwareConnectedAccountId) ||
    !ACCOUNT.test(setup.globalConceptTestConnectedAccountId)
  ) {
    fail("CCLUB_TRUSTED_STAY_SETUP_INVALID");
  }
  const approvedAt = Date.parse(setup.approvedAt);
  const expiresAt = Date.parse(setup.expiresAt);
  const observed = Date.parse(observedAt);
  if (
    !Number.isFinite(approvedAt) ||
    !Number.isFinite(expiresAt) ||
    approvedAt > observed ||
    observed >= expiresAt
  ) {
    fail("CCLUB_TRUSTED_STAY_SETUP_INVALID");
  }
  const { ownerAuthoritySha256, ...authorityBody } = setup;
  if (clubsStripeSha256(authorityBody) !== ownerAuthoritySha256) {
    fail("CCLUB_TRUSTED_STAY_SETUP_INVALID");
  }
}

function buildTrustedReceipt(input: Readonly<{
  memberAccountId: string;
  source: ClubsStayStep4SourceReceipt;
  sellerConnectedAccountId: string;
  setup: ClubsStripeTrustedStayProvisioningAuthority;
  readback: ClubsStripeSandboxSetupReadback;
  observedAt: string;
}>): ClubsStripeTrustedStayAdapterReceipt {
  requireSetup(input.setup, input.observedAt);
  const { source, readback, setup } = input;
  if (
    source.paymentAuthority !== false ||
    source.providerAuthority !== false ||
    source.productionAuthority !== false ||
    source.accountId !== input.memberAccountId ||
    !SHA256.test(source.sourceReceiptSha256) ||
    source.amountMinor < 400 ||
    readback.livemode !== false ||
    readback.platformAccountId !== CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID
  ) {
    fail("CCLUB_TRUSTED_STAY_SETUP_INVALID");
  }
  const sourceExpiry = Date.parse(source.sourceExpiresAt);
  const setupExpiry = Date.parse(setup.expiresAt);
  const observed = Date.parse(input.observedAt);
  if (!Number.isFinite(sourceExpiry) || observed >= sourceExpiry) {
    fail("CCLUB_TRUSTED_STAY_SETUP_INVALID");
  }
  if (
    readback.product.id !== setup.stripeProductId ||
    readback.product.active !== true ||
    readback.product.livemode !== false ||
    readback.product.taxCode !== setup.productTaxCode ||
    readback.price.id !== setup.stripePriceId ||
    readback.price.productId !== setup.stripeProductId ||
    readback.price.active !== true ||
    readback.price.livemode !== false ||
    readback.price.type !== "one_time" ||
    readback.price.recurring !== null ||
    readback.price.unitAmountMinor !== source.amountMinor ||
    readback.price.currency !== source.currency ||
    readback.price.taxBehavior !== setup.priceTaxBehavior
  ) {
    fail("CCLUB_TRUSTED_STAY_PROVIDER_READBACK_MISMATCH");
  }
  const productMetadata = Object.freeze({
    crays_namespace: "cclub",
    crays_vertical: "clubs",
    crays_environment: "sandbox",
    crays_payment_kind: "stay",
    crays_contract_version: "cclub-t5-stripe-price-binding.v1",
    crays_stay_catalog_role: "quote_bound_dynamic_price",
  });
  assertMetadataSubset(readback.product.metadata, productMetadata);
  const productReadbackSha256 = clubsStripeSha256(readback.product);
  const priceCreationFingerprint = clubsStripeSha256({
    version: CLUBS_STRIPE_TRUSTED_STAY_ADAPTER_VERSION,
    t3SourceReceiptSha256: source.sourceReceiptSha256,
    quoteId: source.quoteId,
    holdId: source.holdId,
    teamGoEvidenceId: source.teamGoEvidenceId,
    payableBasis: source.payableBasis,
    amountMinor: source.amountMinor,
    currency: source.currency,
    stripeProductId: setup.stripeProductId,
    productTaxCode: setup.productTaxCode,
    priceTaxBehavior: setup.priceTaxBehavior,
    sellerConnectedAccountId: input.sellerConnectedAccountId,
    ownerAuthoritySha256: setup.ownerAuthoritySha256,
    productReadbackSha256,
  });
  const priceMetadata = Object.freeze({
    crays_namespace: "cclub",
    crays_vertical: "clubs",
    crays_environment: "sandbox",
    crays_payment_kind: "stay",
    crays_contract_version: "cclub-t5-stripe-price-binding.v1",
    crays_quote_id: source.quoteId,
    crays_hold_id: source.holdId,
    crays_pricing_snapshot_sha256: source.pricingSnapshotSha256,
    crays_payable_basis: source.payableBasis.toLowerCase(),
    crays_price_creation_fingerprint: priceCreationFingerprint,
  });
  assertMetadataSubset(readback.price.metadata, priceMetadata);
  const accounts = readback.connectedAccounts;
  if (
    accounts.operatorOrFranchise.id !== input.sellerConnectedAccountId ||
    accounts.ambassador.id !== setup.ambassadorConnectedAccountId ||
    accounts.software.id !== setup.softwareConnectedAccountId ||
    accounts.globalConceptTestOnly.id !== setup.globalConceptTestConnectedAccountId ||
    accounts.operatorOrFranchise.merchantCardPaymentsStatus !== "active" ||
    accounts.ambassador.recipientStripeTransfersStatus !== "active" ||
    accounts.software.recipientStripeTransfersStatus !== "active" ||
    accounts.globalConceptTestOnly.recipientStripeTransfersStatus !== "active" ||
    accounts.operatorOrFranchise.livemode !== false ||
    accounts.ambassador.livemode !== false ||
    accounts.software.livemode !== false ||
    accounts.globalConceptTestOnly.livemode !== false
  ) {
    fail("CCLUB_TRUSTED_STAY_PROVIDER_READBACK_MISMATCH");
  }
  const accountIds = [
    input.sellerConnectedAccountId,
    setup.ambassadorConnectedAccountId,
    setup.softwareConnectedAccountId,
    setup.globalConceptTestConnectedAccountId,
  ];
  if (accountIds.some((value) => !ACCOUNT.test(value)) || new Set(accountIds).size !== 4) {
    fail("CCLUB_TRUSTED_STAY_SETUP_INVALID");
  }
  const priceReadbackSha256 = clubsStripeSha256(readback.price);
  const beneficiaryBindingSha256 = clubsStripeSha256({
    operatorOrFranchise: accounts.operatorOrFranchise,
    ambassador: accounts.ambassador,
    software: accounts.software,
    globalConceptTestOnly: accounts.globalConceptTestOnly,
  });
  const authorityExpiresAt = new Date(Math.min(sourceExpiry, setupExpiry)).toISOString();
  const bindingFingerprint = clubsStripeSha256({
    t3SourceReceiptSha256: source.sourceReceiptSha256,
    priceCreationFingerprint,
    productReadbackSha256,
    priceReadbackSha256,
    providerReadbackSha256: readback.providerReadbackSha256,
    beneficiaryBindingSha256,
    ownerAuthoritySha256: setup.ownerAuthoritySha256,
    authorityExpiresAt,
  });
  const adapterReceiptId = `cclubstayreceipt_${bindingFingerprint.slice(0, 40)}`;
  const paymentAuthorityId = `cclubstayauth_${bindingFingerprint.slice(0, 40)}`;
  const body = Object.freeze({
    version: CLUBS_STRIPE_TRUSTED_STAY_ADAPTER_VERSION,
    state: "TRUSTED_ADAPTER_RECEIPT_VERIFIED" as const,
    adapterReceiptId,
    paymentAuthorityId,
    memberAccountId: input.memberAccountId,
    projectId: setup.projectId,
    quoteId: source.quoteId,
    holdId: source.holdId,
    teamGoEvidenceId: source.teamGoEvidenceId,
    t3SourceReceiptSha256: source.sourceReceiptSha256,
    pricingSnapshotSha256: source.pricingSnapshotSha256,
    taxSnapshotSha256: source.taxSnapshotSha256,
    feeSnapshotSha256: source.feeSnapshotSha256,
    depositSnapshotSha256: source.depositSnapshotSha256,
    sellerSnapshotSha256: source.sellerSnapshotSha256,
    cancellationSnapshotSha256: source.cancellationSnapshotSha256,
    refundBoundarySha256: source.refundBoundarySha256,
    payableBasis: source.payableBasis,
    settlementCoverage: source.payableBasis === "TOTAL" ? "FULL_STAY" as const : "DEPOSIT_ONLY" as const,
    stayFullyPaidClaimed: false as const,
    amountMinor: source.amountMinor,
    currency: source.currency,
    sourceExpiresAt: authorityExpiresAt,
    stripePlatformAccountId: CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID,
    stripeProductId: setup.stripeProductId,
    stripePriceId: setup.stripePriceId,
    productReadbackSha256,
    priceReadbackSha256,
    providerReadbackSha256: readback.providerReadbackSha256,
    operatorConnectedAccountId: input.sellerConnectedAccountId,
    ambassadorConnectedAccountId: setup.ambassadorConnectedAccountId,
    softwareConnectedAccountId: setup.softwareConnectedAccountId,
    globalConceptTestConnectedAccountId: setup.globalConceptTestConnectedAccountId,
    beneficiaryBindingSha256,
    priceCreationFingerprint,
    bindingFingerprint,
    ownerAuthorityId: setup.ownerAuthorityId,
    ownerAuthoritySha256: setup.ownerAuthoritySha256,
    providerReadbackVerified: true as const,
    persistableTo0256: true as const,
    providerCallable: true as const,
    persistenceAllowed: true as const,
    providerUseAllowed: true as const,
    providerSuccessClaimed: false as const,
    paymentSuccessClaimed: false as const,
    livemode: false as const,
    providerObservedAt: input.observedAt,
    createdAt: input.observedAt,
  });
  return Object.freeze({
    ...body,
    adapterReceiptSha256: clubsStripeSha256(body),
  });
}

async function setTenant(client: PoolClient, tenantId: string) {
  await client.query("SELECT set_config('crays.app_role','core_service',true)");
  await client.query("SELECT set_config('crays.tenant_id',$1,true)", [tenantId]);
}

async function readSource(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  source: ClubsStripeTrustedStaySourceInput;
}>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await setTenant(client, input.tenantId);
    const source = await readCanonicalClubsStayStep4SourceWithClient(client, {
      tenantId: input.tenantId,
      accountId: input.memberAccountId,
      ...input.source,
    });
    await client.query("COMMIT");
    return source;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function receiptValues(tenantId: string, receipt: ClubsStripeTrustedStayAdapterReceipt) {
  return [
    tenantId,
    receipt.adapterReceiptId,
    receipt.adapterReceiptSha256,
    receipt.paymentAuthorityId,
    receipt.memberAccountId,
    receipt.projectId,
    receipt.quoteId,
    receipt.holdId,
    receipt.teamGoEvidenceId,
    receipt.t3SourceReceiptSha256,
    receipt.pricingSnapshotSha256,
    receipt.taxSnapshotSha256,
    receipt.feeSnapshotSha256,
    receipt.depositSnapshotSha256,
    receipt.sellerSnapshotSha256,
    receipt.cancellationSnapshotSha256,
    receipt.refundBoundarySha256,
    receipt.payableBasis,
    receipt.amountMinor,
    receipt.currency,
    receipt.sourceExpiresAt,
    receipt.stripePlatformAccountId,
    receipt.stripeProductId,
    receipt.stripePriceId,
    receipt.productReadbackSha256,
    receipt.priceReadbackSha256,
    receipt.providerReadbackSha256,
    receipt.operatorConnectedAccountId,
    receipt.ambassadorConnectedAccountId,
    receipt.softwareConnectedAccountId,
    receipt.globalConceptTestConnectedAccountId,
    receipt.beneficiaryBindingSha256,
    receipt.priceCreationFingerprint,
    receipt.bindingFingerprint,
    receipt.ownerAuthorityId,
    receipt.ownerAuthoritySha256,
    JSON.stringify(receipt),
    receipt.providerObservedAt,
    receipt.createdAt,
  ];
}

function assertStoredReceipt(
  row: TrustedReceiptRow,
  source: ClubsStayStep4SourceReceipt,
  now: Date | string,
) {
  const json = record(row.adapter_receipt_json);
  const storedSha = json.adapterReceiptSha256;
  const withoutSha = { ...json };
  delete withoutSha.adapterReceiptSha256;
  const storedExpiry = Date.parse(instant(
    row.source_expires_at,
    "CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT",
  ));
  const canonicalExpiry = Date.parse(source.sourceExpiresAt);
  const observedNow = Date.parse(instant(
    now,
    "CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT",
  ));
  if (
    json.adapterReceiptId !== row.adapter_receipt_id ||
    json.paymentAuthorityId !== row.payment_authority_id ||
    json.memberAccountId !== row.member_account_id ||
    json.projectId !== row.project_id ||
    json.quoteId !== row.quote_id ||
    json.holdId !== row.hold_id ||
    json.teamGoEvidenceId !== row.team_go_evidence_id ||
    json.t3SourceReceiptSha256 !== row.t3_source_receipt_sha256 ||
    json.pricingSnapshotSha256 !== row.pricing_snapshot_sha256 ||
    json.taxSnapshotSha256 !== row.tax_snapshot_sha256 ||
    json.feeSnapshotSha256 !== row.fee_snapshot_sha256 ||
    json.depositSnapshotSha256 !== row.deposit_snapshot_sha256 ||
    json.sellerSnapshotSha256 !== row.seller_snapshot_sha256 ||
    json.cancellationSnapshotSha256 !== row.cancellation_snapshot_sha256 ||
    json.refundBoundarySha256 !== row.refund_boundary_sha256 ||
    json.payableBasis !== row.payable_basis ||
    json.amountMinor !== Number(row.amount_minor) ||
    json.currency !== row.currency ||
    json.sourceExpiresAt !== instant(
      row.source_expires_at,
      "CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT",
    ) ||
    json.stripePlatformAccountId !== row.stripe_platform_account_id ||
    json.stripeProductId !== row.stripe_product_id ||
    json.stripePriceId !== row.stripe_price_id ||
    json.productReadbackSha256 !== row.product_readback_sha256 ||
    json.priceReadbackSha256 !== row.price_readback_sha256 ||
    json.providerReadbackSha256 !== row.provider_readback_sha256 ||
    json.operatorConnectedAccountId !== row.operator_connected_account_id ||
    json.ambassadorConnectedAccountId !== row.ambassador_connected_account_id ||
    json.softwareConnectedAccountId !== row.software_connected_account_id ||
    json.globalConceptTestConnectedAccountId !== row.global_concept_test_connected_account_id ||
    json.beneficiaryBindingSha256 !== row.beneficiary_binding_sha256 ||
    json.priceCreationFingerprint !== row.price_creation_fingerprint ||
    json.bindingFingerprint !== row.binding_fingerprint ||
    json.ownerAuthorityId !== row.owner_authority_id ||
    json.ownerAuthoritySha256 !== row.owner_authority_sha256 ||
    json.providerObservedAt !== instant(
      row.provider_observed_at,
      "CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT",
    ) ||
    json.createdAt !== instant(
      row.created_at,
      "CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT",
    )
  ) {
    fail("CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT");
  }
  if (
    typeof storedSha !== "string" ||
    clubsStripeSha256(withoutSha) !== storedSha ||
    storedSha !== row.adapter_receipt_sha256 ||
    row.t3_source_receipt_sha256 !== source.sourceReceiptSha256 ||
    row.quote_id !== source.quoteId ||
    row.hold_id !== source.holdId ||
    row.team_go_evidence_id !== source.teamGoEvidenceId ||
    row.payable_basis !== source.payableBasis ||
    Number(row.amount_minor) !== source.amountMinor ||
    row.currency !== source.currency ||
    row.pricing_snapshot_sha256 !== source.pricingSnapshotSha256 ||
    row.tax_snapshot_sha256 !== source.taxSnapshotSha256 ||
    row.fee_snapshot_sha256 !== source.feeSnapshotSha256 ||
    row.deposit_snapshot_sha256 !== source.depositSnapshotSha256 ||
    row.seller_snapshot_sha256 !== source.sellerSnapshotSha256 ||
    row.cancellation_snapshot_sha256 !== source.cancellationSnapshotSha256 ||
    row.refund_boundary_sha256 !== source.refundBoundarySha256 ||
    row.stripe_platform_account_id !== CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID ||
    row.provider_readback_verified !== true ||
    row.persistable_to_0256 !== true ||
    row.provider_callable !== true ||
    row.persistence_allowed !== true ||
    row.provider_use_allowed !== true ||
    row.livemode !== false ||
    !SHA256.test(row.product_readback_sha256) ||
    !SHA256.test(row.price_readback_sha256) ||
    !SHA256.test(row.beneficiary_binding_sha256) ||
    !Number.isFinite(canonicalExpiry) ||
    storedExpiry > canonicalExpiry ||
    storedExpiry <= observedNow
  ) {
    fail("CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT");
  }
}

async function insertAuthority(
  client: PoolClient,
  tenantId: string,
  row: TrustedReceiptRow,
  createdAt: string,
) {
  await client.query(
    `INSERT INTO crays_core.clubs_stripe_sandbox_payment_authorities(
       tenant_id,payment_authority_id,member_account_id,project_id,payment_kind,
       subject_reference,source_authority_kind,source_authority_id,source_authority_sha256,
       stripe_product_id,stripe_price_id,amount_minor,currency,
       operator_connected_account_id,ambassador_connected_account_id,
       software_connected_account_id,global_concept_test_connected_account_id,
       production_global_concept_binding_available,authority_state,livemode,expires_at,created_at,
       trusted_stay_adapter_receipt_id,trusted_stay_adapter_receipt_sha256,
       product_readback_sha256,price_readback_sha256,beneficiary_binding_sha256
     ) VALUES(
       $1,$2,$3,$4,'STAY',$5,'STAY_QUOTE',$6,$7,$8,$9,$10,$11,
       $12,$13,$14,$15,false,'READY',false,$16,$17,$18,$19,$20,$21,$22
     )
     ON CONFLICT (tenant_id,payment_kind,subject_reference) DO NOTHING`,
    [
      tenantId,
      row.payment_authority_id,
      row.member_account_id,
      row.project_id,
      row.hold_id,
      row.quote_id,
      row.adapter_receipt_sha256,
      row.stripe_product_id,
      row.stripe_price_id,
      Number(row.amount_minor),
      row.currency,
      row.operator_connected_account_id,
      row.ambassador_connected_account_id,
      row.software_connected_account_id,
      row.global_concept_test_connected_account_id,
      instant(row.source_expires_at, "CCLUB_TRUSTED_STAY_AUTHORITY_REPLAY_CONFLICT"),
      createdAt,
      row.adapter_receipt_id,
      row.adapter_receipt_sha256,
      row.product_readback_sha256,
      row.price_readback_sha256,
      row.beneficiary_binding_sha256,
    ],
  );
  const authority = await client.query<{
    payment_authority_id: string;
    source_authority_sha256: string;
    trusted_stay_adapter_receipt_id: string;
    trusted_stay_adapter_receipt_sha256: string;
  }>(
    `SELECT payment_authority_id,source_authority_sha256,
            trusted_stay_adapter_receipt_id,trusted_stay_adapter_receipt_sha256
       FROM crays_core.clubs_stripe_sandbox_payment_authorities
      WHERE tenant_id=$1 AND payment_kind='STAY' AND subject_reference=$2
      FOR SHARE`,
    [tenantId, row.hold_id],
  );
  const persisted = authority.rows[0];
  if (
    authority.rows.length !== 1 ||
    persisted?.payment_authority_id !== row.payment_authority_id ||
    persisted.source_authority_sha256 !== row.adapter_receipt_sha256 ||
    persisted.trusted_stay_adapter_receipt_id !== row.adapter_receipt_id ||
    persisted.trusted_stay_adapter_receipt_sha256 !== row.adapter_receipt_sha256
  ) {
    fail("CCLUB_TRUSTED_STAY_AUTHORITY_REPLAY_CONFLICT");
  }
}

export async function provisionTrustedClubsStayAdapterReceipt(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  source: ClubsStripeTrustedStaySourceInput;
  setup: ClubsStripeTrustedStayProvisioningAuthority;
  platformTestKey: string;
  observedAt?: Date;
}>) {
  const observedAt = instant(
    input.observedAt ?? new Date(),
    "CCLUB_TRUSTED_STAY_SETUP_INVALID",
  );
  const firstSource = await readSource(input);
  const readback = await readClubsStripeSandboxSetupReadback({
    platformTestKey: input.platformTestKey,
    stripeProductId: input.setup.stripeProductId,
    stripePriceId: input.setup.stripePriceId,
    operatorConnectedAccountId: firstSource.sellerConnectedAccountId,
    ambassadorConnectedAccountId: input.setup.ambassadorConnectedAccountId,
    softwareConnectedAccountId: input.setup.softwareConnectedAccountId,
    globalConceptTestConnectedAccountId: input.setup.globalConceptTestConnectedAccountId,
  });
  const candidate = buildTrustedReceipt({
    memberAccountId: input.memberAccountId,
    source: firstSource.receipt,
    sellerConnectedAccountId: firstSource.sellerConnectedAccountId,
    setup: input.setup,
    readback,
    observedAt,
  });
  const client = await getCorePgPool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await setTenant(client, input.tenantId);
    const currentSource = await readCanonicalClubsStayStep4SourceWithClient(client, {
      tenantId: input.tenantId,
      accountId: input.memberAccountId,
      ...input.source,
    });
    const currentCandidate = buildTrustedReceipt({
      memberAccountId: input.memberAccountId,
      source: currentSource.receipt,
      sellerConnectedAccountId: currentSource.sellerConnectedAccountId,
      setup: input.setup,
      readback,
      observedAt,
    });
    if (
      currentCandidate.adapterReceiptSha256 !== candidate.adapterReceiptSha256 ||
      currentCandidate.adapterReceiptId !== candidate.adapterReceiptId
    ) {
      fail("CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT");
    }
    await client.query(
      `INSERT INTO crays_core.clubs_stripe_sandbox_trusted_stay_adapter_receipts(
         tenant_id,adapter_receipt_id,adapter_receipt_sha256,payment_authority_id,
         member_account_id,project_id,quote_id,hold_id,team_go_evidence_id,
         t3_source_receipt_sha256,pricing_snapshot_sha256,tax_snapshot_sha256,
         fee_snapshot_sha256,deposit_snapshot_sha256,seller_snapshot_sha256,
         cancellation_snapshot_sha256,refund_boundary_sha256,payable_basis,
         amount_minor,currency,source_expires_at,stripe_platform_account_id,
         stripe_product_id,stripe_price_id,product_readback_sha256,
         price_readback_sha256,provider_readback_sha256,
         operator_connected_account_id,ambassador_connected_account_id,
         software_connected_account_id,global_concept_test_connected_account_id,
         beneficiary_binding_sha256,price_creation_fingerprint,binding_fingerprint,
         owner_authority_id,owner_authority_sha256,provider_readback_verified,
         persistable_to_0256,provider_callable,persistence_allowed,provider_use_allowed,
         livemode,adapter_receipt_json,provider_observed_at,created_at
       ) VALUES(
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
         $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
         $35,$36,true,true,true,true,true,false,$37::jsonb,$38,$39
       )
       ON CONFLICT (tenant_id,t3_source_receipt_sha256) DO NOTHING`,
      receiptValues(input.tenantId, currentCandidate),
    );
    const persisted = await client.query<TrustedReceiptRow>(
      `SELECT *
         FROM crays_core.clubs_stripe_sandbox_trusted_stay_adapter_receipts
        WHERE tenant_id=$1 AND t3_source_receipt_sha256=$2
        FOR SHARE`,
      [input.tenantId, currentCandidate.t3SourceReceiptSha256],
    );
    const row = persisted.rows[0];
    if (persisted.rows.length !== 1 || !row) {
      fail("CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT");
    }
    assertStoredReceipt(row, currentSource.receipt, observedAt);
    if (
      row.adapter_receipt_id !== currentCandidate.adapterReceiptId ||
      row.adapter_receipt_sha256 !== currentCandidate.adapterReceiptSha256
    ) {
      fail("CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT");
    }
    await insertAuthority(client, input.tenantId, row, observedAt);
    await client.query("COMMIT");
    return Object.freeze({
      status: "trusted_stay_adapter_ready" as const,
      adapterReceiptId: row.adapter_receipt_id,
      adapterReceiptSha256: row.adapter_receipt_sha256,
      paymentAuthorityId: row.payment_authority_id,
      providerReadbackVerified: true as const,
      persistableTo0256: true as const,
      providerCallable: true as const,
      providerSuccessClaimed: false as const,
      paymentSuccessClaimed: false as const,
      livemode: false as const,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureTrustedClubsStayPaymentAuthority(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  source: ClubsStripeTrustedStaySourceInput;
  now?: Date;
}>): Promise<
  | Readonly<{
      status: "trusted_stay_adapter_ready";
      paymentAuthorityId: string;
      adapterReceiptId: string;
      adapterReceiptSha256: string;
      livemode: false;
    }>
  | ClubsStripePaymentSetupPending
> {
  const now = input.now ?? new Date();
  const client = await getCorePgPool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await setTenant(client, input.tenantId);
    const source = await readCanonicalClubsStayStep4SourceWithClient(client, {
      tenantId: input.tenantId,
      accountId: input.memberAccountId,
      ...input.source,
    });
    const result = await client.query<TrustedReceiptRow>(
      `SELECT *
         FROM crays_core.clubs_stripe_sandbox_trusted_stay_adapter_receipts
        WHERE tenant_id=$1 AND member_account_id=$2
          AND quote_id=$3 AND hold_id=$4 AND team_go_evidence_id=$5
          AND payable_basis=$6 AND t3_source_receipt_sha256=$7
          AND source_expires_at>$8
        FOR SHARE`,
      [
        input.tenantId,
        input.memberAccountId,
        input.source.quoteId,
        input.source.holdId,
        input.source.teamGoEvidenceId,
        input.source.payableBasis,
        source.receipt.sourceReceiptSha256,
        now.toISOString(),
      ],
    );
    const row = result.rows[0];
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return clubsStripePaymentSetupPending("STAY", "TRUSTED_STAY_ADAPTER_RECEIPT_MISSING");
    }
    if (result.rows.length !== 1 || !row) {
      fail("CCLUB_TRUSTED_STAY_RECEIPT_REPLAY_CONFLICT");
    }
    assertStoredReceipt(row, source.receipt, now);
    await insertAuthority(
      client,
      input.tenantId,
      row,
      now.toISOString(),
    );
    await client.query("COMMIT");
    return Object.freeze({
      status: "trusted_stay_adapter_ready" as const,
      paymentAuthorityId: row.payment_authority_id,
      adapterReceiptId: row.adapter_receipt_id,
      adapterReceiptSha256: row.adapter_receipt_sha256,
      livemode: false as const,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const code = (error as { code?: unknown }).code;
    if (code === "42P01" || code === "42703") {
      return clubsStripePaymentSetupPending("STAY", "TRUSTED_STAY_ADAPTER_SCHEMA_NOT_READY");
    }
    if (error instanceof ClubsStayStep4RepositoryError) {
      return clubsStripePaymentSetupPending("STAY", "CANONICAL_STAY_AUTHORITY_NOT_READY");
    }
    throw error;
  } finally {
    client.release();
  }
}
