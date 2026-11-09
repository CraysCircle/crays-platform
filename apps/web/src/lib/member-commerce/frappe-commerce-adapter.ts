import "server-only";
import type {projectVendureEventToErp} from "./vendure-erp-projection-contract";
import {
  prepareErpDispatch,
  type enqueueErpConsequence,
} from "./commerce-erp-transactional-delivery-contract";

type Plan=ReturnType<typeof projectVendureEventToErp>;
type Outbox=ReturnType<typeof enqueueErpConsequence>;
type Fetch=typeof fetch;
export type FrappeSecretResolver=(secretRef:string)=>Promise<string>;

export type FrappeCommerceEndpoint=Readonly<{
  erpSiteId:string;
  baseUrl:string;
  apiKeySecretRef:string;
  apiSecretSecretRef:string;
  timeoutMs:number;
  maxResponseBytes:number;
}>;

const METHOD="crays.erp.apply_commerce_consequence" as const;
const nonempty=(value:string)=>value.trim().length>0;
function endpointUrl(endpoint:FrappeCommerceEndpoint){
  if(![endpoint.erpSiteId,endpoint.apiKeySecretRef,endpoint.apiSecretSecretRef].every(nonempty)||
    !Number.isInteger(endpoint.timeoutMs)||endpoint.timeoutMs<100||endpoint.timeoutMs>30_000||
    !Number.isInteger(endpoint.maxResponseBytes)||endpoint.maxResponseBytes<256||
    endpoint.maxResponseBytes>1_048_576)throw new Error("FRAPPE_COMMERCE_ENDPOINT_INVALID");
  const base=new URL(endpoint.baseUrl);
  if(base.protocol!=="https:"||base.username||base.password||base.search||base.hash)
    throw new Error("FRAPPE_COMMERCE_ENDPOINT_INVALID");
  base.pathname=base.pathname.replace(/\/$/,"")+`/api/method/${METHOD}`;
  return base;
}
async function boundedJson(response:Response,max:number){
  const body=await response.arrayBuffer();
  if(body.byteLength>max)throw new Error("FRAPPE_COMMERCE_RESPONSE_TOO_LARGE");
  try{return JSON.parse(new TextDecoder().decode(body)) as unknown;}
  catch{throw new Error("FRAPPE_COMMERCE_RESPONSE_INVALID");}
}
export async function dispatchCommerceConsequenceToFrappe(input:Readonly<{
  plan:Plan;outbox:Outbox;endpoint:FrappeCommerceEndpoint;
  resolveSecret:FrappeSecretResolver;attempt:number;fetchImpl?:Fetch;
}>){
  const dispatch=prepareErpDispatch(input.plan,input.outbox,{attempt:input.attempt});
  if(input.endpoint.erpSiteId!==dispatch.erpSiteId)
    throw new Error("FRAPPE_COMMERCE_SITE_REGISTRY_MISMATCH");
  const url=endpointUrl(input.endpoint);
  const [key,secret]=await Promise.all([
    input.resolveSecret(input.endpoint.apiKeySecretRef),
    input.resolveSecret(input.endpoint.apiSecretSecretRef),
  ]);
  if(!nonempty(key)||!nonempty(secret))throw new Error("FRAPPE_COMMERCE_SECRET_UNAVAILABLE");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),input.endpoint.timeoutMs);
  let response:Response;
  try{
    response=await (input.fetchImpl??fetch)(url,{
      method:"POST",redirect:"manual",signal:controller.signal,
      headers:{"content-type":"application/json","authorization":`token ${key}:${secret}`,
        "x-crays-idempotency-key":dispatch.idempotencyKey},
      body:JSON.stringify({method:dispatch.method,tenant_scope:{
        partnerTenantId:input.plan.partnerTenantId,
        operatorLegalEntityId:input.plan.operatorLegalEntityId,storeId:input.plan.storeId,
        erpSiteId:input.plan.erpSiteId,erpCompanyId:input.plan.erpCompanyId,
        erpWarehouseId:input.plan.erpWarehouseId,erpCostCenterId:input.plan.erpCostCenterId,
        erpBindingVersion:input.plan.erpBindingVersion},
        idempotencyKey:input.plan.idempotencyKey,payloadSha256:input.plan.payloadSha256,
        consequence:input.plan}),
    });
  }catch(error){
    return Object.freeze({outcome:"unknown" as const,errorCode:error instanceof Error&&error.name==="AbortError"?"TIMEOUT":"NETWORK_UNKNOWN",
      ...dispatch});
  }finally{clearTimeout(timeout);}
  if(response.status>=300&&response.status<400)
    return Object.freeze({outcome:"permanent_failure" as const,errorCode:"REDIRECT_DENIED",...dispatch});
  if(response.status===429||response.status>=500)
    return Object.freeze({outcome:"retryable_failure" as const,errorCode:`HTTP_${response.status}`,...dispatch});
  if(!response.ok)
    return Object.freeze({outcome:"permanent_failure" as const,errorCode:`HTTP_${response.status}`,...dispatch});
  const raw=await boundedJson(response,input.endpoint.maxResponseBytes);
  const message=raw&&typeof raw==="object"&&"message" in raw?(raw as {message?:unknown}).message:undefined;
  if(!message||typeof message!=="object")throw new Error("FRAPPE_COMMERCE_ACK_INVALID");
  const ack=message as Record<string,unknown>;
  if(ack.outcome!=="acknowledged"&&ack.outcome!=="duplicate_acknowledged")
    throw new Error("FRAPPE_COMMERCE_ACK_INVALID");
  if(ack.partnerTenantId!==input.plan.partnerTenantId||ack.erpSiteId!==input.plan.erpSiteId||
    ack.erpCompanyId!==input.plan.erpCompanyId||ack.idempotencyKey!==input.plan.idempotencyKey||
    ack.payloadSha256!==input.plan.payloadSha256||typeof ack.acknowledgementId!=="string"||
    !nonempty(ack.acknowledgementId)||
    !Array.isArray(ack.documentReferences)||!ack.documentReferences.every(v=>typeof v==="string"&&nonempty(v)))
    throw new Error("FRAPPE_COMMERCE_ACK_SCOPE_CONFLICT");
  return Object.freeze({outcome:ack.outcome,acknowledgementId:ack.acknowledgementId,
    documentReferences:Object.freeze([...(ack.documentReferences as string[])]),...dispatch});
}

