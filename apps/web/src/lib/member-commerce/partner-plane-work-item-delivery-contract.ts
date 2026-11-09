import {createHash} from "node:crypto";
import type {createPartnerPlaneWorkItem} from "./partner-plane-work-item-contract";

type WorkItem=ReturnType<typeof createPartnerPlaneWorkItem>;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const addMinutes=(iso:string,minutes:number)=>new Date(new Date(iso).getTime()+minutes*60_000).toISOString();
const requireText=(value:string,code:string)=>{if(!value.trim())throw new Error(code);return value};

export function preparePartnerPlaneWorkItemDelivery(item:WorkItem,input:Readonly<{
  tenantId:string;commandId:string;ownerAssignmentId:string;createdAt:string;
}>){
  requireText(input.tenantId,"PLANE_DELIVERY_TENANT_INVALID");
  requireText(input.commandId,"PLANE_DELIVERY_COMMAND_INVALID");
  requireText(input.ownerAssignmentId,"PLANE_DELIVERY_OWNER_INVALID");
  const payload=Object.freeze({contractVersion:item.contractVersion,workItemCorrelationId:item.workItemCorrelationId,
    sourceKind:item.sourceKind,sourceRecordId:item.sourceRecordId,sourceRecordSha256:item.sourceRecordSha256,
    partnerTenantId:item.partnerTenantId,operatorLegalEntityId:item.operatorLegalEntityId,storeId:item.storeId,
    planeWorkspaceId:item.planeWorkspaceId,planeProjectId:item.planeProjectId,
    projectBindingVersion:item.projectBindingVersion,ownerRole:item.ownerRole,titleCode:item.titleCode,
    evidenceRefs:Object.freeze([...item.evidenceRefs]),commandSha256:item.commandSha256});
  const record={...payload,tenantId:input.tenantId,commandId:input.commandId,
    ownerAssignmentId:input.ownerAssignmentId,idempotencyKey:item.idempotencyKey,
    commandPayload:payload,deliveryState:"PENDING" as const,
    requiredInformation:"signed_plane_work_item_receipt_and_fresh_exact_project_observation",
    dueAt:addMinutes(input.createdAt,30),expiresAt:addMinutes(input.createdAt,240),
    attentionState:"UNACKNOWLEDGED" as const,escalationOwnerRole:"integration_owner",
    nextSafeAction:"deliver" as const,createdAt:new Date(input.createdAt).toISOString()};
  return Object.freeze(record);
}

export function observePartnerPlaneWorkItem(command:ReturnType<typeof preparePartnerPlaneWorkItemDelivery>,input:Readonly<{
  providerReceiptId:string;providerEventId:string;planeWorkspaceId:string;planeProjectId:string;
  planeWorkItemId:string;partnerTenantId:string;operatorLegalEntityId:string;storeId:string;
  observedCommandSha256:string;signatureVerified:boolean;acknowledgedAt:string;
}>){
  if(!input.signatureVerified)throw new Error("PLANE_RECEIPT_SIGNATURE_INVALID");
  if(input.planeWorkspaceId!==command.planeWorkspaceId||input.planeProjectId!==command.planeProjectId||
    input.partnerTenantId!==command.partnerTenantId||input.operatorLegalEntityId!==command.operatorLegalEntityId||input.storeId!==command.storeId)
    throw new Error("PLANE_RECEIPT_SCOPE_MISMATCH");
  const body={providerReceiptId:input.providerReceiptId,providerEventId:input.providerEventId,
    commandId:command.commandId,tenantId:command.tenantId,partnerTenantId:input.partnerTenantId,
    operatorLegalEntityId:input.operatorLegalEntityId,storeId:input.storeId,
    planeWorkspaceId:input.planeWorkspaceId,planeProjectId:input.planeProjectId,
    planeWorkItemId:requireText(input.planeWorkItemId,"PLANE_WORK_ITEM_ID_INVALID"),
    observedCommandSha256:input.observedCommandSha256,signatureVerified:true as const,
    providerState:"ACKNOWLEDGED_PENDING_RECONCILIATION" as const,
    acknowledgedAt:new Date(input.acknowledgedAt).toISOString()};
  return Object.freeze({...body,receiptSha256:digest(body)});
}

export function reconcilePartnerPlaneWorkItem(command:ReturnType<typeof preparePartnerPlaneWorkItemDelivery>,receipt:ReturnType<typeof observePartnerPlaneWorkItem>,input:Readonly<{
  reconciliationReceiptId:string;observedWorkItemCorrelationId:string;reconciledByAssignmentId:string;reconciledAt:string;
}>){
  if(receipt.commandId!==command.commandId)throw new Error("PLANE_RECONCILIATION_RECEIPT_MISMATCH");
  const matched=receipt.observedCommandSha256===command.commandSha256&&input.observedWorkItemCorrelationId===command.workItemCorrelationId;
  const body={reconciliationReceiptId:input.reconciliationReceiptId,commandId:command.commandId,
    providerReceiptId:receipt.providerReceiptId,tenantId:command.tenantId,
    partnerTenantId:command.partnerTenantId,operatorLegalEntityId:command.operatorLegalEntityId,storeId:command.storeId,
    planeWorkspaceId:command.planeWorkspaceId,planeProjectId:command.planeProjectId,
    expectedWorkItemCorrelationId:command.workItemCorrelationId,observedWorkItemCorrelationId:input.observedWorkItemCorrelationId,
    expectedCommandSha256:command.commandSha256,observedCommandSha256:receipt.observedCommandSha256,
    reconciliationState:matched?"MATCHED" as const:"MISMATCH" as const,
    reconciledByAssignmentId:input.reconciledByAssignmentId,reconciledAt:new Date(input.reconciledAt).toISOString(),
    nextSafeAction:matched?"close" as const:"repair" as const};
  return Object.freeze({...body,receiptSha256:digest(body)});
}
