"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  parseStorefrontPublicCatalog,
  type StorefrontPublicCatalog as Catalog,
  type StorefrontPublicCatalogItem as Item,
} from "@/lib/member-commerce/storefront-public-catalog-contract";
import {
  parseStorefrontPublicCart,
  type StorefrontPublicCart as Cart,
} from "@/lib/member-commerce/storefront-public-cart-contract";

type VerticalRoot = "coffee" | "retail" | "gym" | "clubs";
type View =
  | Readonly<{ state: "loading" }>
  | Readonly<{ state: "ready" | "empty"; page: Catalog }>
  | Readonly<{ state: "error"; message: string }>;
type CartView =
  | Readonly<{ state: "checking" | "idle" }>
  | Readonly<{
      state: "pending";
      operation: "add" | "adjust" | "remove";
      targetReference: string;
    }>
  | Readonly<{ state: "ready"; cart: Cart }>
  | Readonly<{
      state: "error";
      message: string;
      signInRequired: boolean;
      canReload: boolean;
    }>;
type CheckoutView =
  | Readonly<{ state: "idle" | "pending" }>
  | Readonly<{ state: "ready"; cartVersion: number;
      checkoutPreflightReference: string; orderIdempotencyKey: string }>
  | Readonly<{
      state: "error";
      message: string;
      signInRequired: boolean;
      canReload: boolean;
    }>;

const verticals = new Set<VerticalRoot>(["coffee", "retail", "gym", "clubs"]);
const labels: Record<VerticalRoot, string> = { coffee: "Coffee", retail: "Retail", gym: "Gym", clubs: "Clubs" };
const availability: Record<Item["availability"], string> = {
  available: "Available",
  low: "Limited availability",
  unavailable: "Currently unavailable",
  unknown: "Availability is being reconciled",
};
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type OrderView =
  | Readonly<{ state: "idle" | "pending" }>
  | Readonly<{ state: "pending_provider"; orderReference: string; replayed: boolean }>
  | Readonly<{ state: "error"; message: string; canReload: boolean }>;


function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export default function StorefrontPage({
  params,
}: {
  params: Promise<{ verticalRoot: string; storeSlug: string }>;
}) {
  const route = use(params);
  const verticalRoot = verticals.has(route.verticalRoot as VerticalRoot)
    ? route.verticalRoot as VerticalRoot
    : null;
  const storeSlug = slugPattern.test(route.storeSlug) ? route.storeSlug : null;
  const [view, setView] = useState<View>({ state: "loading" });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [cartView, setCartView] = useState<CartView>({ state: "checking" });
  const [checkoutView, setCheckoutView] =
    useState<CheckoutView>({ state: "idle" });
  const [orderView, setOrderView] = useState<OrderView>({ state: "idle" });
  const [deliveryCountryCode, setDeliveryCountryCode] = useState("DE");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [shippingMethod, setShippingMethod] = useState("standard");

  useEffect(() => {
    const controller = new AbortController();
    if (!verticalRoot || !storeSlug) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) {
          setView({ state: "error", message: "This Store address is invalid. Select a Store and try again." });
        }
      });
      return () => controller.abort();
    }

    void fetch("/api/crays/storefront/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ verticalRoot, storeSlug, take: 24 }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error("CATALOG_READ_FAILED");
        return parseStorefrontPublicCatalog(payload);
      })
      .then((payload) => {
        setView(payload.items.length
          ? { state: "ready", page: payload }
          : { state: "empty", page: payload });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setView({
          state: "error",
          message: "The Store catalog is temporarily unavailable. No substitute catalog is shown.",
        });
      });

    return () => controller.abort();
  }, [reloadVersion, storeSlug, verticalRoot]);

  useEffect(() => {
    const controller = new AbortController();
    if (!verticalRoot || !storeSlug) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) setCartView({ state: "idle" });
      });
      return () => controller.abort();
    }

    queueMicrotask(() => {
      if (!controller.signal.aborted) setOrderView({ state: "idle" });
      if (!controller.signal.aborted) setCheckoutView({ state: "idle" });
      if (!controller.signal.aborted) setCartView({ state: "checking" });
    });
    void fetch("/api/crays/storefront/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ verticalRoot, storeSlug, operation: "cart.read" }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (response.status === 401) return null;
        if (!response.ok) {
          throw new Error(response.status === 403
            ? "CART_RELATIONSHIP_DENIED"
            : "CART_READ_FAILED");
        }
        return parseStorefrontPublicCart(payload, storeSlug);
      })
      .then((cart) => {
        if (controller.signal.aborted) return;
        setCartView(cart ? { state: "ready", cart } : { state: "idle" });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCartView({
          state: "error",
          message: error instanceof Error &&
            error.message === "CART_RELATIONSHIP_DENIED"
            ? "This account has no active customer relationship for this Store."
            : "The saved cart could not be verified. No substitute cart is shown.",
          signInRequired: false,
          canReload: !(error instanceof Error &&
            error.message === "CART_RELATIONSHIP_DENIED"),
        });
      });

    return () => controller.abort();
  }, [reloadVersion, storeSlug, verticalRoot]);

  const page = view.state === "ready" || view.state === "empty" ? view.page : null;
  const heading = page?.store.displayName ?? (verticalRoot ? `${labels[verticalRoot]} Store` : "Store unavailable");
  const observedAt = useMemo(() => {
    if (view.state !== "ready") return null;
    const times = view.page.items.map((item) => Date.parse(item.availabilityObservedAt)).filter(Number.isFinite);
    return times.length
      ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })
        .format(new Date(Math.max(...times)))
      : null;
  }, [view]);

  const returnTo = verticalRoot && storeSlug
    ? `/storefront/${verticalRoot}/${storeSlug}`
    : "/";
  const loginHref = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

  async function addToCart(item: Item) {
    if (!verticalRoot || !storeSlug ||
        !["available", "low"].includes(item.availability)) return;
    const rebuild = cartView.state === "ready" &&
      cartView.cart.state === "rebuild_required"
      ? cartView.cart
      : null;
    setCheckoutView({ state: "idle" });
    setOrderView({ state: "idle" });
    setCartView({
      state: "pending",
      operation: "add",
      targetReference: item.productVariantReference,
    });
    try {
      const response = await fetch("/api/crays/storefront/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          verticalRoot,
          storeSlug,
          operation: "cart.add",
          productVariantReference: item.productVariantReference,
          quantity: 1,
          idempotencyKey: `cart:add:${verticalRoot}:${crypto.randomUUID()}`,
          ...(rebuild ? {
            expectedCartVersion: rebuild.cartVersion,
            sellerChangeWarningAcknowledged: true,
          } : {}),
        }),
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const signInRequired = response.status === 401;
        const message = signInRequired
          ? "Sign in with your CRAYS account to add this item."
          : response.status === 403
            ? "This account has no active customer relationship for this Store."
            : response.status === 409
              ? "The cart changed. Reload it before trying again."
              : "The cart is temporarily unavailable. No order was created.";
        setCartView({
          state: "error",
          message,
          signInRequired,
          canReload: !signInRequired && response.status !== 403,
        });
        return;
      }
      const cart = parseStorefrontPublicCart(payload, storeSlug);
      setCartView({ state: "ready", cart });
    } catch {
      setCartView({
        state: "error",
        message: "The cart response could not be verified. No substitute cart is shown.",
        signInRequired: false,
        canReload: true,
      });
    }
  }

  async function mutateCartLine(
    line: Cart["lines"][number],
    operation: "adjust" | "remove",
    quantity?: number,
  ) {
    if (!verticalRoot || !storeSlug || cartView.state !== "ready" ||
        cartView.cart.state !== "ready") return;
    const cartVersion = cartView.cart.cartVersion;
    if (typeof cartVersion !== "number" ||
        !Number.isSafeInteger(cartVersion) || cartVersion < 1) return;
    if (operation === "adjust" &&
        (typeof quantity !== "number" || !Number.isSafeInteger(quantity) ||
          quantity < 1 || quantity > 1_000)) return;

    setCheckoutView({ state: "idle" });
    setOrderView({ state: "idle" });
    setCartView({
      state: "pending",
      operation,
      targetReference: line.orderLineReference,
    });
    try {
      const response = await fetch("/api/crays/storefront/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          verticalRoot,
          storeSlug,
          operation: operation === "adjust" ? "cart.adjust" : "cart.remove",
          expectedCartVersion: cartVersion,
          orderLineReference: line.orderLineReference,
          ...(operation === "adjust" ? { quantity } : {}),
          idempotencyKey:
            `cart:${operation}:${verticalRoot}:${crypto.randomUUID()}`,
        }),
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const signInRequired = response.status === 401;
        const message = signInRequired
          ? "Sign in with your CRAYS account to update this cart."
          : response.status === 403
            ? "This account has no active customer relationship for this Store."
            : response.status === 409
              ? "The cart changed in another session. Reload it before trying again."
              : [404, 422].includes(response.status)
                ? "This cart line is no longer available. Reload the cart."
                : "The cart update is temporarily unavailable. No change was assumed.";
        setCartView({
          state: "error",
          message,
          signInRequired,
          canReload: !signInRequired && response.status !== 403,
        });
        return;
      }
      const cart = parseStorefrontPublicCart(payload, storeSlug);
      setCartView({ state: "ready", cart });
    } catch {
      setCartView({
        state: "error",
        message: "The cart update response could not be verified. Reload before continuing.",
        signInRequired: false,
        canReload: true,
      });
    }
  }

  async function runCheckoutPreflight() {
    if (!verticalRoot || !storeSlug || cartView.state !== "ready" ||
        cartView.cart.state !== "ready" ||
        cartView.cart.lines.length === 0) return;
    const expectedCartVersion = cartView.cart.cartVersion;
    if (typeof expectedCartVersion !== "number" ||
        !Number.isSafeInteger(expectedCartVersion) ||
        expectedCartVersion < 1) return;
    if (!/^[A-Z]{2}$/.test(deliveryCountryCode) ||
        !/^[A-Za-z0-9][A-Za-z0-9 -]{0,19}$/.test(deliveryPostalCode) ||
        !/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/.test(shippingMethod)) {
      setCheckoutView({
        state: "error",
        message: "Enter a valid country, postal code and delivery method before checking the cart.",
        signInRequired: false,
        canReload: false,
      });
      setOrderView({ state: "idle" });
      return;
    }

    setCheckoutView({ state: "pending" });
    setOrderView({ state: "idle" });
    try {
      const response = await fetch("/api/crays/storefront/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          verticalRoot,
          storeSlug,
          operation: "checkout.persisted-preflight",
          expectedCartVersion,
          deliveryCountryCode,
          deliveryPostalCode,
          shippingMethod,
          idempotencyKey:
            `checkout:persisted-preflight:${verticalRoot}:${crypto.randomUUID()}`,
        }),
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const signInRequired = response.status === 401;
        const message = signInRequired
          ? "Sign in with your CRAYS account to check this cart."
          : response.status === 403
            ? "This account has no active customer relationship for this Store."
            : response.status === 409
              ? "The cart changed in another session. Reload it before checking again."
              : response.status === 422
                ? "This cart is empty or no longer eligible. Reload the cart."
                : "The cart-state check is temporarily unavailable. No price, order or payment was finalized.";
        setCheckoutView({
          state: "error",
          message,
          signInRequired,
          canReload: !signInRequired && response.status !== 403,
        });
        return;
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("STOREFRONT_CHECKOUT_PREFLIGHT_RESPONSE_INVALID");
      }
      const checked = payload as Record<string, unknown>;
      if (checked.state !== "ready_for_order" ||
          checked.cartVersion !== expectedCartVersion ||
          typeof checked.checkoutPreflightReference !== "string") {
        throw new Error("STOREFRONT_CHECKOUT_PREFLIGHT_RESPONSE_INVALID");
      }
      setCheckoutView({
        state: "ready",
        cartVersion: expectedCartVersion,
        checkoutPreflightReference: checked.checkoutPreflightReference,
        orderIdempotencyKey: `order:create:${verticalRoot}:${crypto.randomUUID()}`,
      });
    } catch {
      setCheckoutView({
        state: "error",
        message: "The cart-state response could not be verified. No price, order or payment was finalized.",
        signInRequired: false,
        canReload: true,
      });
    }
  }

  async function createOrder() {
    if (!verticalRoot || !storeSlug || checkoutView.state !== "ready") return;
    setOrderView({ state: "pending" });
    try {
      const response = await fetch("/api/crays/storefront/order", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({verticalRoot,storeSlug,operation:"order.create",
          expectedCartVersion:checkoutView.cartVersion,
          checkoutPreflightReference:checkoutView.checkoutPreflightReference,
          idempotencyKey:checkoutView.orderIdempotencyKey}),
        cache: "no-store",
      });
      const payload:unknown=await response.json();
      if(!response.ok){
        const message=response.status===409
          ?"The cart or checkout check changed. Reload before ordering."
          :response.status===422
            ?"This checkout is no longer ready. Check the cart again."
            :"The order could not be safely recorded. No payment was started.";
        setOrderView({state:"error",message,canReload:[409,422].includes(response.status)});
        return;
      }
      if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new Error();
      const result=payload as Record<string,unknown>;
      if(result.state!=="pending_provider"||result.recovery!=="reconcile"||
        typeof result.orderReference!=="string"||!result.data||
        typeof result.data!=="object"||Array.isArray(result.data))throw new Error();
      setOrderView({state:"pending_provider",orderReference:result.orderReference,
        replayed:(result.data as Record<string,unknown>).replayed===true});
    }catch{
      setOrderView({state:"error",
        message:"The order response could not be verified. No payment was started.",
        canReload:false});
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--line)] bg-[var(--rail)] text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
              CRAYS {verticalRoot ? labels[verticalRoot] : "Storefront"}
            </p>
            <p className="mt-1 text-lg font-semibold">Selected Store catalog</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[8px] border border-white/25 px-3 py-2 text-xs font-semibold">

              Server-resolved Store
            </span>
            <button
              type="button"
              onClick={() => {
                setView({ state: "loading" });
                setCheckoutView({ state: "idle" });
                setOrderView({ state: "idle" });
                setReloadVersion((version) => version + 1);
              }}
              className="min-h-11 rounded-[8px] border border-white/40 bg-white px-4 text-sm font-semibold text-[var(--rail)]"
            >
              Refresh catalog
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section aria-labelledby="storefront-title" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Current selection</p>
            <h1 id="storefront-title" className="mt-2 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">{heading}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
              Prices, currency and availability come from the exact Store context.
              CRAYS never substitutes another operator&apos;s catalog.
            </p>
          </div>
          {page ? (
            <aside aria-label="Seller disclosure" className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Sold by</p>
              <p className="mt-2 font-semibold">{page.seller.displayName}</p>
              <p className="mt-1 text-sm leading-5 text-[var(--ink-muted)]">{page.seller.legalName}</p>
              <p className="mt-3 text-xs text-[var(--ink-muted)]">
                Currency <strong className="text-[var(--foreground)]">{page.currency}</strong>
              </p>
            </aside>
          ) : null}
        </section>

        {cartView.state !== "idle" ? (
          <section
            aria-live="polite"
            aria-busy={cartView.state === "checking" ||
              cartView.state === "pending"}
            className="mt-6 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Your cart</p>
            {cartView.state === "checking" ? (
              <p className="mt-2 font-semibold">Checking for your saved cart...</p>
            ) : null}
            {cartView.state === "pending" ? (
              <p className="mt-2 font-semibold">
                {cartView.operation === "add"
                  ? "Adding the selected item..."
                  : cartView.operation === "adjust"
                    ? "Updating the item quantity..."
                    : "Removing the selected item..."}
              </p>
            ) : null}
            {cartView.state === "error" ? (
              <div role="alert" className="mt-2">
                <p className="font-semibold">{cartView.message}</p>
                {cartView.signInRequired ? (
                  <a className="mt-4 inline-flex min-h-11 items-center rounded-[8px] bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white" href={loginHref}>
                    Sign in to continue
                  </a>
                ) : null}
                {cartView.canReload ? (
                  <button
                    type="button"
                    onClick={() => {
                      setView({ state: "loading" });
                      setCartView({ state: "checking" });
                      setCheckoutView({ state: "idle" });
                      setOrderView({ state: "idle" });
                      setReloadVersion((version) => version + 1);
                    }}
                    className="mt-4 min-h-11 rounded-[8px] bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white"
                  >
                    Reload Store and cart
                  </button>
                ) : null}
              </div>
            ) : null}
            {cartView.state === "ready" ? (
              cartView.cart.state === "ready" ? (
                <div className="mt-2">
                  <p className="font-semibold">
                    {cartView.cart.lines.reduce((total, line) => total + line.quantity, 0)} item(s) in {cartView.cart.store.displayName}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    Cart version {cartView.cart.cartVersion}. The Seller remains bound to this Store.
                  </p>
                  {cartView.cart.lines.length === 0 ? (
                    <p className="mt-4 font-semibold">This cart currently has no items.</p>
                  ) : (
                    <ul className="mt-4 grid list-none gap-3 p-0">
                      {cartView.cart.lines.map((line) => {
                        const catalogItem = page?.items.find(
                          (item) => item.productVariantReference === line.orderLineReference,
                        );
                        const itemName = catalogItem?.name ?? "Cart item";
                        return (
                          <li
                            key={line.orderLineReference}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-3"
                          >
                            <div>
                              <p className="font-semibold">{itemName}</p>
                              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                                Quantity {line.quantity}
                                {catalogItem
                                  ? ` · Current catalog price ${money(catalogItem.priceMinor, page?.currency ?? "EUR")} each`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Decrease ${itemName} quantity`}
                                disabled={checkoutView.state === "pending" ||
                                  line.quantity <= 1}
                                onClick={() => void mutateCartLine(line, "adjust", line.quantity - 1)}
                                className="min-h-11 min-w-11 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                −
                              </button>
                              <button
                                type="button"
                                aria-label={`Increase ${itemName} quantity`}
                                disabled={checkoutView.state === "pending" ||
                                  line.quantity >= 1_000}
                                onClick={() => void mutateCartLine(line, "adjust", line.quantity + 1)}
                                className="min-h-11 min-w-11 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                disabled={checkoutView.state === "pending"}
                                aria-label={`Remove ${itemName} from cart`}
                                onClick={() => void mutateCartLine(line, "remove")}
                                className="min-h-11 rounded-[8px] border border-[var(--rose)] bg-[var(--surface)] px-4 text-sm font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {cartView.cart.recovery === "expired_cart_replaced" ? (
                    <p className="mt-2 text-sm text-[var(--ink-muted)]">
                      Your expired cart was replaced before this item was added.
                    </p>
                  ) : cartView.cart.recovery === "seller_change_cart_rebuilt" ? (
                    <p className="mt-2 text-sm text-[var(--ink-muted)]">
                      Your cart was rebuilt for this Store and Seller before the item was added.
                    </p>
                  ) : null}
                  {cartView.cart.lines.length > 0 ? (
                    <div className="mt-5 border-t border-[var(--line)] pt-5">
                      <div className="mb-4 grid gap-3 sm:grid-cols-3">
                        <label className="text-sm font-semibold">
                          Delivery country
                          <input aria-label="Delivery country code" value={deliveryCountryCode}
                            maxLength={2}
                            onChange={(event) => {
                              setDeliveryCountryCode(event.target.value.toUpperCase());
                              setCheckoutView({state:"idle"});setOrderView({state:"idle"});
                            }}
                            className="mt-1 min-h-11 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3"
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Delivery postal code
                          <input aria-label="Delivery postal code" value={deliveryPostalCode}
                            maxLength={20}
                            onChange={(event) => {
                              setDeliveryPostalCode(event.target.value);
                              setCheckoutView({state:"idle"});setOrderView({state:"idle"});
                            }}
                            className="mt-1 min-h-11 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3"
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Shipping method
                          <input aria-label="Shipping method" value={shippingMethod}
                            maxLength={200}
                            onChange={(event) => {
                              setShippingMethod(event.target.value);
                              setCheckoutView({state:"idle"});setOrderView({state:"idle"});
                            }}
                            className="mt-1 min-h-11 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={checkoutView.state === "pending"}
                        onClick={() => void runCheckoutPreflight()}
                        className="min-h-11 rounded-[8px] bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {checkoutView.state === "pending"
                          ? "Freezing current price and tax..."
                          : "Verify price, tax and delivery"}
                      </button>
                      {checkoutView.state === "ready" ? (
                        <div role="status" className="mt-3">
                          <p className="font-semibold">
                            Price and tax authority frozen for cart version {checkoutView.cartVersion}.
                          </p>
                          <p className="mt-1 text-sm text-[var(--ink-muted)]">
                            No payment has started. You can now record the order for provider reconciliation.
                          </p>
                          <button type="button"
                            disabled={orderView.state==="pending"}
                            onClick={()=>void createOrder()}
                            className="mt-3 min-h-11 rounded-[8px] bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white disabled:opacity-50">
                            {orderView.state==="pending"
                              ?"Recording order safely..."
                              :"Record order — no payment"}
                          </button>
                          {orderView.state==="pending_provider" ? (
                            <div role="status" className="mt-3 rounded-[8px] border border-[var(--line)] p-3">
                              <p className="font-semibold">Order recorded for provider reconciliation.</p>
                              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                                Reference {orderView.orderReference}. Provider confirmation and payment are still pending.
                                {orderView.replayed ? " This is the verified existing order." : ""}
                              </p>
                            </div>
                          ):null}
                          {orderView.state==="error" ? (
                            <div role="alert" className="mt-3">
                              <p className="font-semibold">{orderView.message}</p>
                              {orderView.canReload ? (
                                <button type="button" onClick={()=>{
                                  setView({state:"loading"});setCartView({state:"checking"});
                                  setCheckoutView({state:"idle"});setOrderView({state:"idle"});
                                  setReloadVersion((version)=>version+1);
                                }}
                                  className="mt-3 min-h-11 rounded-[8px] bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white">
                                  Reload Store and cart
                                </button>
                              ):null}
                            </div>
                          ):null}
                        </div>
                      ) : null}
                      {checkoutView.state === "error" ? (
                        <div role="alert" className="mt-3">
                          <p className="font-semibold">{checkoutView.message}</p>
                          {checkoutView.signInRequired ? (
                            <a
                              className="mt-3 inline-flex min-h-11 items-center rounded-[8px] bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white"
                              href={loginHref}
                            >
                              Sign in to continue
                            </a>
                          ) : null}
                          {checkoutView.canReload ? (
                            <button
                              type="button"
                              onClick={() => {
                                setView({ state: "loading" });
                                setCartView({ state: "checking" });
                                setCheckoutView({ state: "idle" });
                                setOrderView({ state: "idle" });
                                setReloadVersion((version) => version + 1);
                              }}
                              className="mt-3 min-h-11 rounded-[8px] bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white"
                            >
                              Reload Store and cart
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : cartView.cart.state === "empty" ? (
                <p className="mt-2 font-semibold">
                  Your cart is empty for {cartView.cart.store.displayName}.
                </p>
              ) : cartView.cart.state === "expired" ? (
                <div className="mt-2">
                  <p className="font-semibold">Your previous cart has expired.</p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    Add an available item to create a new cart for this Store and Seller.
                  </p>
                </div>
              ) : (
                <div className="mt-2" role="status">
                  <p className="font-semibold">
                    Your existing cart belongs to a different Store or Seller context.
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    Choose an item below to confirm a protected Cart rebuild for this Store and Seller.
                  </p>
                </div>
              )
            ) : null}
          </section>
        ) : null}

        <div aria-live="polite" aria-busy={view.state === "loading"} className="mt-8">
          {view.state === "loading" ? (
            <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
              <p className="font-semibold">Loading this Store&apos;s catalog…</p>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">Resolving Store, Seller, price and availability.</p>
            </section>
          ) : null}

          {view.state === "error" ? (
            <section role="alert" className="rounded-[8px] border border-[var(--rose)] bg-[var(--surface)] p-6">
              <p className="font-semibold">Catalog not available</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">{view.message}</p>
              <button
                type="button"
                onClick={() => {
                  setView({ state: "loading" });
                  setCheckoutView({ state: "idle" });
                  setOrderView({ state: "idle" });
                  setReloadVersion((version) => version + 1);
                }}
                className="mt-5 min-h-11 rounded-[8px] bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </section>
          ) : null}

          {view.state === "empty" ? (
            <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6">
              <p className="font-semibold">No products are currently released for this Store.</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                This is an intentional empty catalog. Products from another Store are never used as fallback.
              </p>
            </section>
          ) : null}

          {view.state === "ready" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
                <p className="text-sm font-semibold">
                  {view.page.items.length} catalog item{view.page.items.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {observedAt ? `Availability observed ${observedAt} UTC` : "Availability timestamp unavailable"}
                </p>
              </div>
              <ul className="mt-5 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                {view.page.items.map((item) => (
                  <li key={item.productVariantReference} className="flex min-h-64 flex-col rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-[7px] border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold">
                        {availability[item.availability]}
                      </span>
                      <span className="text-lg font-semibold">{money(item.priceMinor, view.page.currency)}</span>
                    </div>
                    <h2 className="mt-6 text-xl font-semibold">{item.name}</h2>
                    <p className="mt-2 flex-1 text-sm leading-6 text-[var(--ink-muted)]">{item.description}</p>
                    <button
                      type="button"
                      disabled={checkoutView.state === "pending" ||
                        ["checking", "pending"].includes(cartView.state) ||
                        !["available", "low"].includes(item.availability)}
                      onClick={() => void addToCart(item)}
                      className="mt-5 min-h-11 rounded-[8px] bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cartView.state === "pending" &&
                          cartView.operation === "add" &&
                          cartView.targetReference === item.productVariantReference
                        ? "Adding..."
                        : cartView.state === "ready" &&
                            cartView.cart.state === "rebuild_required"
                          ? "Confirm Seller change and add"
                          : ["available", "low"].includes(item.availability) ? "Add to cart" : "Unavailable"}
                    </button>
                    <p className="mt-5 border-t border-[var(--line)] pt-3 text-xs text-[var(--ink-muted)]">
                      Exact Store availability · no cross-operator fallback
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        {page ? (
          <footer className="mt-8 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--ink-muted)]">
            Catalog snapshot {page.store.snapshotVersion}. Integrity{" "}
            <code className="break-all font-mono">{page.store.snapshotSha256}</code>.
          </footer>
        ) : null}
      </div>
    </main>
  );
}
