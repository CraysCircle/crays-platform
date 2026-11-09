import {createHash} from "node:crypto";

export const PARTNER_COMMERCE_RECONCILIATION_VERSION = "ncrv2-143.v2" as const;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function cloneFrozenJson(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("RECONCILIATION_ACTUAL_JSON_INVALID");
    return value;
  }
  if (typeof value !== "object") throw new Error("RECONCILIATION_ACTUAL_JSON_INVALID");
  if (seen.has(value)) throw new Error("RECONCILIATION_ACTUAL_JSON_INVALID");
  seen.add(value);
  if (Array.isArray(value)) {
    const copy = value.map((item) => cloneFrozenJson(item, seen));
    seen.delete(value);
    return Object.freeze(copy);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("RECONCILIATION_ACTUAL_JSON_INVALID");
  }
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) copy[key] = cloneFrozenJson(item, seen);
  seen.delete(value);
  return Object.freeze(copy);
}

type Scope = Readonly<{
  snapshotSha256: string; orderId: string; partnerTenantId: string;
  operatorLegalEntityId: string; storeId: string;
  stripeConnectedAccountId: string; erpSiteId: string;
  erpCompanyId: string; erpWarehouseId: string;
}>;
type Values = Readonly<{
  sellerSnapshotSha256: string; orderGrossMinor: number; taxMinor: number;
  invoiceOrCreditNoteReference: string | null;
  paymentOrSettlementReference: string | null; feeMinor: number;
  physicalStockMinor: number; valuationMinor: number;
  fulfillmentState: string; refundMinor: number; erpAcknowledgementId: string | null;
}>;

export function reconcilePartnerCommerce(input: Readonly<{
  runId: string; scheduledAt: string; scope: Scope; expected: Values;
  vendure: Partial<Values>; stripe: Partial<Values>; erp: Partial<Values>;
  providerReachable: {vendure: boolean; stripe: boolean; erp: boolean};
}>) {
  if (!input.runId.trim() || !Number.isFinite(Date.parse(input.scheduledAt)) ||
      !/^[a-f0-9]{64}$/.test(input.scope.snapshotSha256)) {
    throw new Error("RECONCILIATION_INPUT_INVALID");
  }
  const issues: {kind: string; authority: string; expected: unknown; observed: unknown}[] = [];
  const add = (kind: string, authority: string, expected: unknown, observed: unknown) => {
    if (expected !== observed) issues.push({kind, authority, expected, observed});
  };
  add("seller_snapshot","CRAYS_CORE",input.scope.snapshotSha256,input.vendure.sellerSnapshotSha256);
  add("order_total","VENDURE",input.expected.orderGrossMinor,input.vendure.orderGrossMinor);
  add("tax","ERPNEXT",input.expected.taxMinor,input.erp.taxMinor);
  add("invoice_credit_note","ERPNEXT",input.expected.invoiceOrCreditNoteReference,input.erp.invoiceOrCreditNoteReference);
  add("payment_settlement","STRIPE_CONNECTED_ACCOUNT",input.expected.paymentOrSettlementReference,input.stripe.paymentOrSettlementReference);
  add("fees","STRIPE_AND_ERPNEXT",input.expected.feeMinor,input.stripe.feeMinor);
  add("physical_stock","ERPNEXT",input.expected.physicalStockMinor,input.erp.physicalStockMinor);
  add("valuation","ERPNEXT",input.expected.valuationMinor,input.erp.valuationMinor);
  add("fulfillment","VENDURE",input.expected.fulfillmentState,input.vendure.fulfillmentState);
  add("refund","STRIPE_AND_ERPNEXT",input.expected.refundMinor,input.stripe.refundMinor);
  if (!input.erp.erpAcknowledgementId) {
    issues.push({kind:"missing_acknowledgement",authority:"ERPNEXT",expected:input.expected.erpAcknowledgementId,observed:null});
  }
  for (const [name, reachable] of Object.entries(input.providerReachable)) {
    if (!reachable) issues.push({kind:"provider_unreachable",authority:name.toUpperCase(),expected:true,observed:false});
  }
  const immutableIssues = Object.freeze(issues.map((issue) => Object.freeze({...issue})));
  const body = {
    contractVersion: PARTNER_COMMERCE_RECONCILIATION_VERSION,
    runId: input.runId, scheduledAt: input.scheduledAt, ...input.scope, issues: immutableIssues,
    state: immutableIssues.length ? "EXCEPTION_OPEN" as const : "MATCHED" as const,
    ownerRole: immutableIssues.some((issue) => ["payment_settlement","fees","valuation","tax","invoice_credit_note","refund","missing_acknowledgement"].includes(issue.kind)) ? "finance" as const : "partner_operator" as const,
    nextSafeAction: immutableIssues.length ? "inspect_and_reconcile" as const : "acknowledge_match" as const,
  };
  return Object.freeze({...body, reconciliationSha256: digest(body)});
}

export function projectPartnerReconciliation(
  result: ReturnType<typeof reconcilePartnerCommerce>,
  viewer: Readonly<{authority:"partner_operator"|"finance"|"customer"|"crays_aggregate";partnerTenantId?:string;operatorLegalEntityId?:string;storeId?:string}>,
) {
  if (viewer.authority === "customer" || viewer.authority === "crays_aggregate") {
    throw new Error("RECONCILIATION_DETAIL_DENIED");
  }
  if (viewer.partnerTenantId !== result.partnerTenantId ||
      viewer.operatorLegalEntityId !== result.operatorLegalEntityId ||
      viewer.storeId !== result.storeId) {
    throw new Error("RECONCILIATION_SCOPE_MISMATCH");
  }
  return Object.freeze({...result, actionable: true as const});
}

export function preparePartnerCommerceReconciliationPersistence(
  result: ReturnType<typeof reconcilePartnerCommerce>,
  input: Readonly<{
    tenantId: string; observationId: string; reconciliationReceiptId: string;
    exportId: string; accountingPeriod: string; erpAcknowledgementId: string;
    acknowledgedAt: string; actualObservedAt: string; reconciledAt: string;
    expectedActual: Readonly<Record<string, unknown>>;
    observedActual: Readonly<Record<string, unknown>>;
    sourceReceiptSha256: string; sourceSignatureVerified: boolean;
    reconciledByAssignmentId: string;
  }>,
) {
  if (!input.tenantId.trim() || !input.observationId.trim() ||
      !input.reconciliationReceiptId.trim() || !input.exportId.trim() ||
      !input.erpAcknowledgementId.trim() || !input.reconciledByAssignmentId.trim() ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.accountingPeriod) ||
      !/^[a-f0-9]{64}$/.test(input.sourceReceiptSha256) || !input.sourceSignatureVerified) {
    throw new Error("RECONCILIATION_PERSISTENCE_INPUT_INVALID");
  }
  const acknowledged = Date.parse(input.acknowledgedAt);
  const observed = Date.parse(input.actualObservedAt);
  const reconciled = Date.parse(input.reconciledAt);
  if (!Number.isFinite(acknowledged) || !Number.isFinite(observed) ||
      !Number.isFinite(reconciled) || observed < acknowledged || reconciled < observed) {
    throw new Error("RECONCILIATION_PERSISTENCE_TIME_INVALID");
  }
  const expectedActual = cloneFrozenJson(input.expectedActual) as Readonly<Record<string, unknown>>;
  const observedActual = cloneFrozenJson(input.observedActual) as Readonly<Record<string, unknown>>;
  const expectedActualSha256 = digest(expectedActual);
  const observedActualSha256 = digest(observedActual);
  const matched = result.state === "MATCHED" && result.issues.length === 0 &&
    expectedActualSha256 === observedActualSha256;
  const observationRecord = Object.freeze({
    observationId: input.observationId, tenantId: input.tenantId,
    partnerTenantId: result.partnerTenantId,
    operatorLegalEntityId: result.operatorLegalEntityId, storeId: result.storeId,
    orderId: result.orderId, orderSellerSnapshotSha256: result.snapshotSha256,
    erpSiteId: result.erpSiteId, erpCompanyId: result.erpCompanyId,
    accountingPeriod: input.accountingPeriod,
    erpAcknowledgementId: input.erpAcknowledgementId,
    acknowledgedAt: new Date(acknowledged).toISOString(),
    actualObservedAt: new Date(observed).toISOString(),
    actualPayload: observedActual, actualSha256: observedActualSha256,
    sourceReceiptSha256: input.sourceReceiptSha256,
    sourceSignatureVerified: true as const,
  });
  const receiptBody = {
    reconciliationReceiptId: input.reconciliationReceiptId,
    observationId: input.observationId, tenantId: input.tenantId,
    partnerTenantId: result.partnerTenantId,
    operatorLegalEntityId: result.operatorLegalEntityId, storeId: result.storeId,
    orderId: result.orderId, accountingPeriod: input.accountingPeriod,
    expectedActualSha256, observedActualSha256,
    reconciliationState: matched ? "MATCHED" as const : "MISMATCH" as const,
    nextSafeAction: matched ? "close" as const : "investigate_mismatch" as const,
    reconciledByAssignmentId: input.reconciledByAssignmentId,
    reconciledAt: new Date(reconciled).toISOString(),
  };
  const reconciliationReceipt = Object.freeze({...receiptBody, receiptSha256: digest(receiptBody)});
  const exportRecord = matched ? Object.freeze({
    exportId: input.exportId,
    reconciliationReceiptId: input.reconciliationReceiptId,
    observationId: input.observationId, tenantId: input.tenantId,
    partnerTenantId: result.partnerTenantId,
    operatorLegalEntityId: result.operatorLegalEntityId, storeId: result.storeId,
    orderId: result.orderId, accountingPeriod: input.accountingPeriod,
    actualSha256: observedActualSha256,
    sourceReceiptSha256: input.sourceReceiptSha256,
    reconciliationReceiptSha256: reconciliationReceipt.receiptSha256,
    exportState: "RECONCILED_EXACT_STORE_PERIOD_ACTUAL" as const,
  }) : null;
  return Object.freeze({
    observationRecord, reconciliationReceipt, exportRecord,
    persistenceSha256: digest({observationRecord, reconciliationReceipt, exportRecord}),
  });
}

export function snapshotPreparedCommerceReconciliation(
  prepared: ReturnType<typeof preparePartnerCommerceReconciliationPersistence>,
) {
  const observationRecord = Object.freeze({
    ...prepared.observationRecord,
    actualPayload: cloneFrozenJson(prepared.observationRecord.actualPayload) as Readonly<Record<string, unknown>>,
  });
  const reconciliationReceipt = Object.freeze({...prepared.reconciliationReceipt});
  const exportRecord = prepared.exportRecord ? Object.freeze({...prepared.exportRecord}) : null;
  const persistenceSha256 = digest({observationRecord, reconciliationReceipt, exportRecord});
  if (persistenceSha256 !== prepared.persistenceSha256) {
    throw new Error("COMMERCE_RECONCILIATION_PREPARED_INPUT_CONFLICT");
  }
  return Object.freeze({observationRecord, reconciliationReceipt, exportRecord, persistenceSha256});
}
