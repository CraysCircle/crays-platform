import {
  createClubsSellerChannelMapping,
  type ClubsCartScope,
  type ClubsSellerChannelMapping,
} from "./clubs-seller-channel-mapping";

export type ClubsSellerChannelMappingDb = Readonly<{
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{ rows: Row[] }>>;
}>;

type MappingRow = Readonly<{
  mapping_id: string;
  mapping_version: number;
  store_operator_assignment_id: string;
  store_operator_assignment_version: number;
  provider_scope_binding_id: string;
  provider_scope_binding_version: number;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  store_id: string;
  vendure_deployment_cell_id: string;
  vendure_seller_id: string;
  vendure_channel_id: string;
  approved_role_codes: unknown;
  currency_codes: unknown;
  default_currency_code: string;
  vendure_zone_ids: unknown;
  vendure_tax_category_ids: unknown;
  approved_product_types: unknown;
  payment_exposure: "none" | "test_only" | "live_approved";
  payment_authority_receipt_sha256: string | null;
  approval_receipt_id: string;
  approval_receipt_sha256: string;
  valid_from: string | Date;
  valid_until: string | Date | null;
  mapping_fingerprint: string;
}>;

type CartScopeRow = Readonly<{
  clubs_seller_channel_mapping_id: string | null;
  clubs_seller_channel_mapping_version: number | null;
  clubs_seller_channel_mapping_fingerprint: string | null;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  store_id: string;
  vendure_seller_id: string;
  vendure_channel_id: string;
}>;

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const shaPattern = /^[0-9a-f]{64}$/;

function exact(value: unknown, code: string): string {
  if (typeof value !== "string" || !idPattern.test(value)) throw new Error(code);
  return value;
}

function instant(value: string | Date | null): string | null {
  if (value === null) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error("CLUBS_SELLER_CHANNEL_MAPPING_READ_CORRUPT");
  }
  return parsed.toISOString();
}

function stringList(value: unknown): string[] {
  const candidate = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(candidate) || candidate.some((item) => typeof item !== "string")) {
    throw new Error("CLUBS_SELLER_CHANNEL_MAPPING_READ_CORRUPT");
  }
  return candidate;
}

export async function resolveActiveClubsSellerChannelMapping(
  db: ClubsSellerChannelMappingDb,
  input: Readonly<{
    partnerTenantId: string;
    storeId: string;
    authorityNow: Date;
  }>,
): Promise<ClubsSellerChannelMapping> {
  const partnerTenantId = exact(
    input.partnerTenantId,
    "CLUBS_SELLER_CHANNEL_TENANT_INVALID",
  );
  const storeId = exact(input.storeId, "CLUBS_SELLER_CHANNEL_STORE_INVALID");
  if (!Number.isFinite(input.authorityNow.getTime())) {
    throw new Error("CLUBS_SELLER_CHANNEL_AUTHORITY_CLOCK_INVALID");
  }
  const result = await db.query<MappingRow>(`
    select
      mapping_id, mapping_version,
      store_operator_assignment_id, store_operator_assignment_version,
      provider_scope_binding_id, provider_scope_binding_version,
      partner_tenant_id, operator_legal_entity_id, store_id,
      vendure_deployment_cell_id, vendure_seller_id, vendure_channel_id,
      approved_role_codes, currency_codes, default_currency_code,
      vendure_zone_ids, vendure_tax_category_ids, approved_product_types,
      payment_exposure, payment_authority_receipt_sha256,
      approval_receipt_id, approval_receipt_sha256,
      valid_from, valid_until, mapping_fingerprint
    from crays_core.clubs_seller_channel_mappings
    where partner_tenant_id = $1
      and store_id = $2
      and lifecycle_state = 'active'
      and valid_from <= $3
      and (valid_until is null or valid_until > $3)
    for share
  `, [partnerTenantId, storeId, input.authorityNow.toISOString()]);
  if (result.rows.length === 0) {
    throw new Error("CLUBS_SELLER_CHANNEL_MAPPING_NOT_FOUND");
  }
  if (result.rows.length !== 1) {
    throw new Error("CLUBS_SELLER_CHANNEL_MAPPING_AMBIGUOUS");
  }
  const row = result.rows[0];
  const mapping = createClubsSellerChannelMapping({
    mappingId: row.mapping_id,
    mappingVersion: row.mapping_version,
    storeOperatorAssignmentId: row.store_operator_assignment_id,
    storeOperatorAssignmentVersion: row.store_operator_assignment_version,
    providerScopeBindingId: row.provider_scope_binding_id,
    providerScopeBindingVersion: row.provider_scope_binding_version,
    partnerTenantId: row.partner_tenant_id,
    operatorLegalEntityId: row.operator_legal_entity_id,
    storeId: row.store_id,
    vendureDeploymentCellId: row.vendure_deployment_cell_id,
    vendureSellerId: row.vendure_seller_id,
    vendureChannelId: row.vendure_channel_id,
    approvedRoleCodes: stringList(row.approved_role_codes),
    currencyCodes: stringList(row.currency_codes),
    defaultCurrencyCode: row.default_currency_code,
    vendureZoneIds: stringList(row.vendure_zone_ids),
    vendureTaxCategoryIds: stringList(row.vendure_tax_category_ids),
    approvedProductTypes: stringList(row.approved_product_types) as never,
    paymentExposure: row.payment_exposure,
    paymentAuthorityReceiptSha256: row.payment_authority_receipt_sha256,
    approvalReceiptId: row.approval_receipt_id,
    approvalReceiptSha256: row.approval_receipt_sha256,
    validFrom: instant(row.valid_from) as string,
    validUntil: instant(row.valid_until),
  });
  if (!shaPattern.test(row.mapping_fingerprint) ||
      mapping.mappingFingerprint !== row.mapping_fingerprint) {
    throw new Error("CLUBS_SELLER_CHANNEL_MAPPING_FINGERPRINT_MISMATCH");
  }
  return mapping;
}

export async function loadClubsCartMappingScope(
  db: ClubsSellerChannelMappingDb,
  input: Readonly<{
    partnerTenantId: string;
    cartId: string;
    authorityNow: Date;
  }>,
): Promise<ClubsCartScope> {
  const tenantId = exact(
    input.partnerTenantId,
    "CLUBS_CART_MAPPING_TENANT_INVALID",
  );
  const cartId = exact(input.cartId, "CLUBS_CART_MAPPING_CART_INVALID");
  const result = await db.query<CartScopeRow>(`
    select
      clubs_seller_channel_mapping_id,
      clubs_seller_channel_mapping_version,
      clubs_seller_channel_mapping_fingerprint,
      partner_tenant_id, operator_legal_entity_id, store_id,
      vendure_seller_id, vendure_channel_id
    from crays_core.seller_bound_carts
    where tenant_id = $1
      and cart_id = $2
      and vertical_root = 'clubs'
      and cart_state = 'active'
      and expires_at > $3
    for share
  `, [tenantId, cartId, input.authorityNow.toISOString()]);
  if (result.rows.length === 0) throw new Error("CLUBS_CART_MAPPING_NOT_FOUND");
  if (result.rows.length !== 1) throw new Error("CLUBS_CART_MAPPING_AMBIGUOUS");
  const row = result.rows[0];
  if (!row.clubs_seller_channel_mapping_id ||
      !Number.isSafeInteger(row.clubs_seller_channel_mapping_version) ||
      Number(row.clubs_seller_channel_mapping_version) < 1 ||
      !row.clubs_seller_channel_mapping_fingerprint ||
      !shaPattern.test(row.clubs_seller_channel_mapping_fingerprint)) {
    throw new Error("CLUBS_CART_MAPPING_BINDING_REQUIRED");
  }
  return Object.freeze({
    mappingId: row.clubs_seller_channel_mapping_id,
    mappingVersion: Number(row.clubs_seller_channel_mapping_version),
    mappingFingerprint: row.clubs_seller_channel_mapping_fingerprint,
    partnerTenantId: row.partner_tenant_id,
    operatorLegalEntityId: row.operator_legal_entity_id,
    storeId: row.store_id,
    vendureSellerId: row.vendure_seller_id,
    vendureChannelId: row.vendure_channel_id,
  });
}
