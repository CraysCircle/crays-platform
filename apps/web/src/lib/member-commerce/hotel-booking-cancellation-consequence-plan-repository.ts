import {createHash} from "node:crypto";
import type {createHotelCancellationFinalizationPlan} from "./hotel-booking-cancellation-finalization-plan-repository";
import type {createHotelCancellationApplicationReceipt} from "./hotel-booking-cancellation-application-receipt-repository";

export const HOTEL_CANCELLATION_CONSEQUENCE_PLAN_VERSION =
  "cclub.phase9.hotel-cancellation-consequence-plan.v1" as const;
type Plan=ReturnType<typeof createHotelCancellationFinalizationPlan>;
type Application=ReturnType<typeof createHotelCancellationApplicationReceipt>;
const SHA=/^[a-f0-9]{64}$/;const digest=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
export type CancellationConsequenceDb=Readonly<{query<T=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<Readonly<{rows:T[]}>>;release():void}>;
export type CancellationConsequencePool=Readonly<{connect():Promise<CancellationConsequenceDb>}>;

export type CreateHotelCancellationConsequencePlanInput=Readonly<{
  consequencePlanId:string;plan:Plan;application:Application;createdAt:string;
  vendure:Readonly<{outboxId:string;finalBookingVendureLinkReceiptId:string;orderId:string;
    deliveredDispatchReceiptId:string;deliveredPayloadSha256:string;status:"DELIVERED"}>;
  erpnext:Readonly<{outboxId:string;routingReceiptId:string;erpSiteId:string;erpCompanyId:string;
    erpWarehouseId:string;fiscalJurisdiction:string;operatingLegalEntityId:string;routingSha256:string;status:"READY"}>;
  ambassador:Readonly<{outboxId:string;operationsReceiptId:string;ambassadorId:string|null;
    attributionStatus:"confirmed-ambassador"|"unassigned";operationsSha256:string}>;
}>;

export function createHotelCancellationConsequencePlan(input:CreateHotelCancellationConsequencePlanInput){
  const {plan,application}=input;
  if(!input.consequencePlanId.trim()||![input.vendure.outboxId,input.erpnext.outboxId,input.ambassador.outboxId].every(v=>v.trim()))
    throw new Error("HOTEL_CANCELLATION_CONSEQUENCE_REFERENCE_REQUIRED");
  if(application.applicationState!=="applied-by-verified-transaction"||!application.inventoryReleased||
    !application.revenueReversed||!application.bookingCanceled||application.payoutAuthorized||
    application.finalizationPlanId!==plan.finalizationPlanId||application.finalBookingReceiptId!==plan.finalBookingReceiptId||
    !SHA.test(application.applicationSha256)||plan.planState!=="eligible-not-applied"||!SHA.test(plan.planSha256))
    throw new Error("HOTEL_CANCELLATION_CONSEQUENCE_APPLICATION_INVALID");
  if(input.vendure.status!=="DELIVERED"||![input.vendure.finalBookingVendureLinkReceiptId,input.vendure.orderId,
    input.vendure.deliveredDispatchReceiptId].every(v=>v.trim())||!SHA.test(input.vendure.deliveredPayloadSha256))
    throw new Error("HOTEL_CANCELLATION_CONSEQUENCE_VENDURE_SOURCE_INVALID");
  if(input.erpnext.status!=="READY"||![input.erpnext.routingReceiptId,input.erpnext.erpSiteId,input.erpnext.erpCompanyId,
    input.erpnext.erpWarehouseId,input.erpnext.fiscalJurisdiction,input.erpnext.operatingLegalEntityId].every(v=>v.trim())||
    !SHA.test(input.erpnext.routingSha256))throw new Error("HOTEL_CANCELLATION_CONSEQUENCE_ERP_ROUTING_INVALID");
  if(!input.ambassador.operationsReceiptId.trim()||!SHA.test(input.ambassador.operationsSha256)||
    (input.ambassador.attributionStatus==="confirmed-ambassador"&&!input.ambassador.ambassadorId?.trim())||
    (input.ambassador.attributionStatus==="unassigned"&&input.ambassador.ambassadorId!==null))
    throw new Error("HOTEL_CANCELLATION_CONSEQUENCE_AMBASSADOR_SCOPE_INVALID");
  const common={consequencePlanId:input.consequencePlanId,applicationReceiptId:application.applicationReceiptId,
    applicationSha256:application.applicationSha256,finalizationPlanId:plan.finalizationPlanId,
    finalBookingReceiptId:plan.finalBookingReceiptId,tenantId:plan.tenantId,projectId:plan.projectId,
    siteId:plan.siteId,propertyId:plan.propertyId,currency:plan.currency,refundAmountMinor:plan.refundAmountMinor};
  const definitions=[
    {consequenceOutboxId:input.vendure.outboxId,targetAuthority:"vendure" as const,
      consequenceType:"hotel-booking-cancellation-and-refund-state" as const,
      payload:{...common,operation:"record_hotel_booking_cancellation_and_refund" as const,
        finalBookingVendureLinkReceiptId:input.vendure.finalBookingVendureLinkReceiptId,orderId:input.vendure.orderId,
        deliveredDispatchReceiptId:input.vendure.deliveredDispatchReceiptId,
        deliveredPayloadSha256:input.vendure.deliveredPayloadSha256,requestedState:"CancelledRefundFinal" as const}},
    {consequenceOutboxId:input.erpnext.outboxId,targetAuthority:"erpnext" as const,
      consequenceType:"hotel-cancellation-credit-note-and-accrual-reversal" as const,
      payload:{...common,operation:"create_credit_note_and_reverse_hotel_accruals" as const,
        routingReceiptId:input.erpnext.routingReceiptId,erpSiteId:input.erpnext.erpSiteId,
        erpCompanyId:input.erpnext.erpCompanyId,erpWarehouseId:input.erpnext.erpWarehouseId,
        fiscalJurisdiction:input.erpnext.fiscalJurisdiction,operatingLegalEntityId:input.erpnext.operatingLegalEntityId,
        routingSha256:input.erpnext.routingSha256,reversalEntrySha256:plan.reversals.map(e=>e.entrySha256)}},
    {consequenceOutboxId:input.ambassador.outboxId,targetAuthority:"ambassador-operations" as const,
      consequenceType:"ambassador-booking-canceled-and-refund-final" as const,
      payload:{...common,operation:"record_booking_canceled_and_refund_final" as const,
        operationsReceiptId:input.ambassador.operationsReceiptId,ambassadorId:input.ambassador.ambassadorId,
        attributionStatus:input.ambassador.attributionStatus,operationsSha256:input.ambassador.operationsSha256,
        admissionStateChanged:false as const,auditDecisionChanged:false as const,payoutAuthorized:false as const}},
  ];
  const outbox=definitions.map(d=>Object.freeze({...d,idempotencyKey:`hotel-cancel:${application.applicationSha256}:${d.targetAuthority}`,
    payloadSha256:digest(d.payload),deliveryState:"not-dispatched" as const,attemptCount:0}));
  const body={contractVersion:HOTEL_CANCELLATION_CONSEQUENCE_PLAN_VERSION,consequencePlanId:input.consequencePlanId,
    cancellationApplicationReceiptId:application.applicationReceiptId,finalizationPlanId:plan.finalizationPlanId,
    tenantId:plan.tenantId,finalBookingReceiptId:plan.finalBookingReceiptId,createdAt:input.createdAt,outbox};
  return Object.freeze({...body,consequencePlanSha256:digest(body),planState:"not-dispatched" as const,
    payoutAuthorized:false as const,externalDispatchPerformed:false as const,formalActionAuthorized:false as const});
}

export async function persistHotelCancellationConsequencePlan(pool:CancellationConsequencePool,input:CreateHotelCancellationConsequencePlanInput){
  const plan=createHotelCancellationConsequencePlan(input),db=await pool.connect();
  try{await db.query("begin");await db.query("select set_config('crays.app_role','integration_service',true),set_config('crays.tenant_id',$1,true)",[plan.tenantId]);
    await db.query(`insert into crays_integration.clubs_hotel_cancellation_consequence_plans
      (consequence_plan_id,cancellation_application_receipt_id,finalization_plan_id,tenant_id,final_booking_receipt_id,
       consequence_plan_sha256,plan_state,payout_authorized,external_dispatch_performed,formal_action_authorized,created_at)
      values($1,$2,$3,$4,$5,$6,'not-dispatched',false,false,false,$7)`,[plan.consequencePlanId,plan.cancellationApplicationReceiptId,
      plan.finalizationPlanId,plan.tenantId,plan.finalBookingReceiptId,plan.consequencePlanSha256,plan.createdAt]);
    for(const e of plan.outbox)await db.query(`insert into crays_integration.clubs_hotel_cancellation_consequence_outbox
      (consequence_outbox_id,consequence_plan_id,tenant_id,target_authority,consequence_type,idempotency_key,payload,
       payload_sha256,delivery_state,attempt_count,created_at) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8,'not-dispatched',0,$9)`,
      [e.consequenceOutboxId,plan.consequencePlanId,plan.tenantId,e.targetAuthority,e.consequenceType,e.idempotencyKey,
       JSON.stringify(e.payload),e.payloadSha256,plan.createdAt]);
    await db.query("set constraints clubs_hotel_cancellation_consequence_set_exact_guard immediate");await db.query("commit");return plan;
  }catch(error){await db.query("rollback").catch(()=>undefined);throw error;}finally{db.release();}}
