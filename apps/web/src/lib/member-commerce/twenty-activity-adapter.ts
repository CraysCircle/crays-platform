import "server-only";
import type {observeTwentyCrmActivity,preparePartnerCrmActivityPersistence,preparePartnerCrmActivityRevocation} from "./partner-crm-activity-projection-contract";
type Outbox=ReturnType<typeof preparePartnerCrmActivityPersistence>["outboxRecord"]|ReturnType<typeof preparePartnerCrmActivityRevocation>["outboxRecord"];
export type TwentyActivityEndpoint=Readonly<{baseUrl:string;bearerSecretRef:string;timeoutMs:number;maxResponseBytes:number}>;
export type TwentySecretResolver=(ref:string)=>Promise<string>;
const nonempty=(v:string)=>v.trim().length>0;
export async function dispatchPartnerCrmActivityToTwenty(input:Readonly<{outbox:Outbox;endpoint:TwentyActivityEndpoint;resolveSecret:TwentySecretResolver;fetchImpl?:typeof fetch}>){
 const o=input.outbox;if(o.targetProvider!=="twenty"||!["UPSERT_ACTIVITY_POINTER","REVOKE_ACTIVITY_POINTER"].includes(o.operation))throw new Error("TWENTY_ACTIVITY_OPERATION_DENIED");
 const url=new URL(input.endpoint.baseUrl);if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)throw new Error("TWENTY_ACTIVITY_ENDPOINT_INVALID");url.pathname=url.pathname.replace(/\/$/,"")+"/graphql";
 const token=await input.resolveSecret(input.endpoint.bearerSecretRef);if(!nonempty(token))throw new Error("TWENTY_ACTIVITY_SECRET_UNAVAILABLE");
 const field=o.operation==="UPSERT_ACTIVITY_POINTER"?"craysUpsertRelationshipActivityPointer":"craysRevokeRelationshipActivityPointer";
 const query=`mutation CraysRelationshipActivityPointer($input: CraysRelationshipActivityPointerInput!) { ${field}(input: $input) { providerReceiptId providerEventId twentyActivityPointerId partnerTenantId operatorLegalEntityId storeId relationshipId relationshipVersion operation observedPayloadSha256 signatureVerified acknowledgedAt } }`;
 let response:Response;try{response=await(input.fetchImpl??fetch)(url,{method:"POST",redirect:"manual",headers:{"content-type":"application/json","authorization":`Bearer ${token}`,"x-crays-idempotency-key":o.idempotencyKey},body:JSON.stringify({query,variables:{input:{partnerTenantId:o.partnerTenantId,operatorLegalEntityId:o.operatorLegalEntityId,storeId:o.storeId,relationshipId:o.relationshipId,relationshipVersion:o.relationshipVersion,operation:o.operation,payload:o.payload,payloadSha256:o.payloadSha256}}})});}catch{return Object.freeze({outcome:"unknown"as const})}
 if(response.status>=300&&response.status<400)throw new Error("TWENTY_ACTIVITY_REDIRECT_DENIED");if(!response.ok)return Object.freeze({outcome:response.status===429||response.status>=500?"retryable_failure"as const:"permanent_failure"as const,status:response.status});
 const buffer=await response.arrayBuffer();if(buffer.byteLength>input.endpoint.maxResponseBytes)throw new Error("TWENTY_ACTIVITY_RESPONSE_TOO_LARGE");let raw:unknown;try{raw=JSON.parse(new TextDecoder().decode(buffer))}catch{throw new Error("TWENTY_ACTIVITY_RESPONSE_INVALID")}const envelope=raw as {errors?:unknown;data?:Record<string,unknown>};if(envelope.errors)throw new Error("TWENTY_ACTIVITY_PROVIDER_REJECTED");const receipt=envelope.data?.[field];if(!receipt)throw new Error("TWENTY_ACTIVITY_RECEIPT_MISSING");
 return Object.freeze({outcome:"acknowledged"as const,receipt:receipt as Parameters<typeof observeTwentyCrmActivity>[1]});
}

