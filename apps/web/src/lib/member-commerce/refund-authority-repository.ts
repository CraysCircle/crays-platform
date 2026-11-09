import {createHash} from "node:crypto";
import {createRefundCommand} from "./refund-consequence-contract";
import {createRefundPersistenceEnvelope} from "./refund-durable-command-contract";
import type {SellerFulfillmentDb,SellerFulfillmentPool} from "./seller-fulfillment-repository";

export type PersistAuthorityBackedRefundInput=Readonly<{
  tenantId:string;refundAuthorizationId:string;refundCommandId:string;refundOutboxId:string;
  returnRequestId:string;refundAmountMinor:number;reasonCode:"duplicate"|"fraudulent"|"requested_by_customer";
  actorAccountReferenceHash:string;actorAuthority:"partner_operator"|"finance";approvalReceiptId:string;
  assuranceLevel:"AAL2"|"AAL3";authenticatedAt:string;checkedAt:string;idempotencyKey:string;committedAt:string;
}>;

type AuthorityRow=Readonly<{
  return_request_id:string;return_transition_receipt_id:string;order_snapshot_id:string;order_id:string;
  order_snapshot_sha256:string;partner_tenant_id:string;operator_legal_entity_id:string;store_id:string;
  direct_charge_command_id:string;direct_charge_provider_receipt_id:string;stripe_connected_account_id:string;
  stripe_environment:"test"|"live";payment_intent_id:string;charge_id:string;amount_minor:string|number;currency:string;
}>;
const HASH=/^[a-f0-9]{64}$/;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const validDate=(value:string)=>Number.isFinite(Date.parse(value));

async function transaction<T>(pool:SellerFulfillmentPool,tenantId:string,work:(db:SellerFulfillmentDb)=>Promise<T>){
  const db=await pool.connect();try{await db.query("begin");await db.query("select set_config('crays.app_role','integration_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);const result=await work(db);await db.query("commit");return result;}catch(error){await db.query("rollback").catch(()=>undefined);throw error;}finally{db.release();}
}

function validateInput(input:PersistAuthorityBackedRefundInput){
  if([input.tenantId,input.refundAuthorizationId,input.refundCommandId,input.refundOutboxId,input.returnRequestId,
    input.approvalReceiptId,input.idempotencyKey].some((value)=>!value.trim())||!HASH.test(input.actorAccountReferenceHash)||
    !Number.isSafeInteger(input.refundAmountMinor)||input.refundAmountMinor<1||!validDate(input.authenticatedAt)||
    !validDate(input.checkedAt)||!validDate(input.committedAt))throw new Error("REFUND_AUTHORITY_INPUT_INVALID");
}

export function prepareAuthorityBackedRefundInput(
  input:PersistAuthorityBackedRefundInput,
):PersistAuthorityBackedRefundInput{
  const snapshot=Object.freeze({...input});
  validateInput(snapshot);
  return snapshot;
}

export function persistAuthorityBackedRefund(pool:SellerFulfillmentPool,input:PersistAuthorityBackedRefundInput){
  input=prepareAuthorityBackedRefundInput(input);
  return transaction(pool,input.tenantId,async(db)=>{
    const authority=(await db.query<AuthorityRow>(`select r.return_request_id,t.return_transition_receipt_id,
      r.order_snapshot_id,r.order_id,r.order_snapshot_sha256,r.partner_tenant_id,r.operator_legal_entity_id,r.store_id,
      c.direct_charge_command_id,p.provider_receipt_id as direct_charge_provider_receipt_id,
      c.stripe_connected_account_id,c.stripe_environment,c.payment_intent_id,p.charge_id,c.amount_minor,c.currency
      from crays_core.commerce_return_requests r
      join crays_core.commerce_return_transition_receipts t on t.tenant_id=r.tenant_id and t.return_request_id=r.return_request_id and t.to_state='RECEIVED'
      join crays_core.stripe_direct_charge_commands c on c.tenant_id=r.tenant_id and c.order_snapshot_id=r.order_snapshot_id
      join crays_core.stripe_direct_charge_provider_receipts p on p.tenant_id=c.tenant_id and p.direct_charge_command_id=c.direct_charge_command_id
        and p.provider_status='succeeded' and p.signature_verified and p.payment_intent_id=c.payment_intent_id
      where r.tenant_id=$1 and r.return_request_id=$2 and r.return_state='RECEIVED'
        and c.command_state='SETTLED_PENDING_BUSINESS_RECONCILIATION' for update of r,c`,[input.tenantId,input.returnRequestId])).rows[0];
    if(!authority||!authority.charge_id)throw new Error("REFUND_DURABLE_SOURCE_AUTHORITY_UNAVAILABLE");
    const committedRow=(await db.query<Readonly<{committed:string|number}>>(`select coalesce(sum(c.refund_amount_minor),0) committed
      from crays_integration.partner_refund_commands c join crays_integration.partner_refund_command_authorities a using(refund_command_id)
      where a.crays_tenant_id=$1 and a.direct_charge_command_id=$2 and c.command_state not in ('failed','canceled')`,
      [input.tenantId,authority.direct_charge_command_id])).rows[0];
    const committed=Number(committedRow?.committed??0);
    const preflightBody={tenantId:input.tenantId,returnRequestId:authority.return_request_id,
      returnTransitionReceiptId:authority.return_transition_receipt_id,directChargeCommandId:authority.direct_charge_command_id,
      directChargeProviderReceiptId:authority.direct_charge_provider_receipt_id,orderSnapshotId:authority.order_snapshot_id,
      actorAccountReferenceHash:input.actorAccountReferenceHash,actorAuthority:input.actorAuthority,
      approvalReceiptId:input.approvalReceiptId,assuranceLevel:input.assuranceLevel,authenticatedAt:input.authenticatedAt,
      checkedAt:input.checkedAt,refundAmountMinor:input.refundAmountMinor,reasonCode:input.reasonCode,
      idempotencyKey:input.idempotencyKey};
    const preflightSha256=digest(preflightBody);
    const command=createRefundCommand({snapshot:{snapshotId:authority.order_snapshot_id,
      snapshotSha256:authority.order_snapshot_sha256,orderId:authority.order_id,
      partnerTenantId:authority.partner_tenant_id,operatorLegalEntityId:authority.operator_legal_entity_id,
      storeId:authority.store_id,stripeConnectedAccountId:authority.stripe_connected_account_id,
      stripeEnvironment:authority.stripe_environment},resolvedConnectedAccountId:authority.stripe_connected_account_id,
      paymentIntentId:authority.payment_intent_id,chargeId:authority.charge_id,
      originalAmountMinor:Number(authority.amount_minor),alreadyCommittedRefundAmountMinor:committed,
      refundAmountMinor:input.refundAmountMinor,currency:authority.currency,returnId:authority.return_request_id,
      returnState:"RECEIVED",returnReceiptId:authority.return_transition_receipt_id,reasonCode:input.reasonCode,
      actorAuthority:input.actorAuthority,approvalReceiptId:input.approvalReceiptId,preflightSha256,
      stepUp:{assuranceLevel:input.assuranceLevel,authenticatedAt:input.authenticatedAt,checkedAt:input.checkedAt,preflightSha256},
      idempotencyKey:input.idempotencyKey,billingLedgerDomain:"retail-commerce"});
    const envelope=createRefundPersistenceEnvelope({refundCommandId:input.refundCommandId,outboxId:input.refundOutboxId,command,committedAt:input.committedAt});
    const prior=(await db.query<Readonly<{refund_command_id:string;request_sha256:string}>>(
      "select refund_command_id,request_sha256 from crays_integration.partner_refund_commands where partner_tenant_id=$1 and idempotency_key=$2",
      [authority.partner_tenant_id,input.idempotencyKey])).rows[0];
    if(prior){if(prior.refund_command_id!==input.refundCommandId||prior.request_sha256!==command.requestHash)throw new Error("REFUND_COMMAND_REPLAY_CONFLICT");return Object.freeze({refundCommandId:prior.refund_command_id,requestSha256:prior.request_sha256,replayed:true as const});}
    const cr=envelope.commandRecord;const ob=envelope.outboxRecord;
    await db.query(`insert into crays_core.commerce_refund_authorizations
      (refund_authorization_id,tenant_id,return_request_id,return_transition_receipt_id,direct_charge_command_id,
       direct_charge_provider_receipt_id,order_snapshot_id,actor_account_reference_hash,actor_authority,approval_receipt_id,
       assurance_level,authenticated_at,checked_at,refund_amount_minor,reason_code,idempotency_key,preflight_sha256,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [input.refundAuthorizationId,input.tenantId,authority.return_request_id,authority.return_transition_receipt_id,
       authority.direct_charge_command_id,authority.direct_charge_provider_receipt_id,authority.order_snapshot_id,
       input.actorAccountReferenceHash,input.actorAuthority,input.approvalReceiptId,input.assuranceLevel,input.authenticatedAt,
       input.checkedAt,input.refundAmountMinor,input.reasonCode,input.idempotencyKey,preflightSha256,input.committedAt]);
    await db.query(`insert into crays_integration.partner_refund_commands
      (refund_command_id,idempotency_key,request_sha256,order_id,order_seller_snapshot_id,order_seller_snapshot_sha256,
       partner_tenant_id,operator_legal_entity_id,store_id,stripe_connected_account_id,stripe_environment,payment_intent_id,
       charge_id,original_amount_minor,committed_before_minor,refund_amount_minor,remaining_after_minor,currency,return_id,
       return_receipt_id,approval_receipt_id,preflight_sha256,assurance_level,command_state,committed_at,updated_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$25)`,
      [cr.refundCommandId,cr.idempotencyKey,cr.requestSha256,cr.orderId,cr.orderSellerSnapshotId,
       cr.orderSellerSnapshotSha256,cr.partnerTenantId,cr.operatorLegalEntityId,cr.storeId,cr.stripeConnectedAccountId,
       cr.stripeEnvironment,cr.paymentIntentId,cr.chargeId,cr.originalAmountMinor,cr.committedBeforeMinor,
       cr.refundAmountMinor,cr.remainingAfterMinor,cr.currency,cr.returnId,cr.returnReceiptId,cr.approvalReceiptId,
       cr.preflightSha256,cr.assuranceLevel,cr.commandState,cr.committedAt]);
    await db.query(`insert into crays_integration.partner_refund_command_authorities
      (refund_command_id,refund_authorization_id,crays_tenant_id,direct_charge_command_id,return_request_id,created_at)
      values($1,$2,$3,$4,$5,$6)`,[input.refundCommandId,input.refundAuthorizationId,input.tenantId,
      authority.direct_charge_command_id,authority.return_request_id,input.committedAt]);
    await db.query(`insert into crays_integration.partner_refund_outbox
      (refund_outbox_id,refund_command_id,provider,connected_account_id,idempotency_key,request_path,request_payload,
       request_sha256,delivery_state,attempt_count,available_at,created_at,updated_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$11)`,[ob.refundOutboxId,ob.refundCommandId,ob.provider,
      ob.connectedAccountId,ob.idempotencyKey,ob.requestPath,JSON.stringify(ob.requestPayload),ob.requestSha256,
      ob.deliveryState,ob.attemptCount,ob.availableAt]);
    return Object.freeze({refundCommandId:input.refundCommandId,requestSha256:command.requestHash,
      refundAuthorizationId:input.refundAuthorizationId,remainingAfterMinor:command.remainingAfterMinor,replayed:false as const});
  });
}
