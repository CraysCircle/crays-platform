import {createHash} from "node:crypto";
import {requestReturn,transitionReturn,type ReturnFulfillmentAuthority} from "./return-transition-contract";
import type {SellerFulfillmentDb,SellerFulfillmentPool} from "./seller-fulfillment-repository";

type EvidenceRef=Readonly<{artifactId:string;artifactVersionId:string}>;
type EvidenceAuthority=Readonly<{artifact_id:string;artifact_version_id:string;partner_tenant_id:string;operator_legal_entity_id:string;store_id:string;evidence_state:"verified";content_sha256:string}>;
export type AuthorityBackedReturnInput=Readonly<{
  tenantId:string;fulfillmentCommandId:string;lineId:string;requestedQuantity:number;requestedAt:string;
  eligibilityWindowDays:number;reasonCode:string;evidence:readonly EvidenceRef[];idempotencyKey:string;
}>;
export type PersistReturnInput=AuthorityBackedReturnInput&Readonly<{returnRequestId:string;createdAt:string}>;
export type PersistReturnTransitionInput=Readonly<{
  tenantId:string;returnTransitionReceiptId:string;returnRequestId:string;
  targetState:"APPROVED"|"REJECTED"|"RECEIVED";actorAuthority:"partner_operator"|"warehouse_provider";
  authorityReceiptId:string;decisionReason:string;warehouseProviderReceiptId?:string;transitionedAt:string;
}>;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function snapshotAuthorityBackedReturnInput(input:AuthorityBackedReturnInput):AuthorityBackedReturnInput{
  return Object.freeze({...input,
    evidence:Object.freeze(input.evidence.map((reference)=>Object.freeze({...reference}))),
  });
}
export function snapshotPersistReturnInput(input:PersistReturnInput):PersistReturnInput{
  const snapshot=snapshotAuthorityBackedReturnInput(input);
  if(!input.returnRequestId.trim()||!Number.isFinite(Date.parse(input.createdAt)))
    throw new Error("RETURN_PERSISTENCE_INPUT_INVALID");
  return Object.freeze({...input,evidence:snapshot.evidence});
}
export function snapshotPersistReturnTransitionInput(input:PersistReturnTransitionInput):PersistReturnTransitionInput{
  const snapshot=Object.freeze({...input});
  if([snapshot.tenantId,snapshot.returnTransitionReceiptId,snapshot.returnRequestId,
    snapshot.authorityReceiptId,snapshot.decisionReason].some((value)=>!value.trim())||
    !Number.isFinite(Date.parse(snapshot.transitionedAt)))
    throw new Error("RETURN_TRANSITION_INPUT_INVALID");
  return snapshot;
}

async function transaction<T>(pool:SellerFulfillmentPool,tenantId:string,work:(db:SellerFulfillmentDb)=>Promise<T>){
  const db=await pool.connect();try{await db.query("begin");await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);const result=await work(db);await db.query("commit");return result;}catch(error){await db.query("rollback").catch(()=>undefined);throw error;}finally{db.release();}
}

async function buildAuthorityBackedReturn(db:SellerFulfillmentDb,input:AuthorityBackedReturnInput){
  const row=(await db.query<Readonly<{
    fulfillment_command_id:string;fulfillment_command_line_id:string;command_state:ReturnFulfillmentAuthority["commandState"];
    plan_sha256:string;variant_ref:string;fulfilled_quantity:string|number;order_snapshot_id:string;
    order_snapshot_sha256:string;order_id:string;partner_tenant_id:string;operator_legal_entity_id:string;store_id:string;
  }>>(`select c.fulfillment_command_id,l.fulfillment_command_line_id,c.command_state,c.plan_sha256,
    l.variant_ref,l.fulfilled_quantity,c.order_snapshot_id,c.order_snapshot_sha256,c.order_id,
    c.partner_tenant_id,c.operator_legal_entity_id,c.store_id
    from crays_core.seller_fulfillment_commands c join crays_core.seller_fulfillment_command_lines l using(fulfillment_command_id)
    where c.tenant_id=$1 and c.fulfillment_command_id=$2 and l.variant_ref=$3 for update of c,l`,
    [input.tenantId,input.fulfillmentCommandId,input.lineId])).rows[0];
  if(!row||!(["PROVIDER_ACKS_PENDING_BUSINESS_RECONCILIATION","BUSINESS_RECONCILED"] as string[]).includes(row.command_state))throw new Error("RETURN_FULFILLMENT_AUTHORITY_UNAVAILABLE");
  const receipts=(await db.query<Readonly<{provider:string;provider_receipt_id:string;observed_at:string|Date}>>(`
    select o.provider,r.provider_receipt_id,r.observed_at from crays_core.seller_fulfillment_provider_outbox o
    join crays_core.seller_fulfillment_provider_receipts r on r.provider_outbox_id=o.provider_outbox_id
    where o.tenant_id=$1 and o.fulfillment_command_id=$2 and o.fulfillment_command_line_id=$3
      and o.delivery_state='ACKNOWLEDGED_PENDING_BUSINESS_RECONCILIATION' and r.outcome='ACKNOWLEDGED'
    order by r.observed_at desc`,[input.tenantId,input.fulfillmentCommandId,row.fulfillment_command_line_id])).rows;
  const vendure=receipts.find((receipt)=>receipt.provider==="vendure");const erpnext=receipts.find((receipt)=>receipt.provider==="erpnext");
  if(!vendure||!erpnext)throw new Error("RETURN_FULFILLMENT_PROVIDER_ACKS_INCOMPLETE");
  if(input.evidence.length<1)throw new Error("RETURN_ARTIFACT_EVIDENCE_REQUIRED");
  const evidenceAuthorities:EvidenceAuthority[]=[];
  for(const ref of input.evidence){
    const authority=(await db.query<EvidenceAuthority>(`select a.artifact_id,v.artifact_version_id,
      a.partner_tenant_id,a.operator_legal_entity_id,a.store_id,v.evidence_state,v.content_sha256
      from crays_integration.artifacts a join crays_integration.artifact_versions v using(artifact_id)
      where a.artifact_id=$1 and v.artifact_version_id=$2 and a.crays_tenant_id=$3
        and a.partner_tenant_id=$4 and a.operator_legal_entity_id=$5 and a.store_id=$6
        and a.purpose='return_evidence' and a.lifecycle_state in ('active','retained')
        and v.evidence_state='verified' and v.content_sha256 is not null`,
      [ref.artifactId,ref.artifactVersionId,input.tenantId,row.partner_tenant_id,row.operator_legal_entity_id,row.store_id])).rows[0];
    if(!authority)throw new Error("RETURN_ARTIFACT_EVIDENCE_AUTHORITY_UNAVAILABLE");
    evidenceAuthorities.push(authority);
  }
  const acknowledgedAt=new Date(Math.max(new Date(vendure.observed_at).getTime(),new Date(erpnext.observed_at).getTime())).toISOString();
  const fulfillmentAuthority:ReturnFulfillmentAuthority={fulfillmentCommandId:row.fulfillment_command_id,
    fulfillmentCommandLineId:row.fulfillment_command_line_id,lineId:row.variant_ref,
    fulfilledQuantity:Number(row.fulfilled_quantity),acknowledgedAt,planSha256:row.plan_sha256,
    vendureProviderReceiptId:vendure.provider_receipt_id,erpnextProviderReceiptId:erpnext.provider_receipt_id,
    commandState:row.command_state};
  const request=requestReturn({scope:{partnerTenantId:row.partner_tenant_id,
    operatorLegalEntityId:row.operator_legal_entity_id,storeId:row.store_id,
    snapshotId:row.order_snapshot_id,snapshotSha256:row.order_snapshot_sha256,orderId:row.order_id},
    fulfillmentAuthority,requestedQuantity:input.requestedQuantity,requestedAt:input.requestedAt,
    eligibilityWindowDays:input.eligibilityWindowDays,reasonCode:input.reasonCode,
    evidence:evidenceAuthorities.map((authority)=>({artifactId:authority.artifact_id,
      artifactVersionId:authority.artifact_version_id,partnerTenantId:authority.partner_tenant_id,
      operatorLegalEntityId:authority.operator_legal_entity_id,storeId:authority.store_id,evidenceState:authority.evidence_state})),
    idempotencyKey:input.idempotencyKey});
  return {request,evidenceAuthorities};
}

export function prepareAuthorityBackedReturn(pool:SellerFulfillmentPool,input:AuthorityBackedReturnInput){
  input=snapshotAuthorityBackedReturnInput(input);
  return transaction(pool,input.tenantId,async(db)=>(await buildAuthorityBackedReturn(db,input)).request);
}

export function persistAuthorityBackedReturn(pool:SellerFulfillmentPool,input:PersistReturnInput){
  input=snapshotPersistReturnInput(input);
  return transaction(pool,input.tenantId,async(db)=>{
    const built=await buildAuthorityBackedReturn(db,input);const request=built.request;
    const prior=(await db.query<Readonly<{return_request_id:string;request_sha256:string;return_state:string}>>(
      "select return_request_id,request_sha256,return_state from crays_core.commerce_return_requests where tenant_id=$1 and idempotency_key=$2",
      [input.tenantId,input.idempotencyKey])).rows[0];
    if(prior){if(prior.return_request_id!==input.returnRequestId||prior.request_sha256!==request.requestSha256)throw new Error("RETURN_PERSISTENCE_REPLAY_CONFLICT");return Object.freeze({returnRequestId:prior.return_request_id,requestSha256:prior.request_sha256,returnState:prior.return_state,replayed:true as const});}
    await db.query(`insert into crays_core.commerce_return_requests
      (return_request_id,tenant_id,fulfillment_command_id,fulfillment_command_line_id,order_snapshot_id,
       order_snapshot_sha256,order_id,partner_tenant_id,operator_legal_entity_id,store_id,variant_ref,
       fulfilled_quantity,fulfillment_acknowledged_at,requested_quantity,requested_at,eligibility_window_days,
       reason_code,idempotency_key,request_sha256,return_state,created_at,updated_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'PENDING_EVIDENCE',$20,$20)`,
      [input.returnRequestId,input.tenantId,request.fulfillmentCommandId,request.fulfillmentCommandLineId,
       request.snapshotId,request.snapshotSha256,request.orderId,request.partnerTenantId,
       request.operatorLegalEntityId,request.storeId,request.lineId,request.fulfilledQuantity,
       request.fulfillmentAcknowledgedAt,request.requestedQuantity,input.requestedAt,input.eligibilityWindowDays,
       input.reasonCode,input.idempotencyKey,request.requestSha256,input.createdAt]);
    for(const authority of built.evidenceAuthorities)await db.query(`insert into crays_core.commerce_return_request_evidence
      (return_evidence_id,tenant_id,return_request_id,artifact_id,artifact_version_id,content_sha256,created_at)
      values($1,$2,$3,$4,$5,$6,$7)`,[`${input.returnRequestId}:${authority.artifact_version_id}`,input.tenantId,
       input.returnRequestId,authority.artifact_id,authority.artifact_version_id,authority.content_sha256,input.createdAt]);
    await db.query("update crays_core.commerce_return_requests set return_state='REQUESTED',updated_at=$1 where tenant_id=$2 and return_request_id=$3",[input.createdAt,input.tenantId,input.returnRequestId]);
    return Object.freeze({returnRequestId:input.returnRequestId,requestSha256:request.requestSha256,returnState:"REQUESTED",replayed:false as const});
  });
}

export function persistReturnTransition(pool:SellerFulfillmentPool,input:PersistReturnTransitionInput){
  input=snapshotPersistReturnTransitionInput(input);
  return transaction(pool,input.tenantId,async(db)=>{
    const current=(await db.query<Readonly<{return_state:"REQUESTED"|"APPROVED"|"REJECTED"|"RECEIVED"}>>("select return_state from crays_core.commerce_return_requests where tenant_id=$1 and return_request_id=$2 for update",[input.tenantId,input.returnRequestId])).rows[0];
    if(!current)throw new Error("RETURN_REQUEST_NOT_FOUND");
    const prior=(await db.query<Readonly<{return_transition_receipt_id:string;actor_authority:string;authority_receipt_id:string;decision_reason:string;warehouse_provider_receipt_id:string|null;transitioned_at:string|Date}>>(
      "select return_transition_receipt_id,actor_authority,authority_receipt_id,decision_reason,warehouse_provider_receipt_id,transitioned_at from crays_core.commerce_return_transition_receipts where tenant_id=$1 and return_request_id=$2 and to_state=$3",
      [input.tenantId,input.returnRequestId,input.targetState])).rows[0];
    if(prior){if(prior.return_transition_receipt_id!==input.returnTransitionReceiptId||prior.actor_authority!==input.actorAuthority||prior.authority_receipt_id!==input.authorityReceiptId||prior.decision_reason!==input.decisionReason||prior.warehouse_provider_receipt_id!==(input.warehouseProviderReceiptId??null)||new Date(prior.transitioned_at).toISOString()!==new Date(input.transitionedAt).toISOString())throw new Error("RETURN_TRANSITION_REPLAY_CONFLICT");return Object.freeze({returnTransitionReceiptId:prior.return_transition_receipt_id,toState:input.targetState,replayed:true as const});}
    const transition=transitionReturn({currentState:current.return_state,targetState:input.targetState,
      actorAuthority:input.actorAuthority,decisionReason:input.decisionReason,receiptId:input.warehouseProviderReceiptId});
    const body={returnRequestId:input.returnRequestId,...transition,actorAuthority:input.actorAuthority,
      authorityReceiptId:input.authorityReceiptId,transitionedAt:input.transitionedAt};const transitionSha256=digest(body);
    await db.query(`insert into crays_core.commerce_return_transition_receipts
      (return_transition_receipt_id,tenant_id,return_request_id,from_state,to_state,actor_authority,
       authority_receipt_id,decision_reason,warehouse_provider_receipt_id,transition_sha256,transitioned_at,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,[input.returnTransitionReceiptId,input.tenantId,
       input.returnRequestId,current.return_state,input.targetState,input.actorAuthority,input.authorityReceiptId,
       input.decisionReason,input.warehouseProviderReceiptId??null,transitionSha256,input.transitionedAt]);
    await db.query("update crays_core.commerce_return_requests set return_state=$1,updated_at=$2 where tenant_id=$3 and return_request_id=$4",[input.targetState,input.transitionedAt,input.tenantId,input.returnRequestId]);
    return Object.freeze({returnTransitionReceiptId:input.returnTransitionReceiptId,toState:input.targetState,replayed:false as const});
  });
}
