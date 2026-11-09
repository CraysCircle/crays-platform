import "server-only";
import type {FrappeCommerceEndpoint,FrappeSecretResolver} from "./frappe-commerce-adapter";
const METHOD="crays.erp.observe_commerce_actual" as const;
const HASH=/^[a-f0-9]{64}$/;
const nonempty=(v:string)=>v.trim().length>0;
export type ErpActualObservationScope=Readonly<{
 partnerTenantId:string;operatorLegalEntityId:string;storeId:string;orderId:string;
 orderSellerSnapshotSha256:string;erpSiteId:string;erpCompanyId:string;accountingPeriod:string;
 erpAcknowledgementId:string;acknowledgedAt:string;
}>;
export async function observeCommerceActualFromFrappe(input:Readonly<{
 scope:ErpActualObservationScope;endpoint:FrappeCommerceEndpoint;
 resolveSecret:FrappeSecretResolver;fetchImpl?:typeof fetch;
}>){
 const s=input.scope;
 if(![s.partnerTenantId,s.operatorLegalEntityId,s.storeId,s.orderId,s.erpSiteId,
   s.erpCompanyId,s.erpAcknowledgementId].every(nonempty)||
   !HASH.test(s.orderSellerSnapshotSha256)||
   !/^\d{4}-(0[1-9]|1[0-2])$/.test(s.accountingPeriod)||
   !Number.isFinite(Date.parse(s.acknowledgedAt)))throw new Error("ERP_ACTUAL_OBSERVATION_SCOPE_INVALID");
 if(input.endpoint.erpSiteId!==s.erpSiteId)throw new Error("ERP_ACTUAL_OBSERVATION_SITE_CONFLICT");
 const base=new URL(input.endpoint.baseUrl);
 if(base.protocol!=="https:"||base.username||base.password||base.search||base.hash)
   throw new Error("ERP_ACTUAL_OBSERVATION_ENDPOINT_INVALID");
 base.pathname=base.pathname.replace(/\/$/,"")+`/api/method/${METHOD}`;
 const [key,secret]=await Promise.all([input.resolveSecret(input.endpoint.apiKeySecretRef),
   input.resolveSecret(input.endpoint.apiSecretSecretRef)]);
 if(!nonempty(key)||!nonempty(secret))throw new Error("ERP_ACTUAL_OBSERVATION_SECRET_UNAVAILABLE");
 let response:Response;
 try{response=await (input.fetchImpl??fetch)(base,{method:"POST",redirect:"manual",
   headers:{"content-type":"application/json","authorization":`token ${key}:${secret}`},
   body:JSON.stringify({method:METHOD,scope:s})});}
 catch{return Object.freeze({outcome:"unknown" as const,providerReachable:false});}
 if(response.status>=300&&response.status<400)throw new Error("ERP_ACTUAL_OBSERVATION_REDIRECT_DENIED");
 if(!response.ok)return Object.freeze({outcome:"unavailable" as const,providerReachable:false,status:response.status});
 const body=await response.arrayBuffer();
 if(body.byteLength>input.endpoint.maxResponseBytes)throw new Error("ERP_ACTUAL_OBSERVATION_RESPONSE_TOO_LARGE");
 let raw:unknown;try{raw=JSON.parse(new TextDecoder().decode(body));}catch{throw new Error("ERP_ACTUAL_OBSERVATION_RESPONSE_INVALID");}
 const message=raw&&typeof raw==="object"&&"message" in raw?(raw as {message?:unknown}).message:null;
 if(!message||typeof message!=="object")throw new Error("ERP_ACTUAL_OBSERVATION_INVALID");
 const actual=message as Record<string,unknown>;
 for(const key of ["partnerTenantId","operatorLegalEntityId","storeId","orderId",
   "orderSellerSnapshotSha256","erpSiteId","erpCompanyId","accountingPeriod","erpAcknowledgementId"]){
   if(actual[key]!==s[key as keyof ErpActualObservationScope])throw new Error("ERP_ACTUAL_OBSERVATION_SCOPE_CONFLICT");
 }
 if(typeof actual.actualObservedAt!=="string"||Date.parse(actual.actualObservedAt)<Date.parse(s.acknowledgedAt)||
   typeof actual.sourceReceiptSha256!=="string"||!HASH.test(actual.sourceReceiptSha256)||
   actual.sourceSignatureVerified!==true||!actual.actualPayload||typeof actual.actualPayload!=="object"||
   Array.isArray(actual.actualPayload))throw new Error("ERP_ACTUAL_OBSERVATION_EVIDENCE_INVALID");
 return Object.freeze({outcome:"observed" as const,providerReachable:true,
   actualObservedAt:actual.actualObservedAt,actualPayload:Object.freeze({...actual.actualPayload as Record<string,unknown>}),
   sourceReceiptSha256:actual.sourceReceiptSha256,sourceSignatureVerified:true as const});
}

