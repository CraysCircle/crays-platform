export const SELLER_SHIPPING_TAX_VERSION = "ncrv2-132.v1" as const;

export type SellerScope = Readonly<{
  storeId: string;
  operatorLegalEntityId: string;
  vendureSellerId: string;
  vendureChannelId: string;
  currency: string;
}>;
export type Address = Readonly<{countryCode: string; postalCode: string}>;
type RuleScope = SellerScope & Readonly<{
  ruleVersion: string;
  countryCode: string;
  postalPrefix: string;
}>;
export type ShippingRule = RuleScope & Readonly<{
  shippingMethod: string;
  shippingMinor: number;
}>;
export type TaxRule = RuleScope & Readonly<{
  taxCategory: string;
  rateBasisPoints: number;
}>;
type Line = Readonly<{
  lineId: string;
  netMinor: number;
  taxCategory: string;
  seller: SellerScope;
}>;

function sameScope(left: SellerScope, right: SellerScope) {
  return left.storeId === right.storeId &&
    left.operatorLegalEntityId === right.operatorLegalEntityId &&
    left.vendureSellerId === right.vendureSellerId &&
    left.vendureChannelId === right.vendureChannelId &&
    left.currency === right.currency;
}
function addressMatches(address: Address, rule: RuleScope) {
  return address.countryCode === rule.countryCode &&
    address.postalCode.startsWith(rule.postalPrefix);
}

export function calculateSellerShippingAndTax(input: Readonly<{
  seller: SellerScope;
  address: Address;
  shippingMethod: string;
  lines: readonly Line[];
  shippingRules: readonly ShippingRule[];
  taxRules: readonly TaxRule[];
}>) {
  if (!/^[A-Z]{2}$/.test(input.address.countryCode) ||
      !input.address.postalCode.trim()) throw new Error("ADDRESS_INVALID");
  if (input.lines.length < 1) throw new Error("ORDER_LINES_REQUIRED");
  if (input.lines.some((line) => !sameScope(line.seller, input.seller))) {
    throw new Error("CROSS_SELLER_ORDER_DENIED");
  }
  const shipping = input.shippingRules.filter((rule) =>
    sameScope(rule, input.seller) &&
    addressMatches(input.address, rule) &&
    rule.shippingMethod === input.shippingMethod
  );
  if (shipping.length !== 1) throw new Error("SHIPPING_RULE_UNRESOLVED");
  const lineResults = input.lines.map((line) => {
    if (!Number.isSafeInteger(line.netMinor) || line.netMinor < 0) {
      throw new Error("ORDER_LINE_AMOUNT_INVALID");
    }
    const tax = input.taxRules.filter((rule) =>
      sameScope(rule, input.seller) &&
      addressMatches(input.address, rule) &&
      rule.taxCategory === line.taxCategory
    );
    if (tax.length !== 1) throw new Error("TAX_RULE_UNRESOLVED");
    const taxMinor = Math.round(line.netMinor * tax[0].rateBasisPoints / 10_000);
    return {
      lineId: line.lineId, netMinor: line.netMinor, taxMinor,
      grossMinor: line.netMinor + taxMinor,
      taxCategory: line.taxCategory, taxRuleVersion: tax[0].ruleVersion,
    };
  });
  const netMinor = lineResults.reduce((sum, line) => sum + line.netMinor, 0);
  const taxMinor = lineResults.reduce((sum, line) => sum + line.taxMinor, 0);
  return {
    contractVersion: SELLER_SHIPPING_TAX_VERSION,
    operatorLegalEntityId: input.seller.operatorLegalEntityId,
    storeId: input.seller.storeId,
    vendureSellerId: input.seller.vendureSellerId,
    vendureChannelId: input.seller.vendureChannelId,
    currency: input.seller.currency,
    addressCountryCode: input.address.countryCode,
    shippingMethod: input.shippingMethod,
    shippingMinor: shipping[0].shippingMinor,
    shippingRuleVersion: shipping[0].ruleVersion,
    lines: lineResults,
    netMinor,
    taxMinor,
    totalMinor: netMinor + taxMinor + shipping[0].shippingMinor,
  };
}
