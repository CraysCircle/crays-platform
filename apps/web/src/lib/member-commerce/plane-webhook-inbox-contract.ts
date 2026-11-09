import type {verifyAndProjectPlaneWebhook} from "./plane-signed-webhook-projection-contract";
type Verified=ReturnType<typeof verifyAndProjectPlaneWebhook>;
const addMinutes=(iso:string,minutes:number)=>new Date(new Date(iso).getTime()+minutes*60_000).toISOString();
export function preparePlaneWebhookInbox(value:Verified,input:Readonly<{tenantId:string;inboxId:string;projectionId:string;ownerAssignmentId:string;receivedAt:string}>){
  if(!input.tenantId.trim()||!input.inboxId.trim()||!input.projectionId.trim()||!input.ownerAssignmentId.trim())throw new Error("PLANE_WEBHOOK_INBOX_INPUT_INVALID");
  const common={tenantId:input.tenantId,stableEventKey:value.stableEventKey,partnerTenantId:value.partnerTenantId,
    operatorLegalEntityId:value.operatorLegalEntityId,storeId:value.storeId,planeWorkspaceId:value.planeWorkspaceId,
    planeProjectId:value.planeProjectId,workItemId:value.workItemId,bindingVersion:value.bindingVersion,
    rawBodySha256:value.rawBodySha256,projectionSha256:value.projectionSha256};
  const inboxRecord={...common,inboxId:input.inboxId,deliveryId:value.deliveryId,planeContract:value.planeContract,
    eventName:value.eventName,action:value.action,signatureVerified:true as const,
    processingState:"VERIFIED_PENDING_PROJECTION" as const,ownerAssignmentId:input.ownerAssignmentId,
    requiredInformation:"fresh_exact_plane_work_item_projection_and_command_reconciliation",
    dueAt:addMinutes(input.receivedAt,15),expiresAt:addMinutes(input.receivedAt,120),attentionState:"UNACKNOWLEDGED" as const,
    escalationOwnerRole:"integration_owner",nextSafeAction:"project" as const,receivedAt:new Date(input.receivedAt).toISOString()};
  const projectionRecord={...common,projectionId:input.projectionId,inboxId:input.inboxId,planeState:value.planeState,
    eventName:value.eventName,action:value.action,planeOwnsWorkItemState:true as const,mutatesCommerceOrder:false as const,
    mutatesSellerAssignment:false as const,recordVersion:1,projectedAt:new Date(input.receivedAt).toISOString()};
  return Object.freeze({inboxRecord:Object.freeze(inboxRecord),projectionRecord:Object.freeze(projectionRecord)});
}
