import "server-only";

/** Native Core commands, not the legacy booking tables and not a second provider. */
export const MEMBER_NATIVE_HOLD_SQL =
  "select crays_core_rpc.issue_own_member_test_hold_v1($1::text,$2::text,$3::text,$4::text,$5::text) as payload";
export const MEMBER_NATIVE_CART_SQL =
  "select crays_core_rpc.prepare_own_member_hold_bound_cart_v1($1::text,$2::text,$3::text,$4::text,$5::text) as payload";

export type MemberNativeBookingQuery = (
  text: string,
  values: readonly string[],
) => Promise<{rows: Record<string, unknown>[]; rowCount: number | null}>;

export type MemberNativeBookingActor = Readonly<{
  accountId: string;
  /** Established by the current request's protected SDK/V2 resolver. */
  sourceIdentityId: string;
  purpose: "clubs-customer";
  issuer: string;
  subject: string;
  clientIdSha256: string;
}>;

const identifier = /^[A-Za-z0-9][A-Za-z0-9:_.-]{2,199}$/;
const idempotency = /^[A-Za-z0-9][A-Za-z0-9:_.-]{15,199}$/;
const currencies = new Set(["CHF", "EUR", "USD"]);

function actorAccount(actor: MemberNativeBookingActor) {
  if (actor.purpose !== "clubs-customer" || !identifier.test(actor.accountId) ||
      !identifier.test(actor.sourceIdentityId) || !/^[a-f0-9]{64}$/.test(actor.clientIdSha256) ||
      !actor.subject || actor.subject.length > 512 || actor.subject.trim() !== actor.subject ||
      /[\u0000-\u0020\u007f]/.test(actor.subject)) throw new Error("MEMBER_NATIVE_ACTOR_INVALID");
  let issuer:URL;
  try {issuer = new URL(actor.issuer);} catch {throw new Error("MEMBER_NATIVE_ACTOR_INVALID");}
  if (issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.search || issuer.hash ||
      actor.issuer !== `${issuer.origin}/`) throw new Error("MEMBER_NATIVE_ACTOR_INVALID");
  return actor.accountId;
}

function inputIdentifier(value: string) {
  if (!identifier.test(value)) throw new Error("MEMBER_NATIVE_INPUT_INVALID");
  return value;
}

function key(value: string) {
  if (!idempotency.test(value)) throw new Error("MEMBER_NATIVE_IDEMPOTENCY_INVALID");
  return value;
}

function single(result: Awaited<ReturnType<MemberNativeBookingQuery>>) {
  if (result.rowCount !== 1 || result.rows.length !== 1 ||
      !result.rows[0] || typeof result.rows[0] !== "object" || Array.isArray(result.rows[0])) {
    throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  }
  const payload = result.rows[0].payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  }
  return payload as Record<string, unknown>;
}

function boundRow(row: Record<string, unknown>, actor: MemberNativeBookingActor) {
  if (row.account_id !== actor.accountId || row.source_auth_identity_id !== actor.sourceIdentityId) {
    throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  }
  return row;
}

function text(row: Record<string, unknown>, field: string) {
  const value = row[field];
  if (typeof value !== "string" || !value || value.trim() !== value ||
      value.length > 512 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  }
  return value;
}

function amount(row: Record<string, unknown>) {
  const value = row.unit_amount_minor;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  }
  return value;
}

function currency(row: Record<string, unknown>) {
  const value = text(row, "currency_code");
  if (!currencies.has(value)) throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  return value;
}

/** SQL owns capacity, quote/price validity, customer/store scope and idempotency. */
export async function issueOwnMemberTestHold(
  query: MemberNativeBookingQuery,
  actor: MemberNativeBookingActor,
  input: Readonly<{inventoryKey: string; idempotencyKey: string}>,
) {
  actorAccount(actor);
  const inventoryKey = inputIdentifier(input.inventoryKey);
  const row = boundRow(single(await query(MEMBER_NATIVE_HOLD_SQL, [
    actor.issuer, actor.subject, actor.clientIdSha256, inventoryKey, key(input.idempotencyKey),
  ])), actor);
  const expiresAt = row.hold_expires_at instanceof Date
    ? row.hold_expires_at.toISOString() : text(row, "hold_expires_at");
  if (row.evidence_class !== "test_only" || row.provider_confirmed !== false ||
      text(row, "inventory_key") !== inventoryKey ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(expiresAt) ||
      !Number.isFinite(Date.parse(expiresAt))) {
    throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  }
  const serviceDate = row.service_date instanceof Date
    ? row.service_date.toISOString().slice(0, 10) : text(row, "service_date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !Number.isFinite(Date.parse(serviceDate)) ||
      new Date(serviceDate).toISOString().slice(0,10)!==serviceDate) throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  return Object.freeze({
    holdReference: text(row, "hold_public_ref"), expiresAt, inventoryKey,
    holdState:Date.parse(expiresAt)>Date.now()?"held" as const:"expired" as const,
    propertyCode: text(row, "property_code"), accommodationCode: text(row, "accommodation_code"),
    serviceDate, currency: currency(row), unitAmountMinor: amount(row),
    evidenceClass: "test_only" as const, providerConfirmed: false as const,
    bookingConfirmed: false as const, liveMoneyAllowed: false as const,
  });
}

/** A prepared/unknown cart is not an acknowledged Vendure order or booking. */
export async function prepareOwnMemberHoldBoundCart(
  query: MemberNativeBookingQuery,
  actor: MemberNativeBookingActor,
  input: Readonly<{holdReference: string; idempotencyKey: string}>,
) {
  actorAccount(actor);
  const row = boundRow(single(await query(MEMBER_NATIVE_CART_SQL, [
    actor.issuer, actor.subject, actor.clientIdSha256,
    inputIdentifier(input.holdReference), key(input.idempotencyKey),
  ])), actor);
  const state = text(row, "provider_state");
  // Preserve the native state as data; it never grants order/booking authority.
  const scopeFields = ["deployment_cell_id", "operator_tenant_id", "operator_legal_entity_id",
    "store_id", "store_operator_assignment_id", "binding_id", "vendure_seller_id",
    "vendure_channel_id", "primary_stock_location_id"] as const;
  const scope = Object.fromEntries(scopeFields.map(field => [field, text(row, field)]));
  for (const field of ["assignment_version", "binding_version", "seller_binding_version"] as const) {
    if (typeof row[field] !== "number" || !Number.isSafeInteger(row[field]) || Number(row[field]) < 1) {
      throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
    }
  }
  const availabilitySnapshotSha256 = text(row, "availability_snapshot_sha256");
  const targetSetSha256 = text(row, "target_set_sha256");
  if (![availabilitySnapshotSha256, targetSetSha256].every(value => /^[a-f0-9]{64}$/.test(value))) {
    throw new Error("MEMBER_NATIVE_RECEIPT_INVALID");
  }
  return Object.freeze({
    cartId: text(row, "cart_id"), providerState: state,
    /** Server-internal binding only; never serialize raw variant/channel authority to the browser. */
    serverBinding: Object.freeze({scope, variantId: text(row, "vendure_variant_id"),
      assignmentVersion: row.assignment_version, bindingVersion: row.binding_version,
      sellerBindingVersion: row.seller_binding_version, availabilitySnapshotSha256, targetSetSha256}),
    currency: currency(row), unitAmountMinor: amount(row),
    bookingConfirmed: false as const, liveMoneyAllowed: false as const,
  });
}
