export const STOREFRONT_BFF_CONTRACT_VERSION = "ncrv2-121.v3" as const;
export const STOREFRONT_VERTICAL_ROOTS =
  ["coffee", "retail", "gym", "clubs"] as const;

export type StorefrontVerticalRoot =
  (typeof STOREFRONT_VERTICAL_ROOTS)[number];

export type StorefrontBffRequest = Readonly<{
  verticalRoot: StorefrontVerticalRoot;
  storeSlug: string;
  operation:
    | "catalog.read"
    | "cart.read"
    | "cart.add"
    | "cart.adjust"
    | "cart.remove"
    | "checkout.preflight";
  expectedCartVersion?: number;
  productVariantReference?: string;
  orderLineReference?: string;
  quantity?: number;
  idempotencyKey?: string;
  sellerChangeWarningAcknowledged?: true;
}>;

export const STOREFRONT_BROWSER_FORBIDDEN_KEYS = [
  "operatorId",
  "partnerTenantId",
  "operatorLegalEntityId",
  "vendureSellerId",
  "vendureChannelId",
  "vendureChannelToken",
  "stripeConnectedAccountId",
  "erpSiteId",
  "erpCompanyId",
  "erpWarehouseId",
  "adminToken",
  "adminSecret",
] as const;

const STOREFRONT_BROWSER_ALLOWED_KEYS = new Set([
  "verticalRoot",
  "storeSlug",
  "operation",
  "expectedCartVersion",
  "productVariantReference",
  "orderLineReference",
  "quantity",
  "idempotencyKey",
  "sellerChangeWarningAcknowledged",
]);

export type StorefrontBffSafeResponse = Readonly<{
  contractVersion: typeof STOREFRONT_BFF_CONTRACT_VERSION;
  state:
    | "ready"
    | "empty"
    | "expired"
    | "rebuild_required"
    | "denied"
    | "conflict"
    | "unknown"
    | "failed";
  store: { slug: string; displayName: string };
  cartVersion?: number;
  receiptId?: string;
  recovery:
    | "none"
    | "select_store"
    | "reload_cart"
    | "reconcile"
    | "retry_after_backoff"
    | "add_item_to_replace_expired_cart"
    | "expired_cart_replaced"
    | "acknowledge_seller_change_to_rebuild_cart"
    | "seller_change_cart_rebuilt";
  data: Readonly<Record<string, unknown>>;
}>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMAND_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const PROVIDER_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;

export function parseStorefrontBffRequest(
  raw: Readonly<Record<string, unknown>>,
): StorefrontBffRequest {
  for (const key of STOREFRONT_BROWSER_FORBIDDEN_KEYS) {
    if (key in raw) throw new Error("STOREFRONT_BROWSER_AUTHORITY_DENIED");
  }
  for (const key of Object.keys(raw)) {
    if (!STOREFRONT_BROWSER_ALLOWED_KEYS.has(key)) {
      throw new Error("STOREFRONT_BROWSER_FIELD_DENIED");
    }
  }
  if (
    typeof raw.verticalRoot !== "string" ||
    !STOREFRONT_VERTICAL_ROOTS.includes(
      raw.verticalRoot as StorefrontVerticalRoot,
    ) ||
    typeof raw.storeSlug !== "string" ||
    !SLUG.test(raw.storeSlug)
  ) throw new Error("STOREFRONT_CONTEXT_INVALID");
  const operations = [
    "catalog.read", "cart.read", "cart.add", "cart.adjust",
    "cart.remove", "checkout.preflight",
  ] as const;
  if (
    typeof raw.operation !== "string" ||
    !operations.includes(raw.operation as (typeof operations)[number])
  ) throw new Error("STOREFRONT_OPERATION_INVALID");
  const command = !["catalog.read", "cart.read"].includes(raw.operation);
  if (
    command &&
    (typeof raw.idempotencyKey !== "string" ||
      !COMMAND_ID.test(raw.idempotencyKey))
  ) throw new Error("STOREFRONT_IDEMPOTENCY_REQUIRED");
  if (
    raw.expectedCartVersion !== undefined &&
    (!Number.isSafeInteger(raw.expectedCartVersion) ||
      Number(raw.expectedCartVersion) < 1)
  ) throw new Error("STOREFRONT_CART_VERSION_INVALID");
  if (
    raw.productVariantReference !== undefined &&
    (typeof raw.productVariantReference !== "string" ||
      !PROVIDER_REFERENCE.test(raw.productVariantReference))
  ) throw new Error("STOREFRONT_PRODUCT_VARIANT_REFERENCE_INVALID");
  if (
    raw.orderLineReference !== undefined &&
    (typeof raw.orderLineReference !== "string" ||
      !PROVIDER_REFERENCE.test(raw.orderLineReference))
  ) throw new Error("STOREFRONT_ORDER_LINE_REFERENCE_INVALID");
  if (
    raw.quantity !== undefined &&
    (!Number.isSafeInteger(raw.quantity) || Number(raw.quantity) < 1 ||
      Number(raw.quantity) > 1_000)
  ) throw new Error("STOREFRONT_QUANTITY_INVALID");

  if (raw.sellerChangeWarningAcknowledged !== undefined &&
      raw.sellerChangeWarningAcknowledged !== true) {
    throw new Error("STOREFRONT_SELLER_CHANGE_ACK_INVALID");
  }

  const has = (key: keyof StorefrontBffRequest) => raw[key] !== undefined;
  const operationFieldsValid =
    (raw.operation === "catalog.read" &&
      !has("expectedCartVersion") && !has("productVariantReference") &&
      !has("orderLineReference") && !has("quantity") &&
      !has("idempotencyKey") && !has("sellerChangeWarningAcknowledged")) ||
    (raw.operation === "cart.read" &&
      !has("expectedCartVersion") && !has("productVariantReference") &&
      !has("orderLineReference") && !has("quantity") &&
      !has("idempotencyKey") && !has("sellerChangeWarningAcknowledged")) ||
    (raw.operation === "cart.add" &&
      has("productVariantReference") && has("quantity") &&
      has("idempotencyKey") && !has("orderLineReference")) ||
    (raw.operation === "cart.adjust" &&
      has("expectedCartVersion") && has("orderLineReference") &&
      has("quantity") && has("idempotencyKey") &&
      !has("productVariantReference") &&
      !has("sellerChangeWarningAcknowledged")) ||
    (raw.operation === "cart.remove" &&
      has("expectedCartVersion") && has("orderLineReference") &&
      has("idempotencyKey") && !has("productVariantReference") &&
      !has("quantity") && !has("sellerChangeWarningAcknowledged")) ||
    (raw.operation === "checkout.preflight" &&
      has("expectedCartVersion") && has("idempotencyKey") &&
      !has("productVariantReference") && !has("orderLineReference") &&
      !has("quantity") && !has("sellerChangeWarningAcknowledged"));
  if (!operationFieldsValid) {
    throw new Error("STOREFRONT_OPERATION_FIELDS_INVALID");
  }

  return {
    verticalRoot: raw.verticalRoot as StorefrontVerticalRoot,
    storeSlug: raw.storeSlug,
    operation: raw.operation as StorefrontBffRequest["operation"],
    ...(raw.expectedCartVersion === undefined
      ? {}
      : { expectedCartVersion: raw.expectedCartVersion as number }),
    ...(raw.productVariantReference === undefined
      ? {}
      : { productVariantReference: raw.productVariantReference as string }),
    ...(raw.orderLineReference === undefined
      ? {}
      : { orderLineReference: raw.orderLineReference as string }),
    ...(raw.quantity === undefined
      ? {}
      : { quantity: raw.quantity as number }),
    ...(raw.idempotencyKey === undefined
      ? {}
      : { idempotencyKey: raw.idempotencyKey as string }),
    ...(raw.sellerChangeWarningAcknowledged === true
      ? { sellerChangeWarningAcknowledged: true as const }
      : {}),
  };
}

export const storefrontBffAuthority = {
  authentication: "Auth0",
  authorization: "CRAYS Core",
  contextResolution: "server-commerce-context-resolver",
  providerExecution: "server-bound-vendure-adapter",
  browserCallsVendureDirectly: false,
  browserReceivesProviderAuthority: false,
  fallbackSellerOrProvider: false,
} as const;
