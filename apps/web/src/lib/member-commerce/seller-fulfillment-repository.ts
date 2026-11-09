import {createHash} from "node:crypto";
import {verifyFrozenOrderSellerSnapshot,type FrozenOrderSellerSnapshot} from "./checkout-order-transition-contract";
import {createSellerFulfillmentPlan} from "./seller-fulfillment-contract";

type Result<Row>=Readonly<{rows:Row[]}>;
export type SellerFulfillmentDb=Readonly<{query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<Result<Row>>}>;
export type SellerFulfillmentPool=Readonly<{connect():Promise<SellerFulfillmentDb&Readonly<{release():void}>>}>;
export type SellerFulfillmentCommandInput=Readonly<{
  tenantId:string;fulfillmentCommandId:string;orderSnapshotId:string;idempotencyKey:string;createdAt:string;
  instructions:readonly Readonly<{lineId:string;fulfillQuantity:number;cancelQuantity:number;reservationRef:string}>[];
  shipment?:Readonly<{carrierCode:string;trackingCode:string}>;
}>;
export type SellerFulfillmentProviderReceiptInput=Readonly<{
  tenantId:string;providerReceiptId:string;providerOutboxId:string;providerEventId:string;
  providerObjectId:string;provider:"vendure"|"erpnext";signatureVerified:boolean;
  outcome:"ACKNOWLEDGED"|"REJECTED"|"UNKNOWN";eventPayloadSha256:string;observedAt:string;
}>;
const HASH=/^[a-f0-9]{64}$/;
const nonempty=(value:string)=>value.trim().length>0;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function transaction<T>(pool:SellerFulfillmentPool,tenantId:string,work:(db:SellerFulfillmentDb)=>Promise<T>){
  const db=await pool.connect();try{await db.query("begin");await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);const result=await work(db);await db.query("commit");return result;}catch(error){await db.query("rollback").catch(()=>undefined);throw error;}finally{db.release();}
}

export function persistSellerFulfillmentCommand(pool:SellerFulfillmentPool,input:SellerFulfillmentCommandInput){
  input=prepareSellerFulfillmentCommandInput(input);
  return transaction(pool,input.tenantId,async(db)=>{
    const row=(await db.query<Readonly<{snapshot_payload:FrozenOrderSellerSnapshot|string;partner_tenant_id:string}>>(
      "select snapshot_payload,partner_tenant_id from crays_core.checkout_order_snapshots where tenant_id=$1 and order_snapshot_id=$2 for update",
      [input.tenantId,input.orderSnapshotId])).rows[0];
    if(!row)throw new Error("SELLER_FULFILLMENT_ORDER_SNAPSHOT_NOT_FOUND");
    const snapshot=verifyFrozenOrderSellerSnapshot((typeof row.snapshot_payload==="string"?JSON.parse(row.snapshot_payload):row.snapshot_payload) as FrozenOrderSellerSnapshot);
    const plan=createSellerFulfillmentPlan({orderSnapshotId:input.orderSnapshotId,snapshot,instructions:input.instructions,shipment:input.shipment});
    const prior=(await db.query<Readonly<{fulfillment_command_id:string;order_snapshot_id:string;plan_sha256:string;command_state:string}>>(
      "select fulfillment_command_id,order_snapshot_id,plan_sha256,command_state from crays_core.seller_fulfillment_commands where tenant_id=$1 and idempotency_key=$2",
      [input.tenantId,input.idempotencyKey])).rows[0];
    if(prior){if(prior.fulfillment_command_id!==input.fulfillmentCommandId||prior.order_snapshot_id!==input.orderSnapshotId||prior.plan_sha256!==plan.consequenceSha256)throw new Error("SELLER_FULFILLMENT_COMMAND_REPLAY_CONFLICT");return Object.freeze({fulfillmentCommandId:prior.fulfillment_command_id,planSha256:prior.plan_sha256,commandState:prior.command_state,replayed:true as const});}
    await db.query(`insert into crays_core.seller_fulfillment_commands
      (fulfillment_command_id,tenant_id,order_snapshot_id,order_snapshot_sha256,order_id,partner_tenant_id,
       operator_legal_entity_id,store_id,vendure_seller_id,vendure_channel_id,erp_site_id,erp_company_id,
       idempotency_key,plan_sha256,command_state,created_at,updated_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PERSISTED_PENDING_PROVIDERS',$15,$15)`,
      [input.fulfillmentCommandId,input.tenantId,input.orderSnapshotId,snapshot.snapshotSha256,snapshot.orderId,
       row.partner_tenant_id,snapshot.operatorLegalEntityId,snapshot.storeId,snapshot.vendureSellerId,
       snapshot.vendureChannelId,snapshot.erpSiteId,snapshot.erpCompanyId,input.idempotencyKey,
       plan.consequenceSha256,input.createdAt]);
    for(const consequence of plan.consequences){
      const lineId=`${input.orderSnapshotId}:${consequence.lineId}`;
      const commandLineId=`${input.fulfillmentCommandId}:${consequence.lineId}`;
      await db.query(`insert into crays_core.seller_fulfillment_command_lines
        (fulfillment_command_line_id,tenant_id,fulfillment_command_id,order_snapshot_id,order_snapshot_line_id,
         variant_ref,ordered_quantity,fulfilled_quantity,canceled_quantity,remaining_quantity,reservation_ref,
         erp_item_mapping_id,erp_item_mapping_version,erp_item_code,warehouse_mapping_id,
         warehouse_mapping_version,erp_warehouse_id,created_at)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [commandLineId,input.tenantId,input.fulfillmentCommandId,input.orderSnapshotId,lineId,consequence.lineId,
         consequence.fulfilledQuantity+consequence.canceledQuantity+consequence.remainingQuantity,
         consequence.fulfilledQuantity,consequence.canceledQuantity,consequence.remainingQuantity,
         consequence.reservationRef,consequence.erpItemMappingId,consequence.erpItemMappingVersion,
         consequence.stockItemRef,consequence.warehouseMappingId,consequence.warehouseMappingVersion,
         consequence.erpWarehouseId,input.createdAt]);
      for(const provider of ["vendure","erpnext"] as const){
        const payload=provider==="vendure"?{orderId:snapshot.orderId,variantRef:consequence.lineId,
          reservationRef:consequence.reservationRef,fulfilledQuantity:consequence.fulfilledQuantity,
          canceledQuantity:consequence.canceledQuantity,sellerId:snapshot.vendureSellerId,
          channelId:snapshot.vendureChannelId,snapshotSha256:snapshot.snapshotSha256}:
          {orderId:snapshot.orderId,variantRef:consequence.lineId,erpItemCode:consequence.stockItemRef,
          erpWarehouseId:consequence.erpWarehouseId,stockDelta:consequence.stockDelta,
          erpSiteId:snapshot.erpSiteId,erpCompanyId:snapshot.erpCompanyId,
          snapshotSha256:snapshot.snapshotSha256,planSha256:plan.consequenceSha256};
        await db.query(`insert into crays_core.seller_fulfillment_provider_outbox
          (provider_outbox_id,tenant_id,fulfillment_command_id,fulfillment_command_line_id,provider,
           target_operation,payload,payload_sha256,idempotency_key,delivery_state,created_at)
          values($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,'PENDING',$10)`,
          [`${commandLineId}:${provider}`,input.tenantId,input.fulfillmentCommandId,commandLineId,provider,
           provider==="vendure"?"fulfillment.transition":"crays.erp.apply_commerce_consequence",
           JSON.stringify(payload),digest(payload),`${input.idempotencyKey}:${consequence.lineId}:${provider}`,input.createdAt]);
      }
    }
    return Object.freeze({fulfillmentCommandId:input.fulfillmentCommandId,planSha256:plan.consequenceSha256,commandState:"PERSISTED_PENDING_PROVIDERS",replayed:false as const});
  });
}

export function prepareSellerFulfillmentCommandInput(input:SellerFulfillmentCommandInput):SellerFulfillmentCommandInput{
  const snapshot=Object.freeze({...input,
    instructions:Object.freeze(input.instructions.map((instruction)=>Object.freeze({...instruction}))),
    shipment:input.shipment?Object.freeze({...input.shipment}):undefined,
  });
  if([snapshot.tenantId,snapshot.fulfillmentCommandId,snapshot.orderSnapshotId,snapshot.idempotencyKey]
    .some((value)=>!nonempty(value))||!Number.isFinite(Date.parse(snapshot.createdAt)))
    throw new Error("SELLER_FULFILLMENT_COMMAND_INPUT_INVALID");
  return snapshot;
}

export function persistSellerFulfillmentProviderReceipt(pool:SellerFulfillmentPool,input:SellerFulfillmentProviderReceiptInput){
  input=prepareSellerFulfillmentProviderReceiptInput(input);
  return transaction(pool,input.tenantId,async(db)=>{
    const outbox=(await db.query<Readonly<{fulfillment_command_id:string;provider:string}>>(
      "select fulfillment_command_id,provider from crays_core.seller_fulfillment_provider_outbox where tenant_id=$1 and provider_outbox_id=$2 for update",
      [input.tenantId,input.providerOutboxId])).rows[0];
    if(!outbox||outbox.provider!==input.provider)throw new Error("SELLER_FULFILLMENT_PROVIDER_OUTBOX_SCOPE_MISMATCH");
    const prior=(await db.query<Readonly<{provider_receipt_id:string;provider_outbox_id:string;provider_object_id:string;outcome:string;event_payload_sha256:string}>>(
      "select provider_receipt_id,provider_outbox_id,provider_object_id,outcome,event_payload_sha256 from crays_core.seller_fulfillment_provider_receipts where tenant_id=$1 and provider=$2 and provider_event_id=$3",
      [input.tenantId,input.provider,input.providerEventId])).rows[0];
    if(prior){if(prior.provider_receipt_id!==input.providerReceiptId||prior.provider_outbox_id!==input.providerOutboxId||prior.provider_object_id!==input.providerObjectId||prior.outcome!==input.outcome||prior.event_payload_sha256!==input.eventPayloadSha256)throw new Error("SELLER_FULFILLMENT_PROVIDER_EVENT_REPLAY_CONFLICT");return Object.freeze({providerReceiptId:prior.provider_receipt_id,replayed:true as const});}
    await db.query(`insert into crays_core.seller_fulfillment_provider_receipts
      (provider_receipt_id,tenant_id,provider_outbox_id,fulfillment_command_id,provider,provider_event_id,
       provider_object_id,signature_verified,outcome,event_payload_sha256,observed_at,created_at)
      values($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$10)`,
      [input.providerReceiptId,input.tenantId,input.providerOutboxId,outbox.fulfillment_command_id,input.provider,
       input.providerEventId,input.providerObjectId,input.outcome,input.eventPayloadSha256,input.observedAt]);
    const delivery=input.outcome==="ACKNOWLEDGED"?"ACKNOWLEDGED_PENDING_BUSINESS_RECONCILIATION":input.outcome==="REJECTED"?"REJECTED_ATTENTION_REQUIRED":"UNKNOWN_RECONCILIATION_REQUIRED";
    await db.query("update crays_core.seller_fulfillment_provider_outbox set delivery_state=$1,completed_at=$2 where tenant_id=$3 and provider_outbox_id=$4",[delivery,input.observedAt,input.tenantId,input.providerOutboxId]);
    const states=(await db.query<Readonly<{delivery_state:string}>>("select delivery_state from crays_core.seller_fulfillment_provider_outbox where tenant_id=$1 and fulfillment_command_id=$2",[input.tenantId,outbox.fulfillment_command_id])).rows.map((row)=>row.delivery_state);
    const commandState=states.includes("UNKNOWN_RECONCILIATION_REQUIRED")?"UNKNOWN_RECONCILIATION_REQUIRED":states.includes("REJECTED_ATTENTION_REQUIRED")?"PROVIDER_REJECTED_ATTENTION_REQUIRED":states.length>0&&states.every((state)=>state==="ACKNOWLEDGED_PENDING_BUSINESS_RECONCILIATION")?"PROVIDER_ACKS_PENDING_BUSINESS_RECONCILIATION":"PERSISTED_PENDING_PROVIDERS";
    await db.query("update crays_core.seller_fulfillment_commands set command_state=$1,updated_at=$2 where tenant_id=$3 and fulfillment_command_id=$4",[commandState,input.observedAt,input.tenantId,outbox.fulfillment_command_id]);
    return Object.freeze({providerReceiptId:input.providerReceiptId,commandState,replayed:false as const});
  });
}

export function prepareSellerFulfillmentProviderReceiptInput(input:SellerFulfillmentProviderReceiptInput):SellerFulfillmentProviderReceiptInput{
  const snapshot=Object.freeze({...input});
  if([snapshot.tenantId,snapshot.providerReceiptId,snapshot.providerOutboxId,snapshot.providerEventId,
    snapshot.providerObjectId].some((value)=>!nonempty(value))||!snapshot.signatureVerified||
    !HASH.test(snapshot.eventPayloadSha256)||!Number.isFinite(Date.parse(snapshot.observedAt)))
    throw new Error("SELLER_FULFILLMENT_PROVIDER_RECEIPT_INVALID");
  return snapshot;
}
