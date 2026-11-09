import {createHash} from "node:crypto";

export const PARTNER_CRM_ACTIVITY_VERSION = "ncrv2-144.v2" as const;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const HASH = /^[a-f0-9]{64}$/;
type Kind = "checkout_started"|"purchase_attributed"|"fulfillment_milestone"|"service_contact"|"return_requested"|"refund_completed";
const forbidden = new Set(["email","phone","address","orderState","paymentState","lineItems","sku","connectedAccountId","erpSiteId","taxMinor","grossMinor","refundMinor"]);

export function createPartnerCrmActivityProjection(input:Readonly<{
  sourceActivityId:string;kind:Kind;occurredAt:string;canonicalPersonId:string;
  canonicalOrganizationId:string;relationshipId:string;relationshipVersion:number;
  relationshipState:"active"|"suspended"|"ended";contractPermissionReceiptId:string;
  partnerTenantId:string;operatorLegalEntityId:string;storeId:string;
  sellerSnapshotSha256:string;orderPointer:string;summaryCode:string;
  attributionCode:string|null;extra?:Readonly<Record<string,unknown>>;
}>) {
  if (![input.sourceActivityId,input.canonicalPersonId,input.canonicalOrganizationId,
        input.relationshipId,input.contractPermissionReceiptId,input.partnerTenantId,
        input.operatorLegalEntityId,input.storeId,input.orderPointer,input.summaryCode].every((value)=>value.trim()) ||
      input.relationshipVersion<1 || !Number.isFinite(Date.parse(input.occurredAt)) ||
      !HASH.test(input.sellerSnapshotSha256)) throw new Error("CRM_ACTIVITY_INPUT_INVALID");
  if(input.relationshipState!=="active") throw new Error("CRM_ACTIVITY_RELATIONSHIP_NOT_ACTIVE");
  for(const key of Object.keys(input.extra??{})) if(forbidden.has(key)) throw new Error("CRM_ACTIVITY_FIELD_FORBIDDEN");
  if(Object.keys(input.extra??{}).length) throw new Error("CRM_ACTIVITY_FIELD_NOT_ALLOWLISTED");
  const identity={contractVersion:PARTNER_CRM_ACTIVITY_VERSION,sourceActivityId:input.sourceActivityId,canonicalPersonId:input.canonicalPersonId,relationshipId:input.relationshipId,relationshipVersion:input.relationshipVersion,partnerTenantId:input.partnerTenantId,operatorLegalEntityId:input.operatorLegalEntityId,storeId:input.storeId};
  const body={...identity,canonicalOrganizationId:input.canonicalOrganizationId,kind:input.kind,occurredAt:new Date(input.occurredAt).toISOString(),contractPermissionReceiptId:input.contractPermissionReceiptId,sellerSnapshotSha256:input.sellerSnapshotSha256,orderPointer:input.orderPointer,summaryCode:input.summaryCode,attributionCode:input.attributionCode,twentyProjectionMode:"RELATIONSHIP_ACTIVITY_POINTER"as const,createsContact:false as const,ownsCanonicalOrderState:false as const,emailMergeAllowed:false as const};
  return Object.freeze({...body,idempotencyKey:`crm-activity:${digest(identity)}`,payloadSha256:digest(body)});
}

export function authorizePartnerCrmProjection(projection:ReturnType<typeof createPartnerCrmActivityProjection>,viewer:Readonly<{relationshipId:string;partnerTenantId:string;operatorLegalEntityId:string;storeId:string}>){
  if(viewer.relationshipId!==projection.relationshipId||viewer.partnerTenantId!==projection.partnerTenantId||viewer.operatorLegalEntityId!==projection.operatorLegalEntityId||viewer.storeId!==projection.storeId)throw new Error("CRM_ACTIVITY_SCOPE_MISMATCH");
  return Object.freeze({...projection,authorized:true as const});
}

export function preparePartnerCrmActivityPersistence(projection:ReturnType<typeof createPartnerCrmActivityProjection>,input:Readonly<{tenantId:string;projectionId:string;outboxId:string;ownerAssignmentId:string;firstObservedAt:string}>){
  const first=Date.parse(input.firstObservedAt);
  if(!input.tenantId.trim()||!input.projectionId.trim()||!input.outboxId.trim()||!input.ownerAssignmentId.trim()||!Number.isFinite(first))throw new Error("CRM_ACTIVITY_PERSISTENCE_INPUT_INVALID");
  const projectionRecord=Object.freeze({projectionId:input.projectionId,tenantId:input.tenantId,sourceActivityId:projection.sourceActivityId,activityKind:projection.kind,occurredAt:projection.occurredAt,canonicalPersonId:projection.canonicalPersonId,canonicalOrganizationId:projection.canonicalOrganizationId,relationshipId:projection.relationshipId,relationshipVersion:projection.relationshipVersion,contractPermissionReceiptId:projection.contractPermissionReceiptId,partnerTenantId:projection.partnerTenantId,operatorLegalEntityId:projection.operatorLegalEntityId,storeId:projection.storeId,sellerSnapshotSha256:projection.sellerSnapshotSha256,orderPointer:projection.orderPointer,summaryCode:projection.summaryCode,attributionCode:projection.attributionCode,idempotencyKey:projection.idempotencyKey,payload:projection,payloadSha256:projection.payloadSha256,lifecycleState:"ACTIVE"as const,recordVersion:1});
  const outboxBody={outboxId:input.outboxId,projectionId:input.projectionId,tenantId:input.tenantId,partnerTenantId:projection.partnerTenantId,operatorLegalEntityId:projection.operatorLegalEntityId,storeId:projection.storeId,relationshipId:projection.relationshipId,relationshipVersion:projection.relationshipVersion,targetProvider:"twenty"as const,operation:"UPSERT_ACTIVITY_POINTER"as const,idempotencyKey:`${projection.idempotencyKey}:upsert`,payload:projection,payloadSha256:projection.payloadSha256,deliveryState:"PENDING"as const,ownerAssignmentId:input.ownerAssignmentId,requiredInformation:"twenty_activity_pointer_acknowledgement_and_fresh_observation"as const,dueAt:new Date(first+1800_000).toISOString(),expiresAt:new Date(first+7200_000).toISOString(),attentionState:"UNACKNOWLEDGED"as const,escalationOwnerRole:"partner_crm_owner"as const,nextSafeAction:"deliver"as const,availableAt:new Date(first).toISOString()};
  return Object.freeze({projectionRecord,outboxRecord:Object.freeze({...outboxBody,outboxSha256:digest(outboxBody)}),persistenceSha256:digest({projectionRecord,outboxBody})});
}

type Outbox=ReturnType<typeof preparePartnerCrmActivityPersistence>["outboxRecord"]|ReturnType<typeof preparePartnerCrmActivityRevocation>["outboxRecord"];
export function observeTwentyCrmActivity(outbox:Outbox,input:Readonly<{providerReceiptId:string;providerEventId:string;twentyActivityPointerId:string;partnerTenantId:string;operatorLegalEntityId:string;storeId:string;relationshipId:string;relationshipVersion:number;operation:"UPSERT_ACTIVITY_POINTER"|"REVOKE_ACTIVITY_POINTER";observedPayloadSha256:string;signatureVerified:boolean;acknowledgedAt:string}>){
  if(input.partnerTenantId!==outbox.partnerTenantId||input.operatorLegalEntityId!==outbox.operatorLegalEntityId||input.storeId!==outbox.storeId||input.relationshipId!==outbox.relationshipId||input.relationshipVersion!==outbox.relationshipVersion||input.operation!==outbox.operation)throw new Error("CRM_ACTIVITY_PROVIDER_SCOPE_MISMATCH");
  if(!input.providerReceiptId.trim()||!input.providerEventId.trim()||!input.twentyActivityPointerId.trim()||!HASH.test(input.observedPayloadSha256)||!input.signatureVerified||!Number.isFinite(Date.parse(input.acknowledgedAt)))throw new Error("CRM_ACTIVITY_PROVIDER_RECEIPT_INVALID");
  const body={providerReceiptId:input.providerReceiptId,outboxId:outbox.outboxId,projectionId:outbox.projectionId,tenantId:outbox.tenantId,partnerTenantId:outbox.partnerTenantId,operatorLegalEntityId:outbox.operatorLegalEntityId,storeId:outbox.storeId,relationshipId:outbox.relationshipId,relationshipVersion:outbox.relationshipVersion,operation:outbox.operation,twentyActivityPointerId:input.twentyActivityPointerId,providerEventId:input.providerEventId,observedPayloadSha256:input.observedPayloadSha256,signatureVerified:true as const,providerState:"ACKNOWLEDGED_PENDING_RECONCILIATION"as const,acknowledgedAt:new Date(input.acknowledgedAt).toISOString()};
  return Object.freeze({...body,receiptSha256:digest(body)});
}

export function reconcileTwentyCrmActivity(outbox:Outbox,providerReceipt:ReturnType<typeof observeTwentyCrmActivity>,input:Readonly<{reconciliationReceiptId:string;reconciledByAssignmentId:string;reconciledAt:string}>){
  if(providerReceipt.outboxId!==outbox.outboxId||providerReceipt.projectionId!==outbox.projectionId||providerReceipt.operation!==outbox.operation)throw new Error("CRM_ACTIVITY_RECONCILIATION_SCOPE_MISMATCH");
  const reconciledAt=Date.parse(input.reconciledAt);
  if(!input.reconciliationReceiptId.trim()||!input.reconciledByAssignmentId.trim()||!Number.isFinite(reconciledAt)||reconciledAt<Date.parse(providerReceipt.acknowledgedAt))throw new Error("CRM_ACTIVITY_RECONCILIATION_INPUT_INVALID");
  const matched=providerReceipt.observedPayloadSha256===outbox.payloadSha256;
  const state=matched?(outbox.operation==="REVOKE_ACTIVITY_POINTER"?"REVOKED_MATCHED"as const:"MATCHED"as const):"MISMATCH"as const;
  const body={reconciliationReceiptId:input.reconciliationReceiptId,outboxId:outbox.outboxId,providerReceiptId:providerReceipt.providerReceiptId,projectionId:outbox.projectionId,tenantId:outbox.tenantId,partnerTenantId:outbox.partnerTenantId,operatorLegalEntityId:outbox.operatorLegalEntityId,storeId:outbox.storeId,relationshipId:outbox.relationshipId,relationshipVersion:outbox.relationshipVersion,expectedPayloadSha256:outbox.payloadSha256,observedPayloadSha256:providerReceipt.observedPayloadSha256,reconciliationState:state,reconciledByAssignmentId:input.reconciledByAssignmentId,reconciledAt:new Date(reconciledAt).toISOString(),nextSafeAction:matched?"close"as const:outbox.operation==="REVOKE_ACTIVITY_POINTER"?"repair_revocation"as const:"repair_projection"as const};
  return Object.freeze({...body,receiptSha256:digest(body)});
}

export function preparePartnerCrmActivityRevocation(projection:ReturnType<typeof createPartnerCrmActivityProjection>,input:Readonly<{tenantId:string;projectionId:string;outboxId:string;currentRelationshipVersion:number;permissionRevocationReceiptId:string;revocationReasonCode:string;ownerAssignmentId:string;revokedAt:string}>){
  const revoked=Date.parse(input.revokedAt);
  if(!input.tenantId.trim()||!input.projectionId.trim()||!input.outboxId.trim()||!input.permissionRevocationReceiptId.trim()||!input.revocationReasonCode.trim()||!input.ownerAssignmentId.trim()||!Number.isFinite(revoked)||input.currentRelationshipVersion<projection.relationshipVersion)throw new Error("CRM_ACTIVITY_REVOCATION_INPUT_INVALID");
  const payload=Object.freeze({contractVersion:PARTNER_CRM_ACTIVITY_VERSION,projectionId:input.projectionId,canonicalPersonId:projection.canonicalPersonId,relationshipId:projection.relationshipId,relationshipVersion:input.currentRelationshipVersion,partnerTenantId:projection.partnerTenantId,operatorLegalEntityId:projection.operatorLegalEntityId,storeId:projection.storeId,permissionRevocationReceiptId:input.permissionRevocationReceiptId,revocationReasonCode:input.revocationReasonCode,twentyProjectionMode:"RELATIONSHIP_ACTIVITY_POINTER_REVOCATION"as const,createsContact:false as const,emailMergeAllowed:false as const});
  const payloadSha256=digest(payload);const outboxBody={outboxId:input.outboxId,projectionId:input.projectionId,tenantId:input.tenantId,partnerTenantId:projection.partnerTenantId,operatorLegalEntityId:projection.operatorLegalEntityId,storeId:projection.storeId,relationshipId:projection.relationshipId,relationshipVersion:input.currentRelationshipVersion,targetProvider:"twenty"as const,operation:"REVOKE_ACTIVITY_POINTER"as const,idempotencyKey:`${projection.idempotencyKey}:revoke:${input.currentRelationshipVersion}`,payload,payloadSha256,deliveryState:"PENDING"as const,ownerAssignmentId:input.ownerAssignmentId,requiredInformation:"twenty_activity_pointer_revocation_acknowledgement_and_fresh_absence_observation"as const,dueAt:new Date(revoked+900_000).toISOString(),expiresAt:new Date(revoked+3600_000).toISOString(),attentionState:"UNACKNOWLEDGED"as const,escalationOwnerRole:"privacy_owner"as const,nextSafeAction:"deliver"as const,availableAt:new Date(revoked).toISOString()};
  return Object.freeze({projectionLifecycleUpdate:Object.freeze({projectionId:input.projectionId,tenantId:input.tenantId,expectedRecordVersion:1,lifecycleState:"REVOCATION_PENDING"as const,revocationReasonCode:input.revocationReasonCode,recordVersion:2}),outboxRecord:Object.freeze({...outboxBody,outboxSha256:digest(outboxBody)}),persistenceSha256:digest({projectionId:input.projectionId,outboxBody})});
}
