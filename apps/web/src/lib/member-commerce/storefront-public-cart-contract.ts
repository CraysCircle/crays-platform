import {
  STOREFRONT_BFF_CONTRACT_VERSION,
  STOREFRONT_BROWSER_FORBIDDEN_KEYS,
} from "./storefront-bff-contract";

export type StorefrontPublicCartLine = Readonly<{
  orderLineReference: string;
  quantity: number;
}>;

export type StorefrontPublicCart = Readonly<{
  state: "ready" | "empty" | "expired" | "rebuild_required";
  store: Readonly<{ slug: string; displayName: string }>;
  cartVersion?: number;
  receiptId?: string;
  recovery:
    | "none"
    | "add_item_to_replace_expired_cart"
    | "expired_cart_replaced"
    | "acknowledge_seller_change_to_rebuild_cart"
    | "seller_change_cart_rebuilt";
  lines: readonly StorefrontPublicCartLine[];
}>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const RECEIPT = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const STATES = new Set([
  "ready", "empty", "expired", "rebuild_required",
]);
const RECOVERIES = new Set([
  "none",
  "add_item_to_replace_expired_cart",
  "expired_cart_replaced",
  "acknowledge_seller_change_to_rebuild_cart",
  "seller_change_cart_rebuilt",
]);
const forbidden = new Set<string>(STOREFRONT_BROWSER_FORBIDDEN_KEYS);

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function noProviderAuthority(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) noProviderAuthority(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) {
      throw new Error("STOREFRONT_PUBLIC_CART_AUTHORITY_LEAK");
    }
    noProviderAuthority(child);
  }
}

function text(value: unknown, maximum: number, code: string): string {
  if (typeof value !== "string" || !value.trim() ||
      value.length > maximum ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new Error(code);
  }
  return value;
}

export function parseStorefrontPublicCart(
  value: unknown,
  expectedStoreSlug: string,
): StorefrontPublicCart {
  noProviderAuthority(value);
  if (!SLUG.test(expectedStoreSlug)) {
    throw new Error("STOREFRONT_PUBLIC_CART_EXPECTED_STORE_INVALID");
  }
  const raw = record(value, "STOREFRONT_PUBLIC_CART_INVALID");
  if (raw.contractVersion !== STOREFRONT_BFF_CONTRACT_VERSION ||
      typeof raw.state !== "string" || !STATES.has(raw.state) ||
      typeof raw.recovery !== "string" || !RECOVERIES.has(raw.recovery)) {
    throw new Error("STOREFRONT_PUBLIC_CART_CONTRACT_INVALID");
  }
  const store = record(raw.store, "STOREFRONT_PUBLIC_CART_STORE_INVALID");
  if (store.slug !== expectedStoreSlug) {
    throw new Error("STOREFRONT_PUBLIC_CART_STORE_MISMATCH");
  }
  const data = record(raw.data, "STOREFRONT_PUBLIC_CART_DATA_INVALID");
  if (!Array.isArray(data.lines) || data.lines.length > 100) {
    throw new Error("STOREFRONT_PUBLIC_CART_LINES_INVALID");
  }
  const lines = Object.freeze(data.lines.map((candidate) => {
    const line = record(candidate, "STOREFRONT_PUBLIC_CART_LINE_INVALID");
    if (typeof line.orderLineReference !== "string" ||
        !REFERENCE.test(line.orderLineReference) ||
        !Number.isSafeInteger(line.quantity) ||
        Number(line.quantity) < 1 || Number(line.quantity) > 1_000) {
      throw new Error("STOREFRONT_PUBLIC_CART_LINE_INVALID");
    }
    return Object.freeze({
      orderLineReference: line.orderLineReference,
      quantity: line.quantity as number,
    });
  }));
  if (new Set(lines.map((line) => line.orderLineReference)).size !==
      lines.length) {
    throw new Error("STOREFRONT_PUBLIC_CART_LINES_DUPLICATE");
  }
  const cartVersion = raw.cartVersion;
  if (["ready", "rebuild_required"].includes(raw.state as string) &&
      (!Number.isSafeInteger(cartVersion) || Number(cartVersion) < 1)) {
    throw new Error("STOREFRONT_PUBLIC_CART_VERSION_INVALID");
  }
  if (["empty", "expired"].includes(raw.state as string) &&
      cartVersion !== undefined) {
    throw new Error("STOREFRONT_PUBLIC_CART_VERSION_INVALID");
  }
  const recoveryMatchesState =
    (raw.state === "ready" && [
      "none",
      "expired_cart_replaced",
      "seller_change_cart_rebuilt",
    ].includes(raw.recovery as string)) ||
    (raw.state === "empty" && raw.recovery === "none") ||
    (raw.state === "expired" &&
      raw.recovery === "add_item_to_replace_expired_cart") ||
    (raw.state === "rebuild_required" &&
      raw.recovery ===
        "acknowledge_seller_change_to_rebuild_cart");
  if (!recoveryMatchesState) {
    throw new Error("STOREFRONT_PUBLIC_CART_STATE_RECOVERY_MISMATCH");
  }
  if (raw.state !== "ready" && lines.length !== 0) {
    throw new Error("STOREFRONT_PUBLIC_CART_STATE_LINES_MISMATCH");
  }
  if (raw.receiptId !== undefined &&
      (typeof raw.receiptId !== "string" || !RECEIPT.test(raw.receiptId))) {
    throw new Error("STOREFRONT_PUBLIC_CART_RECEIPT_INVALID");
  }
  return Object.freeze({
    state: raw.state as StorefrontPublicCart["state"],
    store: Object.freeze({
      slug: store.slug as string,
      displayName: text(store.displayName, 200,
        "STOREFRONT_PUBLIC_CART_STORE_INVALID"),
    }),
    ...(cartVersion === undefined ? {} : { cartVersion: cartVersion as number }),
    ...(raw.receiptId === undefined
      ? {}
      : { receiptId: raw.receiptId as string }),
    recovery: raw.recovery as StorefrontPublicCart["recovery"],
    lines,
  });
}
