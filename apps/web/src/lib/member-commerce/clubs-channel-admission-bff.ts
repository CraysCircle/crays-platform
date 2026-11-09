import {
  assertClubsCartAdmission,
  clubsProductTypes,
  type ClubsPaymentEnvironment,
  type ClubsProductType,
} from "./clubs-seller-channel-mapping";
import {
  loadClubsCartMappingScope,
  resolveActiveClubsSellerChannelMapping,
  type ClubsSellerChannelMappingDb,
} from "./clubs-seller-channel-mapping-repository";

export type ClubsChannelAdmissionRequest = Readonly<{
  storeId: string;
  currencyCode: string;
  vendureZoneId: string;
  vendureTaxCategoryId: string;
  productType: ClubsProductType;
  cartId?: string;
}>;

export type ClubsChannelAdmissionAuthority = Readonly<{
  authoritySource: string;
  accountId: string | null;
  tenantId: string | null;
  role: string;
  roleAssignmentId: string | null;
}>;

export type ClubsChannelAdmissionResult = Readonly<{
  state: "admitted";
  storeId: string;
  currencyCode: string;
  productType: ClubsProductType;
  existingCartChecked: boolean;
}>;

type Database = Readonly<{
  transaction<T>(
    work: (db: ClubsSellerChannelMappingDb) => Promise<T>,
  ): Promise<T>;
}>;

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const currencyPattern = /^[A-Z]{3}$/;
const allowedKeys = new Set([
  "storeId",
  "currencyCode",
  "vendureZoneId",
  "vendureTaxCategoryId",
  "productType",
  "cartId",
]);

function exact(value: unknown, pattern = idPattern): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error("CLUBS_CHANNEL_ADMISSION_REQUEST_INVALID");
  }
  return value;
}

export function parseClubsChannelAdmissionRequest(
  value: unknown,
): ClubsChannelAdmissionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CLUBS_CHANNEL_ADMISSION_REQUEST_INVALID");
  }
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    throw new Error("CLUBS_CHANNEL_ADMISSION_AUTHORITY_FIELD_DENIED");
  }
  const productType = exact(body.productType);
  if (!clubsProductTypes.includes(productType as ClubsProductType)) {
    throw new Error("CLUBS_CHANNEL_ADMISSION_REQUEST_INVALID");
  }
  return Object.freeze({
    storeId: exact(body.storeId),
    currencyCode: exact(body.currencyCode, currencyPattern),
    vendureZoneId: exact(body.vendureZoneId),
    vendureTaxCategoryId: exact(body.vendureTaxCategoryId),
    productType: productType as ClubsProductType,
    ...(body.cartId === undefined ? {} : { cartId: exact(body.cartId) }),
  });
}

function requireAuthority(authority: ClubsChannelAdmissionAuthority) {
  if (authority.authoritySource !== "oidc" ||
      !authority.accountId ||
      !authority.tenantId ||
      !authority.roleAssignmentId ||
      !idPattern.test(authority.accountId) ||
      !idPattern.test(authority.tenantId) ||
      !idPattern.test(authority.role) ||
      !idPattern.test(authority.roleAssignmentId)) {
    throw new Error("CLUBS_CHANNEL_ADMISSION_AUTHENTICATION_REQUIRED");
  }
  return Object.freeze({
    accountId: authority.accountId,
    tenantId: authority.tenantId,
    role: authority.role,
    roleAssignmentId: authority.roleAssignmentId,
  });
}

export async function executeClubsChannelAdmission(
  database: Database,
  input: Readonly<{
    request: ClubsChannelAdmissionRequest;
    authority: ClubsChannelAdmissionAuthority;
    paymentEnvironment: ClubsPaymentEnvironment;
  }>,
): Promise<ClubsChannelAdmissionResult> {
  const authority = requireAuthority(input.authority);
  if (!["none", "test", "live"].includes(input.paymentEnvironment)) {
    throw new Error("CLUBS_CHANNEL_ADMISSION_PAYMENT_ENVIRONMENT_INVALID");
  }
  return database.transaction(async (db) => {
    await db.query("set transaction isolation level serializable");
    await db.query("select set_config('crays.app_role','core_service',true)");
    await db.query("select set_config('crays.tenant_id',$1,true)", [
      authority.tenantId,
    ]);
    const clock = await db.query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = new Date(clock.rows[0]?.authority_now ?? "");
    if (!Number.isFinite(authorityNow.getTime())) {
      throw new Error("CLUBS_CHANNEL_ADMISSION_AUTHORITY_CLOCK_INVALID");
    }
    const mapping = await resolveActiveClubsSellerChannelMapping(db, {
      partnerTenantId: authority.tenantId,
      storeId: input.request.storeId,
      authorityNow,
    });
    const existingCartScope = input.request.cartId
      ? await loadClubsCartMappingScope(db, {
          partnerTenantId: authority.tenantId,
          cartId: input.request.cartId,
          authorityNow,
        })
      : null;
    assertClubsCartAdmission(mapping, {
      roleCode: authority.role,
      currencyCode: input.request.currencyCode,
      vendureZoneId: input.request.vendureZoneId,
      vendureTaxCategoryId: input.request.vendureTaxCategoryId,
      productType: input.request.productType,
      paymentEnvironment: input.paymentEnvironment,
      existingCartScope,
    });
    return Object.freeze({
      state: "admitted" as const,
      storeId: input.request.storeId,
      currencyCode: input.request.currencyCode,
      productType: input.request.productType,
      existingCartChecked: existingCartScope !== null,
    });
  });
}
