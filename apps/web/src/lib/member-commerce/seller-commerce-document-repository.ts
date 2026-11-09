import {createSellerCommerceDocumentBinding,type CustomerSellerSnapshot} from "./seller-commerce-document-binding";
import {createHash} from "node:crypto";
import type {SellerFulfillmentDb,SellerFulfillmentPool} from "./seller-fulfillment-repository";

export type PersistSellerCommerceDocumentInput=Readonly<{
  tenantId:string;documentBindingId:string;orderSnapshotId:string;artifactId:string;artifactVersionId:string;
  surface:"order_confirmation"|"receipt_invoice_reference"|"return_label"|"return_evidence";returnRequestId?:string;
  erpDocumentAuthorityId?:string;
  bindingPolicyVersion:string;idempotencyKey:string;createdAt:string;
}>;
export type PersistSellerCommerceMailInput=Readonly<{tenantId:string;mailBindingId:string;orderSnapshotId:string;
  documentBindingId:string;mailComposeIntentId:string;mailComposeRecipientId:string;mailSendConfirmationId:string;
  idempotencyKey:string;createdAt:string}>;
type Authority=Readonly<{order_id:string;order_code:string;snapshot_sha256:string;partner_tenant_id:string;
  operator_legal_entity_id:string;store_id:string;vendure_seller_id:string;vendure_channel_id:string;
  stripe_connected_account_id:string;seller_legal_name:string;seller_display_name:string;
  seller_registered_address:unknown;seller_tax_registration_ref:string;operator_kind:"independent_franchise_operator";
  disclosure_sha256:string;artifact_id:string;artifact_version_id:string;content_sha256:string;
  evidence_state:string;lifecycle_state:string;purpose:string;context_urn:string;return_state:string|null}>;

async function transaction<T>(pool:SellerFulfillmentPool,tenantId:string,work:(db:SellerFulfillmentDb)=>Promise<T>){const db=await pool.connect();try{await db.query("begin");await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);const result=await work(db);await db.query("commit");return result;}catch(error){await db.query("rollback").catch(()=>undefined);throw error;}finally{db.release();}}
const nonempty=(value:string|undefined)=>Boolean(value?.trim());

export function prepareSellerCommerceDocumentInput(
  input:PersistSellerCommerceDocumentInput,
):PersistSellerCommerceDocumentInput{
  const snapshot=Object.freeze({...input});
  if([snapshot.tenantId,snapshot.documentBindingId,snapshot.orderSnapshotId,snapshot.artifactId,
    snapshot.artifactVersionId,snapshot.bindingPolicyVersion,snapshot.idempotencyKey]
    .some((value)=>!nonempty(value))||!Number.isFinite(Date.parse(snapshot.createdAt))||
    ((snapshot.surface==="return_label"||snapshot.surface==="return_evidence")!==nonempty(snapshot.returnRequestId))||
    ((snapshot.surface==="receipt_invoice_reference")!==nonempty(snapshot.erpDocumentAuthorityId)))
    throw new Error("SELLER_COMMERCE_DOCUMENT_INPUT_INVALID");
  return snapshot;
}

export function prepareSellerCommerceMailInput(
  input:PersistSellerCommerceMailInput,
):PersistSellerCommerceMailInput{
  const snapshot=Object.freeze({...input});
  if([snapshot.tenantId,snapshot.mailBindingId,snapshot.orderSnapshotId,snapshot.documentBindingId,
    snapshot.mailComposeIntentId,snapshot.mailComposeRecipientId,snapshot.mailSendConfirmationId,
    snapshot.idempotencyKey].some((value)=>!nonempty(value))||
    !Number.isFinite(Date.parse(snapshot.createdAt)))throw new Error("SELLER_COMMERCE_MAIL_INPUT_INVALID");
  return snapshot;
}

export function persistSellerCommerceDocumentBinding(pool:SellerFulfillmentPool,input:PersistSellerCommerceDocumentInput){
  input=prepareSellerCommerceDocumentInput(input);
  return transaction(pool,input.tenantId,async(db)=>{
    const prior=(await db.query<Readonly<{document_binding_id:string;binding_sha256:string;binding_state:string}>>(
      "select document_binding_id,binding_sha256,binding_state from crays_core.seller_commerce_document_bindings where tenant_id=$1 and idempotency_key=$2",
      [input.tenantId,input.idempotencyKey])).rows[0];
    const authority=(await db.query<Authority>(`select s.order_id,s.order_code,s.snapshot_sha256,s.partner_tenant_id,
      s.operator_legal_entity_id,s.store_id,s.vendure_seller_id,s.vendure_channel_id,s.stripe_connected_account_id,
      d.seller_legal_name,d.seller_display_name,d.seller_registered_address,d.seller_tax_registration_ref,
      d.operator_kind,d.disclosure_sha256,a.artifact_id,v.artifact_version_id,v.content_sha256,
      v.evidence_state,a.lifecycle_state,a.purpose,a.context_urn,r.return_state
      from crays_core.checkout_order_snapshots s join crays_core.checkout_order_seller_disclosures d using(order_snapshot_id)
      join crays_integration.artifacts a on a.crays_tenant_id=s.tenant_id and a.artifact_id=$3
      join crays_integration.artifact_versions v on v.artifact_id=a.artifact_id and v.artifact_version_id=$4
      left join crays_core.commerce_return_requests r on r.tenant_id=s.tenant_id and r.order_snapshot_id=s.order_snapshot_id and r.return_request_id=$5
      where s.tenant_id=$1 and s.order_snapshot_id=$2`,[input.tenantId,input.orderSnapshotId,input.artifactId,input.artifactVersionId,input.returnRequestId??null])).rows[0];
    if(!authority||authority.evidence_state!=="verified"||!['active','retained'].includes(authority.lifecycle_state)||
      authority.context_urn!==`urn:crays:commerce-order:${authority.order_id}`||
      authority.purpose!==(input.surface==="order_confirmation"?"commerce_order_confirmation":input.surface)||
      (input.returnRequestId!==undefined&&!['APPROVED','RECEIVED'].includes(authority.return_state??"")))throw new Error("SELLER_COMMERCE_DOCUMENT_AUTHORITY_UNAVAILABLE");
    const erp=input.surface==="receipt_invoice_reference"?(await db.query<Readonly<{provider_document_reference:string}>>(`select provider_document_reference from crays_core.commerce_erp_document_authorities where tenant_id=$1 and erp_document_authority_id=$2 and order_snapshot_id=$3 and partner_tenant_id=$4 and operator_legal_entity_id=$5 and store_id=$6 and authority_state='RECONCILED_ERP_DOCUMENT'`,[input.tenantId,input.erpDocumentAuthorityId,input.orderSnapshotId,authority.partner_tenant_id,authority.operator_legal_entity_id,authority.store_id])).rows[0]:undefined;
    if(input.surface==="receipt_invoice_reference"&&!erp)throw new Error("SELLER_DOCUMENT_ERP_AUTHORITY_UNAVAILABLE");
    const snapshot:CustomerSellerSnapshot={snapshotId:input.orderSnapshotId,snapshotSha256:authority.snapshot_sha256,
      orderId:authority.order_id,orderCode:authority.order_code,partnerTenantId:authority.partner_tenant_id,
      operatorLegalEntityId:authority.operator_legal_entity_id,storeId:authority.store_id,
      sellerLegalName:authority.seller_legal_name,sellerDisplayName:authority.seller_display_name,
      sellerRegisteredAddress:JSON.stringify(authority.seller_registered_address),
      sellerTaxRegistrationRef:authority.seller_tax_registration_ref,vendureSellerId:authority.vendure_seller_id,
      vendureChannelId:authority.vendure_channel_id,stripeConnectedAccountId:authority.stripe_connected_account_id,
      operatorKind:"independent_partner"};
    const binding=createSellerCommerceDocumentBinding(snapshot,{surface:input.surface,artifact:{artifactId:authority.artifact_id,
      artifactVersionId:authority.artifact_version_id,artifactSha256:authority.content_sha256,
      partnerTenantId:authority.partner_tenant_id,operatorLegalEntityId:authority.operator_legal_entity_id,
      storeId:authority.store_id,orderId:authority.order_id,state:"verified"},returnId:input.returnRequestId,
      erpDocumentReference:erp?.provider_document_reference,
      bindingPolicyVersion:input.bindingPolicyVersion,idempotencyKey:input.idempotencyKey});
    if(prior){if(prior.document_binding_id!==input.documentBindingId||prior.binding_sha256!==binding.bindingSha256)throw new Error("SELLER_COMMERCE_DOCUMENT_REPLAY_CONFLICT");return Object.freeze({documentBindingId:prior.document_binding_id,bindingSha256:prior.binding_sha256,bindingState:prior.binding_state,replayed:true as const});}
    if(input.surface==="receipt_invoice_reference")await db.query(`insert into crays_core.seller_commerce_document_bindings
      (document_binding_id,tenant_id,order_snapshot_id,artifact_id,artifact_version_id,surface,return_request_id,
       partner_tenant_id,operator_legal_entity_id,store_id,seller_disclosure_sha256,artifact_content_sha256,
       binding_policy_version,idempotency_key,binding_sha256,binding_state,created_at,erp_document_authority_id)
      values($1,$2,$3,$4,$5,$6,null,$7,$8,$9,$10,$11,$12,$13,$14,'BOUND_PENDING_PROVIDER_RECONCILIATION',$15,$16)`,
      [input.documentBindingId,input.tenantId,input.orderSnapshotId,input.artifactId,input.artifactVersionId,input.surface,
       authority.partner_tenant_id,authority.operator_legal_entity_id,authority.store_id,authority.disclosure_sha256,
       authority.content_sha256,input.bindingPolicyVersion,input.idempotencyKey,binding.bindingSha256,input.createdAt,
       input.erpDocumentAuthorityId]);
    else await db.query(`insert into crays_core.seller_commerce_document_bindings
      (document_binding_id,tenant_id,order_snapshot_id,artifact_id,artifact_version_id,surface,return_request_id,
       partner_tenant_id,operator_legal_entity_id,store_id,seller_disclosure_sha256,artifact_content_sha256,
       binding_policy_version,idempotency_key,binding_sha256,binding_state,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'BOUND_PENDING_PROVIDER_RECONCILIATION',$16)`,
      [input.documentBindingId,input.tenantId,input.orderSnapshotId,input.artifactId,input.artifactVersionId,input.surface,
       input.returnRequestId??null,authority.partner_tenant_id,authority.operator_legal_entity_id,authority.store_id,
       authority.disclosure_sha256,authority.content_sha256,input.bindingPolicyVersion,input.idempotencyKey,binding.bindingSha256,input.createdAt]);
    return Object.freeze({documentBindingId:input.documentBindingId,bindingSha256:binding.bindingSha256,
      bindingState:"BOUND_PENDING_PROVIDER_RECONCILIATION" as const,replayed:false as const});
  });
}

export function persistSellerCommerceMailBinding(pool:SellerFulfillmentPool,input:PersistSellerCommerceMailInput){
  input=prepareSellerCommerceMailInput(input);
  return transaction(pool,input.tenantId,async(db)=>{
    const row=(await db.query<Readonly<{order_id:string;canonical_person_id:string;relationship_id:string;
      communication_channel_projection_id:string;provider_message_ref_sha256:string}>>(`select o.order_id,
      r.canonical_person_id,r.relationship_id,r.communication_channel_projection_id,s.provider_message_ref_sha256
      from crays_core.checkout_order_snapshots o join crays_core.seller_commerce_document_bindings d on d.order_snapshot_id=o.order_snapshot_id
      join crays_integration.mail_compose_intents c on c.mail_compose_intent_id=$4 and c.crays_tenant_id=o.tenant_id
      join crays_integration.mail_compose_recipients r on r.mail_compose_intent_id=c.mail_compose_intent_id and r.mail_compose_recipient_id=$5
      join crays_integration.mail_compose_send_confirmations s on s.mail_compose_intent_id=c.mail_compose_intent_id and s.mail_compose_send_confirmation_id=$6
      where o.tenant_id=$1 and o.order_snapshot_id=$2 and d.document_binding_id=$3 and c.source_record_type='order'
        and c.source_record_id=o.order_id and c.send_mode='human_nextcloud_mail' and c.user_confirmation_required
        and not c.automatic_dispatch_allowed and r.lifecycle_state='confirmed' and s.confirmation_kind='native_nextcloud_mail_send'
        and s.correlation_state='matched'`,[input.tenantId,input.orderSnapshotId,input.documentBindingId,
      input.mailComposeIntentId,input.mailComposeRecipientId,input.mailSendConfirmationId])).rows[0];
    if(!row)throw new Error("SELLER_COMMERCE_MAIL_AUTHORITY_UNAVAILABLE");
    const body={orderSnapshotId:input.orderSnapshotId,documentBindingId:input.documentBindingId,
      mailComposeIntentId:input.mailComposeIntentId,mailComposeRecipientId:input.mailComposeRecipientId,
      mailSendConfirmationId:input.mailSendConfirmationId,canonicalPersonId:row.canonical_person_id,
      relationshipId:row.relationship_id,communicationChannelProjectionId:row.communication_channel_projection_id,
      providerMessageRefSha256:row.provider_message_ref_sha256,idempotencyKey:input.idempotencyKey};
    const mailBindingSha256=createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const prior=(await db.query<Readonly<{mail_binding_id:string;mail_binding_sha256:string;binding_state:string}>>(
      "select mail_binding_id,mail_binding_sha256,binding_state from crays_core.seller_commerce_mail_bindings where tenant_id=$1 and idempotency_key=$2",
      [input.tenantId,input.idempotencyKey])).rows[0];
    if(prior){if(prior.mail_binding_id!==input.mailBindingId||prior.mail_binding_sha256!==mailBindingSha256)throw new Error("SELLER_COMMERCE_MAIL_REPLAY_CONFLICT");return Object.freeze({mailBindingId:prior.mail_binding_id,mailBindingSha256:prior.mail_binding_sha256,bindingState:prior.binding_state,replayed:true as const});}
    await db.query(`insert into crays_core.seller_commerce_mail_bindings
      (mail_binding_id,tenant_id,order_snapshot_id,document_binding_id,mail_compose_intent_id,
       mail_compose_recipient_id,mail_send_confirmation_id,canonical_person_id,relationship_id,
       communication_channel_projection_id,provider_message_ref_sha256,idempotency_key,mail_binding_sha256,
       binding_state,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'SEND_OBSERVED_PENDING_RECONCILIATION',$14)`,
      [input.mailBindingId,input.tenantId,input.orderSnapshotId,input.documentBindingId,input.mailComposeIntentId,
       input.mailComposeRecipientId,input.mailSendConfirmationId,row.canonical_person_id,row.relationship_id,
       row.communication_channel_projection_id,row.provider_message_ref_sha256,input.idempotencyKey,mailBindingSha256,input.createdAt]);
    return Object.freeze({mailBindingId:input.mailBindingId,mailBindingSha256,bindingState:"SEND_OBSERVED_PENDING_RECONCILIATION" as const,replayed:false as const});
  });
}
