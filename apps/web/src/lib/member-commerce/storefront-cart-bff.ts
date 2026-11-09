import "server-only";

import { createHash } from "node:crypto";

import type { KdsDatabase, KdsQuery } from "@/store-operations/kds";
import {
  addCartLine,
  adjustCartLine,
  removeCartLine,
  rebuildCartAfterSellerChange,
  resumeCart,
  type CanonicalProductType,
  type CartSellerContext,
  type SellerBoundCart,
} from "./seller-bound-cart-lifecycle";
import {
  loadActiveSellerBoundCartSnapshot,
  loadCurrentSellerBoundCartSnapshot,
  loadActiveSellerBoundRelationshipCartSnapshot,
  persistSellerBoundCartMutationSnapshot,
  type SellerBoundCartDb,
  type SellerBoundCartMutation,
} from "./seller-bound-cart-repository";
import type { StorefrontBffRequest } from "./storefront-bff-contract";
import { resolveActiveClubsSellerChannelMapping } from "./clubs-seller-channel-mapping-repository";
import {
  resolveStorefrontRouteCommerceContextSnapshot,
  type StorefrontRouteCommerceContext,
} from "./storefront-route-commerce-context";

const PRODUCT_TYPES = new Set<CanonicalProductType>([
  "physical", "digital", "membership", "pass", "booking", "ticket", "fee",
  "deposit",
]);

type RelationshipRow = Readonly<{
  commerce_customer_relationship_id: string;
}>;

type ClassificationRow = Readonly<{
  sellable_assignment_id: string;
  sellable_assignment_version: string | number;
  sellable_product_classification_id: string;
  classification_version: string | number;
  taxonomy_version: string | number;
  product_type: CanonicalProductType;
  vertical_product_class: string;
  routing_policy_version: string;
}>;

type ReplayRow = Readonly<{
  command_receipt_id: string;
  cart_id: string;
  resulting_cart_version: string | number;
  receipt_sha256: string;
  vertical_root: string;
  store_id: string;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  vendure_seller_id: string;
  vendure_channel_id: string;
  context_fingerprint: string;
  customer_relationship_id: string | null;
}>;

export type StorefrontCartAuthority = Readonly<{
  authoritySource: string;
  accountId: string | null;
}>;

export type StorefrontCustomerCartAuthority = Readonly<{
  authoritySource: "auth0-crays-session";
  accountId: string;
}>;

export function requireStorefrontCustomerCartAuthority(
  authority: StorefrontCartAuthority,
): StorefrontCustomerCartAuthority {
  if (authority.authoritySource !== "auth0-crays-session" ||
      !authority.accountId?.trim()) {
    throw new Error("STOREFRONT_AUTHENTICATION_REQUIRED");
  }
  return Object.freeze({
    authoritySource: "auth0-crays-session",
    accountId: authority.accountId.trim(),
  });
}

export type StorefrontCartResult = Readonly<{
  state: "ready" | "empty" | "expired" | "rebuild_required";
  recovery?:
    | "add_item_to_replace_expired_cart"
    | "expired_cart_replaced"
    | "acknowledge_seller_change_to_rebuild_cart"
    | "seller_change_cart_rebuilt";
  storeSlug: string;
  cartId?: string;
  storeDisplayName: string;
  cartVersion?: number;
  receiptId?: string;
  replayed?: boolean;
  commandState?: "PERSISTED_PENDING_PROVIDER";
  lines: readonly Readonly<{
    orderLineReference: string;
    quantity: number;
  }>[];
}>;

type Snapshots = Readonly<{
  resolveRoute: (
    query: KdsQuery,
    input: Readonly<{
      verticalRoot: StorefrontBffRequest["verticalRoot"];
      storeSlug: string;
    }>,
    authorityNow: Date,
  ) => Promise<StorefrontRouteCommerceContext>;
  resolveRelationship: (
    query: KdsQuery,
    input: Readonly<{
      accountId: string;
      route: StorefrontRouteCommerceContext;
      authorityNow: Date;
    }>,
  ) => Promise<string>;
  resolveLine: (
    query: KdsQuery,
    input: Readonly<{
      route: StorefrontRouteCommerceContext;
      productVariantReference: string;
    }>,
  ) => Promise<SellerBoundCart["lines"][number]>;
  loadCart: typeof loadActiveSellerBoundCartSnapshot;
  loadCurrentCart?: typeof loadCurrentSellerBoundCartSnapshot;
  loadRelationshipCart?: typeof loadActiveSellerBoundRelationshipCartSnapshot;
  persistMutation: typeof persistSellerBoundCartMutationSnapshot;
  resolveClubsMapping?: typeof resolveActiveClubsSellerChannelMapping;
}>;

const hash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

function seller(route: StorefrontRouteCommerceContext): CartSellerContext {
  return Object.freeze({
    verticalRoot: route.context.verticalRoot,
    storeId: route.context.storeId,
    partnerTenantId: route.context.partnerTenantId,
    operatorLegalEntityId: route.context.operatorLegalEntityId,
    vendureSellerId: route.context.vendure.sellerId,
    vendureChannelId: route.context.vendure.channelId,
    contextFingerprint: route.context.contextFingerprint,
  });
}

async function bindClubsSellerMapping(query: KdsQuery,candidate: CartSellerContext,authorityNow: Date,resolver: typeof resolveActiveClubsSellerChannelMapping): Promise<CartSellerContext> {
  const mapping=await resolver({query},{partnerTenantId:candidate.partnerTenantId,storeId:candidate.storeId,authorityNow});
  if(mapping.operatorLegalEntityId!==candidate.operatorLegalEntityId||mapping.vendureSellerId!==candidate.vendureSellerId||mapping.vendureChannelId!==candidate.vendureChannelId) throw new Error("STOREFRONT_CLUBS_MAPPING_SCOPE_MISMATCH");
  return Object.freeze({...candidate,clubsMapping:Object.freeze({mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,mappingFingerprint:mapping.mappingFingerprint})});
}

export async function resolveStorefrontCustomerRelationship(
  query: KdsQuery,
  input: Readonly<{
    accountId: string;
    route: StorefrontRouteCommerceContext;
    authorityNow: Date;
  }>,
): Promise<string> {
  const context = input.route.context;
  const rows = await query<RelationshipRow>(
    `select r.commerce_customer_relationship_id
       from crays_core.canonical_people p
       join crays_core.commerce_customer_relationships r
         on r.canonical_person_id=p.canonical_person_id
      where p.account_id=$1 and p.lifecycle_state='active'
        and r.vertical_root=$2 and r.partner_tenant_id=$3
        and r.operator_legal_entity_id=$4 and r.lifecycle_state='active'
        and r.effective_from<=$5
        and (r.effective_until is null or r.effective_until>$5)
        and r.purposes @> '["account"]'::jsonb
      limit 2`,
    [
      input.accountId,
      context.verticalRoot,
      context.partnerTenantId,
      context.operatorLegalEntityId,
      input.authorityNow.toISOString(),
    ],
  );
  if (rows.rows.length !== 1 ||
      !rows.rows[0].commerce_customer_relationship_id.trim()) {
    throw new Error(rows.rows.length === 0
      ? "STOREFRONT_CUSTOMER_RELATIONSHIP_NOT_ACTIVE"
      : "STOREFRONT_CUSTOMER_RELATIONSHIP_AMBIGUOUS");
  }
  return rows.rows[0].commerce_customer_relationship_id;
}

async function resolveLine(
  query: KdsQuery,
  input: Readonly<{
    route: StorefrontRouteCommerceContext;
    productVariantReference: string;
  }>,
): Promise<SellerBoundCart["lines"][number]> {
  const context = input.route.context;
  const rows = await query<ClassificationRow>(
    `select sellable_assignment_id,sellable_assignment_version,
            sellable_product_classification_id,classification_version,
            taxonomy_version,product_type,vertical_product_class,
            routing_policy_version
       from crays_integration.partner_catalog_read_model
      where storefront_store_route_id=$1 and route_version=$2
        and lifecycle_state='active' and vendure_variant_id=$3
        and vertical_root=$4 and store_id=$5 and partner_tenant_id=$6
        and operator_legal_entity_id=$7 and vendure_seller_id=$8
        and vendure_channel_id=$9
      limit 2`,
    [
      input.route.routeId,
      input.route.routeVersion,
      input.productVariantReference,
      context.verticalRoot,
      context.storeId,
      context.partnerTenantId,
      context.operatorLegalEntityId,
      context.vendure.sellerId,
      context.vendure.channelId,
    ],
  );
  if (rows.rows.length !== 1) {
    throw new Error(rows.rows.length === 0
      ? "STOREFRONT_VARIANT_NOT_SELLABLE"
      : "STOREFRONT_VARIANT_AMBIGUOUS");
  }
  const row = rows.rows[0];
  const assignmentVersion = Number(row.sellable_assignment_version);
  const classificationVersion = Number(row.classification_version);
  const taxonomyVersion = Number(row.taxonomy_version);
  if (!Number.isSafeInteger(assignmentVersion) || assignmentVersion < 1 ||
      !Number.isSafeInteger(classificationVersion) ||
      classificationVersion < 1 ||
      !Number.isSafeInteger(taxonomyVersion) || taxonomyVersion < 1 ||
      !PRODUCT_TYPES.has(row.product_type) ||
      !row.sellable_assignment_id.trim() ||
      !row.sellable_product_classification_id.trim() ||
      !row.vertical_product_class.trim() ||
      !row.routing_policy_version.trim()) {
    throw new Error("STOREFRONT_VARIANT_CLASSIFICATION_INVALID");
  }
  return Object.freeze({
    variantRef: input.productVariantReference,
    quantity: 1,
    sellableAssignmentId: row.sellable_assignment_id,
    sellableAssignmentVersion: assignmentVersion,
    sellableProductClassificationId: row.sellable_product_classification_id,
    classificationVersion,
    taxonomyVersion,
    productType: row.product_type,
    verticalProductClass: row.vertical_product_class,
    routingPolicyVersion: row.routing_policy_version,
    mixedTypeCompatibilityReceipts: Object.freeze([]),
  });
}

const defaults: Snapshots = {
  resolveRoute: resolveStorefrontRouteCommerceContextSnapshot,
  resolveRelationship: resolveStorefrontCustomerRelationship,
  resolveLine,
  loadCart: loadActiveSellerBoundCartSnapshot,
  loadCurrentCart: loadCurrentSellerBoundCartSnapshot,
  loadRelationshipCart: loadActiveSellerBoundRelationshipCartSnapshot,
  persistMutation: persistSellerBoundCartMutationSnapshot,
};

function publicResult(
  request: StorefrontBffRequest,
  storeDisplayName: string,
  cart: SellerBoundCart | null,
  command?: Readonly<{
    receiptId: string;
    replayed: boolean;
    commandState: "PERSISTED_PENDING_PROVIDER";
    recovery?: "expired_cart_replaced" | "seller_change_cart_rebuilt";
  }>,
): StorefrontCartResult {
  return Object.freeze({
    state: cart ? "ready" : "empty",
    storeSlug: request.storeSlug,
    storeDisplayName,
    ...(cart ? {
      cartId: cart.cartId,
      cartVersion: cart.version,
      lines: Object.freeze(cart.lines.map((line) => Object.freeze({
        orderLineReference: line.variantRef,
        quantity: line.quantity,
      }))),
    } : { lines: Object.freeze([]) }),
    ...(command ? {
      receiptId: command.receiptId,
      replayed: command.replayed,
      commandState: command.commandState,
      ...(command.recovery ? { recovery: command.recovery } : {}),
    } : {}),
  });
}

function publicExpiredResult(
  request: StorefrontBffRequest,
  storeDisplayName: string,
): StorefrontCartResult {
  return Object.freeze({
    state: "expired",
    storeSlug: request.storeSlug,
    storeDisplayName,
    recovery: "add_item_to_replace_expired_cart",
    lines: Object.freeze([]),
  });
}

function publicRebuildRequiredResult(
  request: StorefrontBffRequest,
  storeDisplayName: string,
  priorCartVersion: number,
): StorefrontCartResult {
  return Object.freeze({
    state: "rebuild_required",
    storeSlug: request.storeSlug,
    storeDisplayName,
    cartVersion: priorCartVersion,
    recovery: "acknowledge_seller_change_to_rebuild_cart",
    lines: Object.freeze([]),
  });
}

function commandDigest(
  request: StorefrontBffRequest,
  relationshipId: string,
  route: StorefrontRouteCommerceContext,
  cartSeller: CartSellerContext,
): string {
  return hash(JSON.stringify({
    contract: "ncrv2-121.cart-command.v1",
    request,
    relationshipId,
    routeId: route.routeId,
    routeVersion: route.routeVersion,
    contextFingerprint: route.context.contextFingerprint,
    clubsMapping: cartSeller.clubsMapping ?? null,
  }));
}

async function replay(
  query: KdsQuery,
  input: Readonly<{
    tenantId: string;
    idempotencyKey: string;
    receiptSha256: string;
    relationshipId: string;
    seller: CartSellerContext;
  }>,
) {
  const result = await query<ReplayRow>(
    `select command_receipt_id,cart_id,resulting_cart_version,receipt_sha256,
            vertical_root,store_id,partner_tenant_id,operator_legal_entity_id,
            vendure_seller_id,vendure_channel_id,context_fingerprint,
            customer_relationship_id
       from crays_core.seller_bound_cart_command_receipts
      where tenant_id=$1 and idempotency_key=$2`,
    [input.tenantId, input.idempotencyKey],
  );
  const row = result.rows[0];
  if (!row) return null;
  const version = Number(row.resulting_cart_version);
  const scopeMatches = result.rows.length === 1 &&
    row.receipt_sha256 === input.receiptSha256 &&
    row.customer_relationship_id === input.relationshipId &&
    row.vertical_root === input.seller.verticalRoot &&
    row.store_id === input.seller.storeId &&
    row.partner_tenant_id === input.seller.partnerTenantId &&
    row.operator_legal_entity_id === input.seller.operatorLegalEntityId &&
    row.vendure_seller_id === input.seller.vendureSellerId &&
    row.vendure_channel_id === input.seller.vendureChannelId &&
    row.context_fingerprint === input.seller.contextFingerprint &&
    Number.isSafeInteger(version) && version > 0;
  if (!scopeMatches) throw new Error("SELLER_BOUND_CART_REPLAY_CONFLICT");
  return Object.freeze({
    receiptId: row.command_receipt_id,
    cartId: row.cart_id,
    version,
  });
}

function ensureExpectedVersion(
  request: StorefrontBffRequest,
  cart: SellerBoundCart,
) {
  if (request.expectedCartVersion !== undefined &&
      request.expectedCartVersion !== cart.version) {
    throw new Error("SELLER_BOUND_CART_VERSION_OR_SCOPE_CONFLICT");
  }
}

export async function executeAuthenticatedStorefrontCart(
  database: KdsDatabase,
  input: Readonly<{
    request: StorefrontBffRequest;
    authority: StorefrontCartAuthority;
  }>,
  snapshots: Snapshots = defaults,
): Promise<StorefrontCartResult> {
  const customerAuthority = requireStorefrontCustomerCartAuthority(
    input.authority,
  );
  const accountId = customerAuthority.accountId;
  if (input.request.operation === "catalog.read") {
    throw new Error("STOREFRONT_CART_OPERATION_REQUIRED");
  }

  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level serializable");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = new Date(clock.rows[0]?.authority_now ?? "");
    if (!Number.isFinite(authorityNow.getTime())) {
      throw new Error("STOREFRONT_AUTHORITY_CLOCK_INVALID");
    }
    const route = await snapshots.resolveRoute(query, {
      verticalRoot: input.request.verticalRoot,
      storeSlug: input.request.storeSlug,
    }, authorityNow);
    const baseCartSeller = seller(route);
    const tenantId = baseCartSeller.partnerTenantId;
    const store = await query<{ display_name: string }>(
      "select display_name from crays_core.stores where store_id=$1 and status='active'",
      [baseCartSeller.storeId],
    );
    if (store.rows.length !== 1 || !store.rows[0].display_name.trim()) {
      throw new Error("STOREFRONT_STORE_DISPLAY_INVALID");
    }
    const storeDisplayName = store.rows[0].display_name.trim();
    await query(
      "select set_config('crays.tenant_id',$1,true)",
      [tenantId],
    );
    const cartSeller=baseCartSeller.verticalRoot==="clubs"&&(snapshots===defaults||snapshots.resolveClubsMapping)?await bindClubsSellerMapping(query,baseCartSeller,authorityNow,snapshots.resolveClubsMapping??resolveActiveClubsSellerChannelMapping):baseCartSeller;
    const relationshipId = await snapshots.resolveRelationship(query, {
      accountId,
      route,
      authorityNow,
    });
    const db: SellerBoundCartDb = { query };
    const cartInput = {
      tenantId,
      customerRelationshipId: relationshipId,
      seller: cartSeller,
      now: authorityNow,
    } as const;
    const loadCurrent = () =>
      (snapshots.loadCurrentCart ?? snapshots.loadCart)(db, cartInput);
    const scopedCart = await loadCurrent();
    const expired = scopedCart &&
      new Date(scopedCart.expiresAt).getTime() <= authorityNow.getTime()
      ? scopedCart : null;
    const current = expired ? null : scopedCart;
    const relationshipCart = !current && !expired &&
      snapshots.loadRelationshipCart
      ? await snapshots.loadRelationshipCart(db, {
          tenantId,
          customerRelationshipId: relationshipId,
          verticalRoot: cartSeller.verticalRoot,
          now: authorityNow,
        })
      : null;
    const relationshipResume = relationshipCart
      ? resumeCart(relationshipCart, relationshipId, cartSeller, authorityNow)
      : null;
    const rebuildSource = relationshipResume?.resumed === false
      ? relationshipCart : null;

    if (input.request.operation === "cart.read") {
      return expired
        ? publicExpiredResult(input.request, storeDisplayName)
        : rebuildSource
          ? publicRebuildRequiredResult(
              input.request, storeDisplayName, rebuildSource.version)
          : publicResult(input.request, storeDisplayName, current);
    }
    if (input.request.operation === "checkout.preflight") {
      if (!current || current.lines.length === 0) {
        throw new Error("STOREFRONT_CHECKOUT_CART_EMPTY");
      }
      ensureExpectedVersion(input.request, current);
      return publicResult(input.request, storeDisplayName, current);
    }
    const idempotencyKey = input.request.idempotencyKey;
    if (!idempotencyKey) throw new Error("STOREFRONT_IDEMPOTENCY_REQUIRED");
    const receiptSha256 = commandDigest(
      input.request,
      relationshipId,
      route,
      cartSeller,
    );
    const prior = await replay(query, {
      tenantId,
      idempotencyKey,
      receiptSha256,
      relationshipId,
      seller: cartSeller,
    });
    if (prior) {
      if (!current || current.cartId !== prior.cartId ||
          current.version < prior.version) {
        throw new Error("SELLER_BOUND_CART_REPLAY_STATE_INVALID");
      }
      return publicResult(input.request, storeDisplayName, current, {
        receiptId: prior.receiptId,
        replayed: true,
        commandState: "PERSISTED_PENDING_PROVIDER",
      });
    }

    const sellerChangeAcknowledged =
      input.request.sellerChangeWarningAcknowledged === true;
    if (sellerChangeAcknowledged && !rebuildSource) {
      throw new Error("STOREFRONT_SELLER_CHANGE_ACK_UNEXPECTED");
    }
    if (rebuildSource && input.request.operation === "cart.add" &&
        !sellerChangeAcknowledged) {
      throw new Error("STOREFRONT_CART_REBUILD_WARNING_REQUIRED");
    }
    let next: SellerBoundCart;
    let commandKind: SellerBoundCartMutation["commandKind"];
    let expectedVersion: number;
    if (input.request.operation === "cart.add") {
      const variant = input.request.productVariantReference;
      const quantity = input.request.quantity;
      if (!variant || quantity === undefined) {
        throw new Error("STOREFRONT_OPERATION_FIELDS_INVALID");
      }
      let rebuilt: SellerBoundCart | null = null;
      if (expired) {
        ensureExpectedVersion(input.request, expired);
        const expiredCart = Object.freeze({
          ...expired,
          version: expired.version + 1,
          state: "expired" as const,
        });
        const expiryKey =
          `${idempotencyKey}:expire:${expired.cartId}:${expired.version}`;
        const expiryReceiptSha256 = hash(JSON.stringify({
          commandKind: "EXPIRE",
          idempotencyKey: expiryKey,
          cartId: expired.cartId,
          expectedVersion: expired.version,
          resultingVersion: expiredCart.version,
        }));
        const expiryReceiptId =
          `cart-receipt-${hash(`${tenantId}:${expiryKey}`).slice(0, 40)}`;
        const expiryOutboxId =
          `cart-outbox-${hash(`${expiryReceiptId}:outbox`).slice(0, 40)}`;
        await snapshots.persistMutation(db, {
          tenantId,
          cart: expiredCart,
          expectedVersion: expired.version,
          commandReceiptId: expiryReceiptId,
          commandKind: "EXPIRE",
          idempotencyKey: expiryKey,
          receiptSha256: expiryReceiptSha256,
          outboxEventId: expiryOutboxId,
          payloadSha256: hash(JSON.stringify({
            receiptSha256: expiryReceiptSha256,
            cartId: expiredCart.cartId,
            version: expiredCart.version,
            lines: expiredCart.lines,
          })),
          createdAt: authorityNow.toISOString(),
        });
      }
      if (rebuildSource) {
        ensureExpectedVersion(input.request, rebuildSource);
        const rebuildKey =
          `${idempotencyKey}:rebuild:${rebuildSource.cartId}:${rebuildSource.version}`;
        const rebuiltCartId =
          `cart-${hash(`${tenantId}:${relationshipId}:${cartSeller.contextFingerprint}:${idempotencyKey}`).slice(0, 48)}`;
        const rebuiltCart = rebuildCartAfterSellerChange(
          rebuildSource,
          rebuiltCartId,
          cartSeller,
          sellerChangeAcknowledged,
          new Date(authorityNow.getTime() + 24 * 60 * 60 * 1000)
            .toISOString(),
        );
        const rebuildReceiptSha256 = hash(JSON.stringify({
          commandKind: "REBUILD_AFTER_SELLER_CHANGE",
          idempotencyKey: rebuildKey,
          cartId: rebuiltCart.cartId,
          supersededCartId: rebuildSource.cartId,
          expectedVersion: rebuildSource.version,
        }));
        const rebuildReceiptId =
          `cart-receipt-${hash(`${tenantId}:${rebuildKey}`).slice(0, 40)}`;
        const rebuildOutboxId =
          `cart-outbox-${hash(`${rebuildReceiptId}:outbox`).slice(0, 40)}`;
        await snapshots.persistMutation(db, {
          tenantId,
          cart: rebuiltCart,
          expectedVersion: 0,
          commandReceiptId: rebuildReceiptId,
          commandKind: "REBUILD_AFTER_SELLER_CHANGE",
          idempotencyKey: rebuildKey,
          receiptSha256: rebuildReceiptSha256,
          outboxEventId: rebuildOutboxId,
          payloadSha256: hash(JSON.stringify({
            receiptSha256: rebuildReceiptSha256,
            cartId: rebuiltCart.cartId,
            version: rebuiltCart.version,
            lines: rebuiltCart.lines,
          })),
          createdAt: authorityNow.toISOString(),
          supersededCartId: rebuildSource.cartId,
          sellerChangeWarningAcknowledged: true,
        });
        rebuilt = rebuiltCart;
      }
      const line = {
        ...await snapshots.resolveLine(query, {
          route,
          productVariantReference: variant,
        }),
        quantity,
      };
      if (current) {
        ensureExpectedVersion(input.request, current);
        expectedVersion = current.version;
        next = addCartLine(current, cartSeller, line, authorityNow);
        commandKind = "ADD_LINE";
      } else if (rebuilt) {
        expectedVersion = rebuilt.version;
        next = addCartLine(rebuilt, cartSeller, line, authorityNow);
        commandKind = "ADD_LINE";
      } else {
        expectedVersion = 0;
        next = Object.freeze({
          cartId: `cart-${hash(`${tenantId}:${relationshipId}:${cartSeller.contextFingerprint}:${idempotencyKey}`).slice(0, 48)}`,
          version: 1,
          customerRelationshipId: relationshipId,
          seller: cartSeller,
          lines: Object.freeze([Object.freeze(line)]),
          expiresAt: new Date(authorityNow.getTime() + 24 * 60 * 60 * 1000)
            .toISOString(),
          state: "active" as const,
        });
        commandKind = "CREATE";
      }
    } else {
      if (!current) throw new Error("STOREFRONT_CART_NOT_FOUND");
      ensureExpectedVersion(input.request, current);
      const lineReference = input.request.orderLineReference;
      if (!lineReference) throw new Error("STOREFRONT_OPERATION_FIELDS_INVALID");
      expectedVersion = current.version;
      if (input.request.operation === "cart.adjust") {
        next = adjustCartLine(
          current,
          lineReference,
          input.request.quantity as number,
          authorityNow,
        );
        commandKind = "ADJUST_LINE";
      } else {
        next = removeCartLine(current, lineReference, authorityNow);
        commandKind = "REMOVE_LINE";
      }
    }

    const commandReceiptId = `cart-receipt-${hash(`${tenantId}:${idempotencyKey}`).slice(0, 40)}`;
    const outboxEventId = `cart-outbox-${hash(`${commandReceiptId}:outbox`).slice(0, 40)}`;
    const payloadSha256 = hash(JSON.stringify({
      receiptSha256,
      cartId: next.cartId,
      version: next.version,
      lines: next.lines,
    }));
    const persisted = await snapshots.persistMutation(db, {
      tenantId,
      cart: next,
      expectedVersion,
      commandReceiptId,
      commandKind,
      idempotencyKey,
      receiptSha256,
      outboxEventId,
      payloadSha256,
      createdAt: authorityNow.toISOString(),
    });
    return publicResult(input.request, storeDisplayName, next, {
      receiptId: commandReceiptId,
      replayed: persisted.replayed,
      commandState: persisted.commandState,
      ...(rebuildSource
        ? { recovery: "seller_change_cart_rebuilt" as const }
        : expired
          ? { recovery: "expired_cart_replaced" as const } : {}),
    });
  });
}
