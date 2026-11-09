import { createHash } from "node:crypto";

export const clubsProductTypes = [
  "physical", "digital", "membership", "pass",
  "booking", "ticket", "fee", "deposit",
] as const;
export type ClubsProductType = (typeof clubsProductTypes)[number];
export type ClubsPaymentExposure = "none" | "test_only" | "live_approved";
export type ClubsPaymentEnvironment = "none" | "test" | "live";

export type ClubsSellerChannelMappingInput = Readonly<{
  mappingId: string;
  mappingVersion: number;
  storeOperatorAssignmentId: string;
  storeOperatorAssignmentVersion: number;
  providerScopeBindingId: string;
  providerScopeBindingVersion: number;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  vendureDeploymentCellId: string;
  vendureSellerId: string;
  vendureChannelId: string;
  approvedRoleCodes: readonly string[];
  currencyCodes: readonly string[];
  defaultCurrencyCode: string;
  vendureZoneIds: readonly string[];
  vendureTaxCategoryIds: readonly string[];
  approvedProductTypes: readonly ClubsProductType[];
  paymentExposure: ClubsPaymentExposure;
  paymentAuthorityReceiptSha256?: string | null;
  approvalReceiptId: string;
  approvalReceiptSha256: string;
  validFrom: string;
  validUntil?: string | null;
}>;

export type ClubsSellerChannelMapping =
  Readonly<ClubsSellerChannelMappingInput> &
  Readonly<{ mappingFingerprint: string }>;
export type ClubsCartScope = Readonly<{
  mappingId: string;
  mappingVersion: number;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  vendureSellerId: string;
  vendureChannelId: string;
  mappingFingerprint: string;
}>;
export type ClubsCartAdmissionInput = Readonly<{
  roleCode: string;
  currencyCode: string;
  vendureZoneId: string;
  vendureTaxCategoryId: string;
  productType: ClubsProductType;
  paymentEnvironment: ClubsPaymentEnvironment;
  existingCartScope?: ClubsCartScope | null;
}>;
export type ClubsSellerChannelMappingErrorCode =
  | "CLUBS_SELLER_CHANNEL_MAPPING_INVALID"
  | "CLUBS_SELLER_CHANNEL_ROLE_DENIED"
  | "CLUBS_SELLER_CHANNEL_CURRENCY_DENIED"
  | "CLUBS_SELLER_CHANNEL_ZONE_DENIED"
  | "CLUBS_SELLER_CHANNEL_TAX_CATEGORY_DENIED"
  | "CLUBS_SELLER_CHANNEL_PRODUCT_TYPE_DENIED"
  | "CLUBS_SELLER_CHANNEL_PAYMENT_EXPOSURE_DENIED"
  | "CLUBS_CROSS_PARTNER_CART_DENIED";

export class ClubsSellerChannelMappingError extends Error {
  constructor(readonly code: ClubsSellerChannelMappingErrorCode, message: string) {
    super(message);
    this.name = "ClubsSellerChannelMappingError";
  }
}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const rolePattern = /^[a-z][a-z0-9_.:-]{1,63}$/;
const currencyPattern = /^[A-Z]{3}$/;
const shaPattern = /^[0-9a-f]{64}$/;
function invalid(message: string): never {
  throw new ClubsSellerChannelMappingError(
    "CLUBS_SELLER_CHANNEL_MAPPING_INVALID", message,
  );
}
function exact(value: unknown, field: string, pattern = idPattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    invalid(field + " is invalid.");
  }
  return value;
}
function version(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    invalid(field + " must be a positive safe integer.");
  }
  return Number(value);
}
function list(values: readonly string[], field: string, pattern = idPattern) {
  if (!Array.isArray(values) || values.length < 1 ||
      values.some((value) => typeof value !== "string" || !pattern.test(value)) ||
      new Set(values).size !== values.length) {
    invalid(field + " must be a non-empty exact unique list.");
  }
  return Object.freeze([...values]);
}
function sha(value: unknown, field: string) {
  return exact(value, field, shaPattern);
}
function instant(value: unknown, field: string) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    invalid(field + " must be an ISO timestamp.");
  }
  return new Date(value).toISOString();
}

export function createClubsSellerChannelMapping(
  input: ClubsSellerChannelMappingInput,
): ClubsSellerChannelMapping {
  const mapping = Object.freeze({
    mappingId: exact(input.mappingId, "mappingId"),
    mappingVersion: version(input.mappingVersion, "mappingVersion"),
    storeOperatorAssignmentId: exact(
      input.storeOperatorAssignmentId, "storeOperatorAssignmentId",
    ),
    storeOperatorAssignmentVersion: version(
      input.storeOperatorAssignmentVersion, "storeOperatorAssignmentVersion",
    ),
    providerScopeBindingId: exact(
      input.providerScopeBindingId, "providerScopeBindingId",
    ),
    providerScopeBindingVersion: version(
      input.providerScopeBindingVersion, "providerScopeBindingVersion",
    ),
    partnerTenantId: exact(input.partnerTenantId, "partnerTenantId"),
    operatorLegalEntityId: exact(
      input.operatorLegalEntityId, "operatorLegalEntityId",
    ),
    storeId: exact(input.storeId, "storeId"),
    vendureDeploymentCellId: exact(
      input.vendureDeploymentCellId, "vendureDeploymentCellId",
    ),
    vendureSellerId: exact(input.vendureSellerId, "vendureSellerId"),
    vendureChannelId: exact(input.vendureChannelId, "vendureChannelId"),
    approvedRoleCodes: list(
      input.approvedRoleCodes, "approvedRoleCodes", rolePattern,
    ),
    currencyCodes: list(input.currencyCodes, "currencyCodes", currencyPattern),
    defaultCurrencyCode: input.defaultCurrencyCode,
    vendureZoneIds: list(input.vendureZoneIds, "vendureZoneIds"),
    vendureTaxCategoryIds: list(
      input.vendureTaxCategoryIds, "vendureTaxCategoryIds",
    ),
    approvedProductTypes: list(
      input.approvedProductTypes, "approvedProductTypes",
    ) as readonly ClubsProductType[],
    paymentExposure: input.paymentExposure,
    paymentAuthorityReceiptSha256:
      input.paymentAuthorityReceiptSha256 ?? null,
    approvalReceiptId: exact(input.approvalReceiptId, "approvalReceiptId"),
    approvalReceiptSha256: sha(
      input.approvalReceiptSha256, "approvalReceiptSha256",
    ),
    validFrom: instant(input.validFrom, "validFrom"),
    validUntil: input.validUntil ? instant(input.validUntil, "validUntil") : null,
  });
  if (!currencyPattern.test(mapping.defaultCurrencyCode) ||
      !mapping.currencyCodes.includes(mapping.defaultCurrencyCode) ||
      mapping.approvedProductTypes.some(
        (value) => !clubsProductTypes.includes(value),
      ) ||
      !["none", "test_only", "live_approved"].includes(mapping.paymentExposure)) {
    invalid("mapping boundary is invalid.");
  }
  if (mapping.paymentExposure === "none") {
    if (mapping.paymentAuthorityReceiptSha256 !== null) {
      invalid("payment exposure none cannot carry payment authority.");
    }
  } else {
    sha(mapping.paymentAuthorityReceiptSha256, "paymentAuthorityReceiptSha256");
  }
  if (mapping.validUntil &&
      Date.parse(mapping.validUntil) <= Date.parse(mapping.validFrom)) {
    invalid("validUntil must be later than validFrom.");
  }
  const canonical = JSON.stringify(mapping);
  return Object.freeze({
    ...mapping,
    mappingFingerprint: createHash("sha256").update(canonical).digest("hex"),
  });
}

function deny(
  code: Exclude<
    ClubsSellerChannelMappingErrorCode,
    "CLUBS_SELLER_CHANNEL_MAPPING_INVALID"
  >,
  message: string,
): never {
  throw new ClubsSellerChannelMappingError(code, message);
}
export function assertClubsCartAdmission(
  mapping: ClubsSellerChannelMapping,
  input: ClubsCartAdmissionInput,
) {
  if (!mapping.approvedRoleCodes.includes(input.roleCode)) {
    deny("CLUBS_SELLER_CHANNEL_ROLE_DENIED", "Role is outside mapping.");
  }
  if (!mapping.currencyCodes.includes(input.currencyCode)) {
    deny("CLUBS_SELLER_CHANNEL_CURRENCY_DENIED", "Currency is outside mapping.");
  }
  if (!mapping.vendureZoneIds.includes(input.vendureZoneId)) {
    deny("CLUBS_SELLER_CHANNEL_ZONE_DENIED", "Zone is outside mapping.");
  }
  if (!mapping.vendureTaxCategoryIds.includes(input.vendureTaxCategoryId)) {
    deny("CLUBS_SELLER_CHANNEL_TAX_CATEGORY_DENIED", "Tax is outside mapping.");
  }
  if (!mapping.approvedProductTypes.includes(input.productType)) {
    deny("CLUBS_SELLER_CHANNEL_PRODUCT_TYPE_DENIED", "Product is outside mapping.");
  }
  if ((mapping.paymentExposure === "none" &&
       input.paymentEnvironment !== "none") ||
      (mapping.paymentExposure === "test_only" &&
       input.paymentEnvironment === "live")) {
    deny(
      "CLUBS_SELLER_CHANNEL_PAYMENT_EXPOSURE_DENIED",
      "Payment is outside mapping.",
    );
  }
  const current = input.existingCartScope;
  if (current && (
    current.mappingId !== mapping.mappingId ||
    current.mappingVersion !== mapping.mappingVersion ||
    current.partnerTenantId !== mapping.partnerTenantId ||
    current.operatorLegalEntityId !== mapping.operatorLegalEntityId ||
    current.storeId !== mapping.storeId ||
    current.vendureSellerId !== mapping.vendureSellerId ||
    current.vendureChannelId !== mapping.vendureChannelId ||
    current.mappingFingerprint !== mapping.mappingFingerprint
  )) {
    deny(
      "CLUBS_CROSS_PARTNER_CART_DENIED",
      "Existing cart is bound to a different partner/operator/channel.",
    );
  }
  return Object.freeze({
    admitted: true as const,
    mappingId: mapping.mappingId,
    mappingVersion: mapping.mappingVersion,
    mappingFingerprint: mapping.mappingFingerprint,
    partnerTenantId: mapping.partnerTenantId,
    operatorLegalEntityId: mapping.operatorLegalEntityId,
    storeId: mapping.storeId,
    vendureSellerId: mapping.vendureSellerId,
    vendureChannelId: mapping.vendureChannelId,
    roleCode: input.roleCode,
    currencyCode: input.currencyCode,
    vendureZoneId: input.vendureZoneId,
    vendureTaxCategoryId: input.vendureTaxCategoryId,
    productType: input.productType,
    paymentEnvironment: input.paymentEnvironment,
  });
}
