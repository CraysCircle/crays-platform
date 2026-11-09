import {createHash} from "node:crypto";
import {
  persistCheckoutOrderTransition,
  type CheckoutOrderPool,
} from "./checkout-order-transition-repository";
import {
  verifyStorefrontOrderConversionPlan,
  type StorefrontOrderConversionPlan,
} from "./storefront-order-conversion-plan";

export type ExecuteStorefrontOrderPlanInput=Readonly<{
  plan:StorefrontOrderConversionPlan;
  transitionReceiptId:string;
  outboxEventId:string;
  createdAt:string;
}>;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function executeStorefrontOrderConversionPlan(
  pool:CheckoutOrderPool,
  candidate:ExecuteStorefrontOrderPlanInput,
){
  const untrusted=candidate as unknown as Record<string,unknown>;
  for(const key of ["browserClaimedTotalMinor","browserClaimedPaymentState",
    "vendureSellerId","vendureChannelId","stripeConnectedAccountId"]){
    if(Object.hasOwn(untrusted,key))throw new Error("STOREFRONT_ORDER_COMMAND_BROWSER_AUTHORITY_DENIED");
  }
  const plan=verifyStorefrontOrderConversionPlan(candidate.plan);
  if(!candidate.transitionReceiptId.trim()||!candidate.outboxEventId.trim()||
    !Number.isFinite(Date.parse(candidate.createdAt))){
    throw new Error("STOREFRONT_ORDER_COMMAND_INPUT_INVALID");
  }
  const receiptSha256=digest({
    contractVersion:"ncrv2-134.atomic-order-command.v1",
    planSha256:plan.planSha256,
    transitionReceiptId:candidate.transitionReceiptId,
    outboxEventId:candidate.outboxEventId,
    createdAt:candidate.createdAt,
  });
  return persistCheckoutOrderTransition(pool,{
    tenantId:plan.tenantId,
    orderSnapshotId:plan.orderSnapshotId,
    transitionReceiptId:candidate.transitionReceiptId,
    idempotencyKey:plan.idempotencyKey,
    receiptSha256,
    outboxEventId:candidate.outboxEventId,
    payloadSha256:plan.planSha256,
    planSha256:plan.planSha256,
    preflightResultSha256:plan.preflightResultSha256,
    preflightRequestSha256:plan.preflight.requestSha256,
    sellerDisclosureSha256:plan.sellerDisclosureSha256,
    expectedCurrency:plan.expectedCurrency,
    createdAt:candidate.createdAt,
    snapshot:plan.snapshot,
  });
}
