import "server-only";
import type {preparePartnerPlaneWorkItemDelivery} from "./partner-plane-work-item-delivery-contract";
type Command=ReturnType<typeof preparePartnerPlaneWorkItemDelivery>;
export type PlaneWorkItemEndpoint=Readonly<{baseUrl:string;workspaceSlug:string;apiKeySecretRef:string;timeoutMs:number;maxResponseBytes:number}>;
export type PlaneSecretResolver=(ref:string)=>Promise<string>;
const nonempty=(v:string)=>v.trim().length>0;
export async function dispatchPartnerPlaneWorkItem(input:Readonly<{command:Command;endpoint:PlaneWorkItemEndpoint;resolveSecret:PlaneSecretResolver;fetchImpl?:typeof fetch}>){
 const {command:c,endpoint:e}=input;if(![e.workspaceSlug,e.apiKeySecretRef].every(nonempty)||!nonempty(c.planeProjectId)||
  !Number.isInteger(e.timeoutMs)||e.timeoutMs<100||e.timeoutMs>30_000||
  !Number.isInteger(e.maxResponseBytes)||e.maxResponseBytes<256||e.maxResponseBytes>1_048_576)
  throw new Error("PLANE_COMMAND_ENDPOINT_INVALID");
 const base=new URL(e.baseUrl);if(base.protocol!=="https:"||base.username||base.password||base.search||base.hash)throw new Error("PLANE_COMMAND_ENDPOINT_INVALID");
 base.pathname=base.pathname.replace(/\/$/,"")+`/api/v1/workspaces/${encodeURIComponent(e.workspaceSlug)}/projects/${encodeURIComponent(c.planeProjectId)}/work-items/`;
 const key=await input.resolveSecret(e.apiKeySecretRef);if(!nonempty(key))throw new Error("PLANE_COMMAND_SECRET_UNAVAILABLE");
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),e.timeoutMs);
 let response:Response;try{response=await(input.fetchImpl??fetch)(base,{method:"POST",redirect:"manual",signal:controller.signal,headers:{"content-type":"application/json","x-api-key":key,"x-crays-idempotency-key":c.idempotencyKey},body:JSON.stringify({name:c.titleCode,description_html:`<p data-crays-correlation="${c.workItemCorrelationId}">${c.sourceKind}:${c.sourceRecordId}</p>`,external_source:"crays",external_id:c.workItemCorrelationId})});}catch(error){return Object.freeze({outcome:"unknown"as const,errorCode:error instanceof Error&&error.name==="AbortError"?"TIMEOUT"as const:"NETWORK_UNKNOWN"as const,state:"PENDING_RECONCILIATION"as const})}finally{clearTimeout(timeout)}
 if(response.status>=300&&response.status<400)throw new Error("PLANE_COMMAND_REDIRECT_DENIED");if(!response.ok)return Object.freeze({outcome:response.status===429||response.status>=500?"retryable_failure"as const:"permanent_failure"as const,status:response.status});
 const bytes=await response.arrayBuffer();if(bytes.byteLength>e.maxResponseBytes)throw new Error("PLANE_COMMAND_RESPONSE_TOO_LARGE");let raw:unknown;try{raw=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new Error("PLANE_COMMAND_RESPONSE_INVALID")}const record=raw as Record<string,unknown>;if(typeof record.id!=="string"||!nonempty(record.id))throw new Error("PLANE_COMMAND_WORK_ITEM_ID_MISSING");
 return Object.freeze({outcome:"provider_accepted"as const,planeWorkItemId:record.id,planeWorkspaceId:c.planeWorkspaceId,planeProjectId:c.planeProjectId,commandSha256:c.commandSha256,state:"PROVIDER_ACCEPTED_PENDING_SIGNED_WEBHOOK"as const});
}

