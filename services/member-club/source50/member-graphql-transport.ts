import type {ZodType} from "zod";

export type MemberOperation={operationName:string;id:string;field:string;kind:"query"|"mutation"};
export type MemberOperationRegistry={sourceSha256:string;operations:Readonly<Record<string,MemberOperation>>};
export class MemberGraphQLError extends Error {
 constructor(public readonly code:string,message:string,public readonly requestId?:string){super(message);this.name="MemberGraphQLError";}
}
const messages:Record<string,string>={UNAUTHENTICATED:"Please sign in to continue.",FORBIDDEN:"These details aren’t available to your account.",IDENTITY_BINDING_REQUIRED:"Your member account connection is being completed.",CONFLICT:"This has changed. Refresh before continuing.",VERSION_CONFLICT:"This has changed. Refresh before continuing.",BAD_USER_INPUT:"Please check the details and try again.",OUTCOME_UNKNOWN:"We couldn’t confirm the change. Keep this request reference and check again.",UNAVAILABLE:"We couldn’t load these details. Please try again."};
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const safeCode=(v:unknown)=>typeof v==="string"&&Object.hasOwn(messages,v)?v:"UNAVAILABLE";
const error=(code:string)=>new MemberGraphQLError(code,messages[code]??messages.UNAVAILABLE);
const principalFields=new Set(["accountId","tenantId","issuer","role","roleKey","actorId","customerId","serverConfiguredClientId","securityVersion","bookingAuthority","paymentAuthority"]);
function checkInput(value:unknown,depth=0){
 if(depth>20)throw error("BAD_USER_INPUT");
 if(Array.isArray(value)){if(value.length>100)throw error("BAD_USER_INPUT");for(const item of value)checkInput(item,depth+1);return;}
 if(object(value)){for(const [key,item] of Object.entries(value)){if(principalFields.has(key))throw error("BAD_USER_INPUT");checkInput(item,depth+1);}return;}
 if(value!==null&&!["string","number","boolean"].includes(typeof value))throw error("BAD_USER_INPUT");
 if(typeof value==="number"&&!Number.isFinite(value))throw error("BAD_USER_INPUT");
}
/** Exact module route alias on the common test host; original persisted body and rights stay unchanged. */
export function memberGraphQLEndpoint():string {
 return typeof window!=="undefined"&&(window.location.origin==="http://localhost:8990"||window.location.origin==="https://member.crays.world")?"/api/club-member/graphql":"/api/graphql";
}
/** Bind only to the Core owner's persisted operation registry. No provider endpoint or role is supplied by a member. */
export function createMemberGraphQLTransport(registry:MemberOperationRegistry,transport:typeof fetch=fetch){
 if(!/^[a-f0-9]{64}$/.test(registry.sourceSha256)||!Object.keys(registry.operations).length)throw error("UNAVAILABLE");
 const operations=Object.fromEntries(Object.entries(registry.operations).map(([key,value])=>{
  if(!/^[A-Za-z_][A-Za-z0-9_]{0,120}$/.test(value.operationName)||!/^[A-Za-z_][A-Za-z0-9_]{0,120}$/.test(value.field)||!/^sha256:[a-f0-9]{64}$/.test(value.id)||!["query","mutation"].includes(value.kind))throw error("UNAVAILABLE");
  return [key,Object.freeze({...value})];
 }));
 async function execute<T>(key:string,kind:"query"|"mutation",input:unknown,schema:ZodType<T>,options:{signal?:AbortSignal;requestId?:string}={}){
  const operation=operations[key];if(!operation||operation.kind!==kind)throw error("BAD_USER_INPUT");
  checkInput(input);const encoded=JSON.stringify(input);if(encoded.length>65536)throw error("BAD_USER_INPUT");
  if(kind==="mutation"){
   if(!options.requestId||!/^[A-Za-z0-9:_.-]{16,200}$/.test(options.requestId))throw error("BAD_USER_INPUT");
   if(!object(input)||input.requestId!==options.requestId)throw error("BAD_USER_INPUT");
  }
  if(options.signal?.aborted)throw new DOMException("Cancelled","AbortError");
  const controller=new AbortController(),abort=()=>controller.abort();let dispatched=false;
  options.signal?.addEventListener("abort",abort,{once:true});const timer=setTimeout(abort,30000);
  try{
   const headers:Record<string,string>={"content-type":"application/json","accept":"application/graphql-response+json, application/json"};
   if(options.requestId)headers["idempotency-key"]=options.requestId;
   dispatched=true;
   const response=await transport(memberGraphQLEndpoint(),{method:"POST",credentials:"same-origin",cache:"no-store",redirect:"error",headers,body:JSON.stringify({operationName:operation.operationName,variables:{input},extensions:{persistedQuery:{version:1,sha256Hash:operation.id}}}),signal:controller.signal});
   const value:unknown=await response.json().catch(()=>null);
   if(object(value)&&Array.isArray(value.errors)&&value.errors.length){
    if(kind==="mutation"&&object(value.data)&&value.data[operation.field]!==undefined&&value.data[operation.field]!==null)throw error("OUTCOME_UNKNOWN");
    const codes=value.errors.map(item=>object(item)&&object(item.extensions)?safeCode(item.extensions.code):"UNAVAILABLE");
    const code=codes.find(c=>c!=="UNAVAILABLE")??"UNAVAILABLE";
    throw error(kind==="mutation"&&code==="UNAVAILABLE"?"OUTCOME_UNKNOWN":code);
   }
   if([401,403].includes(response.status))throw error(response.status===401?"UNAUTHENTICATED":"FORBIDDEN");
   if(!response.ok||!object(value)||value.errors!==undefined&&value.errors!==null&&(!Array.isArray(value.errors)||value.errors.length)||!object(value.data)||!Object.hasOwn(value.data,operation.field))throw error(kind==="mutation"?"OUTCOME_UNKNOWN":"UNAVAILABLE");
   let payload:unknown=value.data[operation.field];
   if(key==="ownFinanceRequests"||key==="financeRequestCommand"){
    if(!object(payload)||typeof payload.payloadJson!=="string"||payload.payloadJson.length>1048576)throw error(kind==="mutation"?"OUTCOME_UNKNOWN":"UNAVAILABLE");
    const envelopeSchema=payload.schema;payload=JSON.parse(payload.payloadJson);
    if(!object(payload)||payload.schema!==envelopeSchema)throw error(kind==="mutation"?"OUTCOME_UNKNOWN":"UNAVAILABLE");
   }
   if(key==="ownDemoDocuments"){
    if(!object(payload)||payload.schema!=="crays.clubs.member-demo-documents.v1"||typeof payload.payloadJson!=="string"||payload.payloadJson.length>1048576)throw error("UNAVAILABLE");
    const envelopeSchema=payload.schema;payload=JSON.parse(payload.payloadJson);
    if(!object(payload)||payload.schema!==envelopeSchema)throw error("UNAVAILABLE");
   }
   const parsed=schema.safeParse(payload);
   if(!parsed.success)throw error(kind==="mutation"?"OUTCOME_UNKNOWN":"UNAVAILABLE");
   if(options.signal?.aborted||controller.signal.aborted)throw error(kind==="mutation"?"OUTCOME_UNKNOWN":"UNAVAILABLE");
   return parsed.data;
  }catch(caught){
   if(caught instanceof MemberGraphQLError){if(caught.code==="OUTCOME_UNKNOWN")throw new MemberGraphQLError(caught.code,caught.message,options.requestId);throw caught;}
   if(options.signal?.aborted&&kind==="query")throw new DOMException("Cancelled","AbortError");
   const code=kind==="mutation"&&dispatched?"OUTCOME_UNKNOWN":"UNAVAILABLE";
   throw new MemberGraphQLError(code,messages[code],code==="OUTCOME_UNKNOWN"?options.requestId:undefined);
  }finally{clearTimeout(timer);options.signal?.removeEventListener("abort",abort);}
 }
 return Object.freeze({read:<T>(key:string,input:unknown,schema:ZodType<T>,signal?:AbortSignal)=>execute(key,"query",input,schema,{signal}),command:<T>(key:string,input:unknown,schema:ZodType<T>,requestId:string,signal?:AbortSignal)=>execute(key,"mutation",input,schema,{requestId,signal})});
}



