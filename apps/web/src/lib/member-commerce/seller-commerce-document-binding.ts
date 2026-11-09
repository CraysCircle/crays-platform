import {createHash} from "node:crypto";

export const SELLER_COMMERCE_DOCUMENT_VERSION = "ncrv2-138.v1" as const;
const digest = (value: object) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isSha256 = (value: string) => /^[a-f0-9]{64}$/.test(value);

type StorefrontCommerceContext = Readonly<{
  verticalRoot: string;
  storeId: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  operatorLegalName: string;
  taxRegistrationRef: string;
  contextFingerprint: string;
  vendure: Readonly<{sellerId: string; channelId: string}>;
}>;

export type CustomerSellerSnapshot = Readonly<{
  snapshotId: string;
  snapshotSha256: string;
  orderId: string;
  orderCode: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  sellerLegalName: string;
  sellerDisplayName: string;
  sellerRegisteredAddress: string;
  sellerTaxRegistrationRef: string;
  vendureSellerId: string;
  vendureChannelId: string;
  stripeConnectedAccountId: string;
  operatorKind: "independent_partner" | "crays_contracted_operator";
  craysOperatorContractReceiptId?: string;
}>;

type ArtifactBinding = Readonly<{
  artifactId: string;
  artifactVersionId: string;
  artifactSha256: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  orderId: string;
  state: "approved" | "verified" | "pending" | "revoked";
}>;

export function createStorefrontSellerDisclosure(
  context: StorefrontCommerceContext,
  input: Readonly<{
    sellerRegisteredAddress: string;
    disclosurePolicyVersion: string;
  }>,
) {
  if (
    !context.operatorLegalName.trim() ||
    !context.taxRegistrationRef.trim() ||
    !input.sellerRegisteredAddress.trim() ||
    !input.disclosurePolicyVersion.trim()
  ) throw new Error("STOREFRONT_SELLER_DISCLOSURE_INCOMPLETE");
  const body = {
    contractVersion: SELLER_COMMERCE_DOCUMENT_VERSION,
    authoritySource: "verified_store_operator_assignment" as const,
    contextFingerprint: context.contextFingerprint,
    verticalRoot: context.verticalRoot,
    storeId: context.storeId,
    partnerTenantId: context.partnerTenantId,
    operatorLegalEntityId: context.operatorLegalEntityId,
    sellerLegalName: context.operatorLegalName,
    sellerRegisteredAddress: input.sellerRegisteredAddress,
    sellerTaxRegistrationRef: context.taxRegistrationRef,
    vendureSellerId: context.vendure.sellerId,
    vendureChannelId: context.vendure.channelId,
    disclosurePolicyVersion: input.disclosurePolicyVersion,
  };
  return Object.freeze({...body, disclosureSha256: digest(body)});
}

export function createSellerCommerceDocumentBinding(
  snapshot: CustomerSellerSnapshot,
  input: Readonly<{
    surface:
      | "checkout"
      | "order_confirmation"
      | "receipt_invoice_reference"
      | "return_label"
      | "return_evidence";
    artifact: ArtifactBinding;
    erpDocumentReference?: string;
    returnId?: string;
    bindingPolicyVersion: string;
    idempotencyKey: string;
  }>,
) {
  const untrusted = input as Record<string, unknown>;
  for (const key of ["sellerLegalName", "operatorLegalEntityId", "partnerTenantId", "stripeConnectedAccountId"]) {
    if (Object.hasOwn(untrusted, key)) throw new Error("SELLER_DOCUMENT_BROWSER_OVERRIDE_DENIED");
  }
  if (
    !isSha256(snapshot.snapshotSha256) ||
    !snapshot.sellerLegalName.trim() ||
    !snapshot.sellerDisplayName.trim() ||
    !snapshot.sellerRegisteredAddress.trim() ||
    !snapshot.sellerTaxRegistrationRef.trim()
  ) throw new Error("SELLER_SNAPSHOT_DISCLOSURE_INCOMPLETE");
  if (
    snapshot.operatorKind === "crays_contracted_operator" &&
    !snapshot.craysOperatorContractReceiptId?.trim()
  ) throw new Error("CRAYS_OPERATOR_CONTRACT_RECEIPT_REQUIRED");
  if (
    input.artifact.partnerTenantId !== snapshot.partnerTenantId ||
    input.artifact.operatorLegalEntityId !== snapshot.operatorLegalEntityId ||
    input.artifact.storeId !== snapshot.storeId ||
    input.artifact.orderId !== snapshot.orderId ||
    !isSha256(input.artifact.artifactSha256) ||
    !["approved", "verified"].includes(input.artifact.state)
  ) throw new Error("SELLER_DOCUMENT_ARTIFACT_SCOPE_MISMATCH");
  if (
    input.surface === "receipt_invoice_reference" &&
    !input.erpDocumentReference?.trim()
  ) throw new Error("SELLER_DOCUMENT_ERP_REFERENCE_REQUIRED");
  if (
    ["return_label", "return_evidence"].includes(input.surface) &&
    !input.returnId?.trim()
  ) throw new Error("SELLER_DOCUMENT_RETURN_BINDING_REQUIRED");
  if (!input.bindingPolicyVersion.trim() || !input.idempotencyKey.trim()) {
    throw new Error("SELLER_DOCUMENT_BINDING_INVALID");
  }
  const body = {
    contractVersion: SELLER_COMMERCE_DOCUMENT_VERSION,
    authoritySource: "immutable_order_seller_snapshot" as const,
    surface: input.surface,
    snapshotId: snapshot.snapshotId,
    snapshotSha256: snapshot.snapshotSha256,
    orderId: snapshot.orderId,
    orderCode: snapshot.orderCode,
    partnerTenantId: snapshot.partnerTenantId,
    operatorLegalEntityId: snapshot.operatorLegalEntityId,
    storeId: snapshot.storeId,
    sellerLegalName: snapshot.sellerLegalName,
    sellerDisplayName: snapshot.sellerDisplayName,
    sellerRegisteredAddress: snapshot.sellerRegisteredAddress,
    sellerTaxRegistrationRef: snapshot.sellerTaxRegistrationRef,
    vendureSellerId: snapshot.vendureSellerId,
    vendureChannelId: snapshot.vendureChannelId,
    merchantOfRecordConnectedAccount: snapshot.stripeConnectedAccountId,
    operatorKind: snapshot.operatorKind,
    craysOperatorContractReceiptId: snapshot.craysOperatorContractReceiptId ?? null,
    artifactId: input.artifact.artifactId,
    artifactVersionId: input.artifact.artifactVersionId,
    artifactSha256: input.artifact.artifactSha256,
    erpDocumentReference: input.erpDocumentReference ?? null,
    returnId: input.returnId ?? null,
    bindingPolicyVersion: input.bindingPolicyVersion,
    idempotencyKey: input.idempotencyKey,
  };
  return Object.freeze({...body, bindingSha256: digest(body)});
}

export function adjudicateSellerDocumentReplay(
  prior: Readonly<{idempotencyKey: string; bindingSha256: string; bindingId: string}>,
  binding: ReturnType<typeof createSellerCommerceDocumentBinding>,
) {
  if (prior.idempotencyKey !== binding.idempotencyKey) return {replay: false as const};
  if (prior.bindingSha256 !== binding.bindingSha256) {
    throw new Error("SELLER_DOCUMENT_IDEMPOTENCY_COLLISION");
  }
  return {replay: true as const, bindingId: prior.bindingId};
}

export function bindSellerCorrectMailThread(
  snapshot: CustomerSellerSnapshot,
  input: Readonly<{
    mailThreadId: string;
    senderMailboxBindingId: string;
    senderPartnerTenantId: string;
    senderOperatorLegalEntityId: string;
    senderStoreId: string;
    recipientCanonicalPersonId: string;
    recipientRelationshipId: string;
    recipientCommunicationChannelProjectionId: string;
    artifactBindingSha256: string;
    idempotencyKey: string;
  }>,
) {
  if (
    input.senderPartnerTenantId !== snapshot.partnerTenantId ||
    input.senderOperatorLegalEntityId !== snapshot.operatorLegalEntityId ||
    input.senderStoreId !== snapshot.storeId
  ) throw new Error("SELLER_MAILBOX_SCOPE_MISMATCH");
  if (
    !input.recipientCanonicalPersonId.trim() ||
    !input.recipientRelationshipId.trim() ||
    !input.recipientCommunicationChannelProjectionId.trim()
  ) throw new Error("SELLER_MAIL_CANONICAL_RECIPIENT_REQUIRED");
  if (
    !input.mailThreadId.trim() ||
    !input.senderMailboxBindingId.trim() ||
    !isSha256(input.artifactBindingSha256) ||
    !input.idempotencyKey.trim()
  ) throw new Error("SELLER_MAIL_BINDING_INVALID");
  const body = {
    contractVersion: SELLER_COMMERCE_DOCUMENT_VERSION,
    authoritySource: "immutable_order_seller_snapshot" as const,
    snapshotId: snapshot.snapshotId,
    snapshotSha256: snapshot.snapshotSha256,
    orderId: snapshot.orderId,
    partnerTenantId: snapshot.partnerTenantId,
    operatorLegalEntityId: snapshot.operatorLegalEntityId,
    storeId: snapshot.storeId,
    sellerLegalName: snapshot.sellerLegalName,
    senderMailboxBindingId: input.senderMailboxBindingId,
    mailThreadId: input.mailThreadId,
    recipientCanonicalPersonId: input.recipientCanonicalPersonId,
    recipientRelationshipId: input.recipientRelationshipId,
    recipientCommunicationChannelProjectionId: input.recipientCommunicationChannelProjectionId,
    artifactBindingSha256: input.artifactBindingSha256,
    idempotencyKey: input.idempotencyKey,
    sendMode: "human_nextcloud_mail" as const,
    userConfirmationRequired: true as const,
    automaticDispatchAllowed: false as const,
  };
  return Object.freeze({...body, mailBindingSha256: digest(body)});
}
