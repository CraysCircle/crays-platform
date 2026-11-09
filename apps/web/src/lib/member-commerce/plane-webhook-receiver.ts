import "server-only";
import {createHash} from "node:crypto";
import {preparePlaneWebhookInbox} from "./plane-webhook-inbox-contract";
import {verifyAndProjectPlaneWebhook} from "./plane-signed-webhook-projection-contract";

type Binding=Readonly<{partnerTenantId:string;operatorLegalEntityId:string;storeId:string;planeWorkspaceId:string;planeProjectId:string;bindingVersion:number}>;
export type PlaneWebhookRegistry=Readonly<{
  endpointId:string;tenantId:string;contract:"plane_v1_deployed"|"plane_v2";
  binding:Binding;secretRef:string;ownerAssignmentId:string;
  allowedEvents:readonly string[];maxRawBodyBytes:number;
}>;
type Persist=(
  value:ReturnType<typeof preparePlaneWebhookInbox>
)=>Promise<Readonly<{inboxId:string;projectionId:string;state:string}>>;
const nonempty=(value:string)=>value.trim().length>0;
const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
const header=(headers:Readonly<Record<string,string|undefined>>,name:string)=>{
  const value=headers[name]??headers[name.toLowerCase()];
  return typeof value==="string"?value.trim():"";
};

export async function receivePlaneWebhook(input:Readonly<{
  registry:PlaneWebhookRegistry;headers:Readonly<Record<string,string|undefined>>;
  rawBody:Uint8Array;resolveSecret:(ref:string)=>Promise<string>;persist:Persist;
  receivedAt:string;
}>){
  const r=input.registry;
  if(![r.endpointId,r.tenantId,r.secretRef,r.ownerAssignmentId].every(nonempty)||
    !Number.isInteger(r.maxRawBodyBytes)||r.maxRawBodyBytes<256||r.maxRawBodyBytes>1_048_576||
    !r.allowedEvents.length||r.allowedEvents.some(event=>!nonempty(event)))
    throw new Error("PLANE_WEBHOOK_REGISTRY_INVALID");
  const contentType=header(input.headers,"content-type").split(";",1)[0].toLowerCase();
  if(contentType!=="application/json")throw new Error("PLANE_WEBHOOK_CONTENT_TYPE_DENIED");
  const contentEncoding=header(input.headers,"content-encoding");
  if(contentEncoding&&contentEncoding.toLowerCase()!=="identity")
    throw new Error("PLANE_WEBHOOK_CONTENT_ENCODING_DENIED");
  if(input.rawBody.byteLength===0||input.rawBody.byteLength>r.maxRawBodyBytes)
    throw new Error("PLANE_WEBHOOK_BODY_SIZE_INVALID");
  let rawBody:string;
  try{rawBody=new TextDecoder("utf-8",{fatal:true}).decode(input.rawBody);}
  catch{throw new Error("PLANE_WEBHOOK_BODY_ENCODING_INVALID");}
  const signatureHex=header(input.headers,"x-plane-signature");
  const deliveryId=header(input.headers,"x-plane-delivery");
  const eventHeader=header(input.headers,"x-plane-event");
  if(!signatureHex||!deliveryId||!eventHeader)throw new Error("PLANE_WEBHOOK_HEADERS_MISSING");
  if(signatureHex.includes(",")||deliveryId.includes(",")||eventHeader.includes(","))
    throw new Error("PLANE_WEBHOOK_DUPLICATE_HEADER_DENIED");
  if(!r.allowedEvents.includes(eventHeader))throw new Error("PLANE_WEBHOOK_EVENT_DENIED");
  const secret=await input.resolveSecret(r.secretRef);
  if(!nonempty(secret))throw new Error("PLANE_WEBHOOK_SECRET_UNAVAILABLE");
  const projection=verifyAndProjectPlaneWebhook({
    rawBody,signatureHex,deliveryId,eventHeader,secret,contract:r.contract,binding:r.binding,
  });
  if(!r.allowedEvents.includes(projection.eventName))throw new Error("PLANE_WEBHOOK_EVENT_DENIED");
  const identity=sha(r.tenantId+":"+projection.stableEventKey);
  const prepared=preparePlaneWebhookInbox(projection,{
    tenantId:r.tenantId,inboxId:"plane_inbox_"+identity,
    projectionId:"plane_projection_"+identity,ownerAssignmentId:r.ownerAssignmentId,
    receivedAt:input.receivedAt,
  });
  const persisted=await input.persist(prepared);
  return Object.freeze({...persisted,stableEventKey:projection.stableEventKey,
    state:"PROJECTED_PENDING_COMMAND_RECONCILIATION" as const});
}
