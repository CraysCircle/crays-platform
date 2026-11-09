export const SELLER_BOUND_CART_VERSION = "ncrv2-131.v1" as const;

export type CanonicalProductType = "physical" | "digital" | "membership" |
  "pass" | "booking" | "ticket" | "fee" | "deposit";

export type ProductTypeCartCompatibilityDecision = Readonly<{
  taxonomyVersion: number;
  leftProductType: CanonicalProductType;
  rightProductType: CanonicalProductType;
  routingPolicyVersion: string;
  decision: "ALLOW" | "DENY";
  decisionReceiptSha256: string;
}>;

export type CartSellerContext = Readonly<{
  verticalRoot: "coffee" | "retail" | "gym" | "clubs";
  storeId: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  vendureSellerId: string;
  vendureChannelId: string;
  contextFingerprint: string;
  clubsMapping?: Readonly<{
    mappingId: string;
    mappingVersion: number;
    mappingFingerprint: string;
  }>;
}>;

export type SellerBoundCart = Readonly<{
  cartId: string;
  version: number;
  customerRelationshipId: string | null;
  seller: CartSellerContext;
  lines: readonly Readonly<{
    variantRef: string;
    quantity: number;
    sellableAssignmentId: string;
    sellableAssignmentVersion: number;
    sellableProductClassificationId: string;
    classificationVersion: number;
    taxonomyVersion: number;
    productType: CanonicalProductType;
    verticalProductClass: string;
    routingPolicyVersion: string;
    mixedTypeCompatibilityReceipts: readonly ProductTypeCartCompatibilityDecision[];
  }>[];
  expiresAt: string;
  state: "active" | "expired" | "cleared" | "converted";
}>;

function assertActive(cart: SellerBoundCart, now: Date) {
  if (cart.state !== "active") throw new Error("CART_NOT_ACTIVE");
  if (new Date(cart.expiresAt).getTime() <= now.getTime()) {
    throw new Error("CART_EXPIRED");
  }
}

function sameSeller(left: CartSellerContext, right: CartSellerContext) {
  return left.verticalRoot === right.verticalRoot &&
    left.storeId === right.storeId &&
    left.partnerTenantId === right.partnerTenantId &&
    left.operatorLegalEntityId === right.operatorLegalEntityId &&
    left.vendureSellerId === right.vendureSellerId &&
    left.vendureChannelId === right.vendureChannelId &&
    left.contextFingerprint === right.contextFingerprint &&
    (left.clubsMapping?.mappingId ?? null) ===
      (right.clubsMapping?.mappingId ?? null) &&
    (left.clubsMapping?.mappingVersion ?? null) ===
      (right.clubsMapping?.mappingVersion ?? null) &&
    (left.clubsMapping?.mappingFingerprint ?? null) ===
      (right.clubsMapping?.mappingFingerprint ?? null);
}

export function addCartLine(
  cart: SellerBoundCart,
  context: CartSellerContext,
  line: SellerBoundCart["lines"][number],
  now = new Date(),
): SellerBoundCart {
  assertActive(cart, now);
  if (!sameSeller(cart.seller, context)) throw new Error("CART_MIXED_SELLER_DENIED");
  if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 ||
      !line.sellableAssignmentId.trim() || !Number.isSafeInteger(line.sellableAssignmentVersion) ||
      line.sellableAssignmentVersion < 1 || !line.sellableProductClassificationId.trim() ||
      !Number.isSafeInteger(line.classificationVersion) || line.classificationVersion < 1 ||
      !Number.isSafeInteger(line.taxonomyVersion) || line.taxonomyVersion < 1 ||
      !line.verticalProductClass.trim() || !line.routingPolicyVersion.trim() ||
      !Array.isArray(line.mixedTypeCompatibilityReceipts)) {
    throw new Error("CART_LINE_INVALID");
  }
  const current = cart.lines.find((candidate) => candidate.variantRef === line.variantRef);
  if (current && (current.sellableAssignmentId !== line.sellableAssignmentId ||
      current.sellableAssignmentVersion !== line.sellableAssignmentVersion ||
      current.sellableProductClassificationId !== line.sellableProductClassificationId ||
      current.classificationVersion !== line.classificationVersion ||
      current.taxonomyVersion !== line.taxonomyVersion || current.productType !== line.productType ||
      current.verticalProductClass !== line.verticalProductClass ||
      current.routingPolicyVersion !== line.routingPolicyVersion)) {
    throw new Error("CART_LINE_CLASSIFICATION_REWRITE_DENIED");
  }
  for (const existingType of new Set(cart.lines.map((candidate) => candidate.productType))) {
    if (existingType === line.productType) continue;
    const [leftProductType, rightProductType] = [existingType, line.productType].sort() as
      [CanonicalProductType, CanonicalProductType];
    const decision = line.mixedTypeCompatibilityReceipts.find((candidate) =>
      candidate.taxonomyVersion === line.taxonomyVersion &&
      candidate.leftProductType === leftProductType &&
      candidate.rightProductType === rightProductType &&
      candidate.routingPolicyVersion === line.routingPolicyVersion);
    if (!decision || decision.decision !== "ALLOW" ||
        !/^[a-f0-9]{64}$/.test(decision.decisionReceiptSha256)) {
      throw new Error("CART_PRODUCT_TYPE_COMPATIBILITY_NOT_ADMITTED");
    }
  }
  if (line.mixedTypeCompatibilityReceipts.some((decision) =>
      decision.decision !== "ALLOW" || !/^[a-f0-9]{64}$/.test(decision.decisionReceiptSha256))) {
    throw new Error("CART_PRODUCT_TYPE_COMPATIBILITY_RECEIPT_INVALID");
  }
  const lines = current
    ? cart.lines.map((candidate) => candidate.variantRef === line.variantRef
      ? {...candidate, quantity: candidate.quantity + line.quantity}
      : candidate)
    : [...cart.lines, line];
  return {...cart, version: cart.version + 1, lines};
}

export function adjustCartLine(
  cart: SellerBoundCart,
  variantRef: string,
  quantity: number,
  now = new Date(),
): SellerBoundCart {
  assertActive(cart, now);
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("CART_LINE_INVALID");
  if (!cart.lines.some((line) => line.variantRef === variantRef)) {
    throw new Error("CART_LINE_NOT_FOUND");
  }
  return {
    ...cart,
    version: cart.version + 1,
    lines: cart.lines.map((line) => line.variantRef === variantRef ? {...line, quantity} : line),
  };
}

export function removeCartLine(
  cart: SellerBoundCart,
  variantRef: string,
  now = new Date(),
): SellerBoundCart {
  assertActive(cart, now);
  if (!cart.lines.some((line) => line.variantRef === variantRef)) {
    throw new Error("CART_LINE_NOT_FOUND");
  }
  return {...cart, version: cart.version + 1, lines: cart.lines.filter((line) => line.variantRef !== variantRef)};
}

export function resumeCart(
  cart: SellerBoundCart,
  relationshipId: string | null,
  context: CartSellerContext,
  now = new Date(),
) {
  assertActive(cart, now);
  if (cart.customerRelationshipId !== relationshipId) {
    throw new Error("CART_RELATIONSHIP_MISMATCH");
  }
  if (!sameSeller(cart.seller, context)) {
    return {
      resumed: false as const,
      warning: "STORE_OR_OPERATOR_CHANGED_CART_REBUILD_REQUIRED" as const,
      cartId: cart.cartId,
      cartVersion: cart.version,
    };
  }
  return {resumed: true as const, cart};
}

export function rebuildCartAfterSellerChange(
  cart: SellerBoundCart,
  newCartId: string,
  newContext: CartSellerContext,
  warningAcknowledged: boolean,
  newExpiresAt: string,
): SellerBoundCart {
  if (!warningAcknowledged) throw new Error("CART_REBUILD_WARNING_REQUIRED");
  if (sameSeller(cart.seller, newContext)) throw new Error("CART_REBUILD_CONTEXT_UNCHANGED");
  return {
    cartId: newCartId,
    version: 1,
    customerRelationshipId: cart.customerRelationshipId,
    seller: newContext,
    lines: [],
    expiresAt: newExpiresAt,
    state: "active",
  };
}
