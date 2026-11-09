import {createHash} from "node:crypto";
export const RETURN_TRANSITION_VERSION="ncrv2-136.v2" as const;
type Scope=Readonly<{partnerTenantId:string;operatorLegalEntityId:string;storeId:string;snapshotId:string;snapshotSha256:string;orderId:string}>;
type Evidence=Readonly<{artifactId:string;artifactVersionId:string;partnerTenantId:string;operatorLegalEntityId:string;storeId:string;evidenceState:"verified"|"pending"|"revoked"}>;
const digest=(v:object)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
export type ReturnFulfillmentAuthority=Readonly<{
  fulfillmentCommandId:string;fulfillmentCommandLineId:string;lineId:string;fulfilledQuantity:number;
  acknowledgedAt:string;planSha256:string;vendureProviderReceiptId:string;erpnextProviderReceiptId:string;
  commandState:"PROVIDER_ACKS_PENDING_BUSINESS_RECONCILIATION"|"BUSINESS_RECONCILED";
}>;
export function requestReturn(input:Readonly<{scope:Scope;fulfillmentAuthority:ReturnFulfillmentAuthority;requestedQuantity:number;requestedAt:string;eligibilityWindowDays:number;reasonCode:string;evidence:readonly Evidence[];idempotencyKey:string}>) {
  const authority=input.fulfillmentAuthority;
  const fulfilledAt=new Date(authority.acknowledgedAt),requestedAt=new Date(input.requestedAt);
  if(Number.isNaN(fulfilledAt.getTime())||Number.isNaN(requestedAt.getTime())||requestedAt<fulfilledAt||requestedAt.getTime()-fulfilledAt.getTime()>input.eligibilityWindowDays*86400000) throw new Error("RETURN_NOT_ELIGIBLE");
  if(!authority.fulfillmentCommandId.trim()||!authority.fulfillmentCommandLineId.trim()||!authority.lineId.trim()||
    !authority.vendureProviderReceiptId.trim()||!authority.erpnextProviderReceiptId.trim()||
    !/^[a-f0-9]{64}$/.test(authority.planSha256)||!Number.isSafeInteger(authority.fulfilledQuantity)||
    authority.fulfilledQuantity<1) throw new Error("RETURN_FULFILLMENT_AUTHORITY_INVALID");
  if(!Number.isSafeInteger(input.requestedQuantity)||input.requestedQuantity<1||input.requestedQuantity>authority.fulfilledQuantity) throw new Error("RETURN_QUANTITY_INVALID");
  if(!input.reasonCode.trim()||!input.idempotencyKey.trim()) throw new Error("RETURN_REQUEST_INVALID");
  for(const evidence of input.evidence) if(evidence.evidenceState!=="verified"||evidence.partnerTenantId!==input.scope.partnerTenantId||evidence.operatorLegalEntityId!==input.scope.operatorLegalEntityId||evidence.storeId!==input.scope.storeId) throw new Error("RETURN_EVIDENCE_SCOPE_MISMATCH");
  const evidenceRefs=Object.freeze(input.evidence.map(e=>Object.freeze({artifactId:e.artifactId,artifactVersionId:e.artifactVersionId})));
  const body={contractVersion:RETURN_TRANSITION_VERSION,...input.scope,lineId:authority.lineId,
    fulfillmentCommandId:authority.fulfillmentCommandId,fulfillmentCommandLineId:authority.fulfillmentCommandLineId,
    fulfillmentPlanSha256:authority.planSha256,vendureProviderReceiptId:authority.vendureProviderReceiptId,
    erpnextProviderReceiptId:authority.erpnextProviderReceiptId,fulfilledQuantity:authority.fulfilledQuantity,
    fulfillmentAcknowledgedAt:authority.acknowledgedAt,requestedQuantity:input.requestedQuantity,
    reasonCode:input.reasonCode,evidenceRefs,idempotencyKey:input.idempotencyKey,state:"REQUESTED" as const};
  return Object.freeze({...body,requestSha256:digest(body)});
}
export function adjudicateReturnReplay(prior:Readonly<{idempotencyKey:string;requestSha256:string;requestId:string}>,request:ReturnType<typeof requestReturn>){if(prior.idempotencyKey!==request.idempotencyKey)return{replay:false as const};if(prior.requestSha256!==request.requestSha256)throw new Error("RETURN_IDEMPOTENCY_COLLISION");return{replay:true as const,requestId:prior.requestId};}
export function transitionReturn(input:Readonly<{currentState:"REQUESTED"|"APPROVED"|"REJECTED"|"RECEIVED";targetState:"APPROVED"|"REJECTED"|"RECEIVED";actorAuthority:"partner_operator"|"warehouse_provider"|"browser";decisionReason:string;receiptId?:string}>) {
  const allowed=input.currentState==="REQUESTED"&&(input.targetState==="APPROVED"||input.targetState==="REJECTED")&&input.actorAuthority==="partner_operator"||input.currentState==="APPROVED"&&input.targetState==="RECEIVED"&&input.actorAuthority==="warehouse_provider";
  if(!allowed)throw new Error("RETURN_TRANSITION_DENIED");
  if(!input.decisionReason.trim()||(input.targetState==="RECEIVED"&&!input.receiptId?.trim()))throw new Error("RETURN_TRANSITION_RECEIPT_REQUIRED");
  return Object.freeze({fromState:input.currentState,toState:input.targetState,decisionReason:input.decisionReason,receiptId:input.receiptId??null});
}
