import "server-only";
import {memberSupportCommandKeySchema,parseOwnMemberSupportCommandStatus} from "../lib/clubs/member-support-command-status-contract";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {ownSupportCommandSchema,ownSupportStateSchema,ownSupportReceiptSchema} from "./member-support-native-contract";

const id=z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/);
const document=z.object({documentId:id,bookingUrn:z.string().regex(/^urn:crays:clubs:booking:[A-Za-z0-9:_.-]{3,180}$/),kind:z.string().min(1).max(100),title:z.string().min(1).max(300),providerKey:z.string().min(1).max(100),providerObjectReference:z.string().min(1).max(1000),providerVersionReference:z.string().min(1).max(1000).nullable(),contentSha256:z.string().regex(/^[a-f0-9]{64}$/).nullable(),createdAt:z.iso.datetime({offset:true}),directProviderUrl:z.null()}).strict();
const documents=z.object({accountId:id,documents:z.array(document)}).strict().superRefine((v,c)=>{
 if(new Set(v.documents.map(d=>d.documentId)).size!==v.documents.length)c.addIssue({code:"custom",message:"Duplicate original document"});
});
const key=z.string().regex(/^[A-Za-z0-9:_.-]{16,200}$/);
export type MemberSupportSdk=Readonly<{issuer:string;subject:string;serverConfiguredClientId:string;expectedAccountId:string;sessionReady:true}>;
/** Server-only ports. Deployment must supply the admitted existing XL BFF/API.
 * No browser account, raw provider credential or generic database fallback. */
export type MemberStaySupportPorts=Readonly<{
 resolveCurrentSdk:(request:Request)=>Promise<MemberSupportSdk|null>;
 validateMutationRequest:(request:Request)=>Readonly<{allowed:boolean;reason?:string}>;
 readSupport:(sdk:MemberSupportSdk)=>Promise<unknown>;
 readDocuments:(sdk:MemberSupportSdk)=>Promise<unknown>;
 readSupportCommand?:(sdk:MemberSupportSdk,idempotencyKey:string)=>Promise<unknown>;
 executeSupport:(sdk:MemberSupportSdk,input:Readonly<{idempotencyKey:string;correlationId:string;command:z.output<typeof ownSupportCommandSchema>}>)=>Promise<unknown>;
}>;
const headers={"cache-control":"private, no-store","vary":"cookie"};
function reply(body:unknown,status:number,extra:Record<string,string>={}){return Response.json(body,{status,headers:{...headers,...extra}});}
// Purpose-bound diagnostic: never log message text, actor, session, headers or credentials.
function replyPost(body:Record<string,unknown>,status:number,extra:Record<string,string>={}){
 const reasons=new Set(["origin_mismatch","cross_site_request","json_required","mutation_request_denied"]);
 const phase=body.status==="unknown_outcome"?"writer_outcome_unknown":body.status==="applied"?"writer_acknowledged":body.status==="identity_binding_required"?"sdk_admission":body.status==="validation_error"?"input_validation":body.status==="denied"&&typeof body.reason==="string"&&reasons.has(body.reason)?"request_security":"writer_response";
 console.warn(JSON.stringify({event:"member_support_post_result",phase,httpStatus:status,...(typeof body.reason==="string"&&reasons.has(body.reason)?{reason:body.reason}:{})}));
 return reply(body,status,extra);
}
function authFailure(error:unknown){
 const code=typeof error==="object"&&error!==null&&"extensions" in error?(error as {extensions?:{code?:unknown}}).extensions?.code:null;
 if(code==="UNAUTHENTICATED")return reply({status:"signed_out"},401);
 if(code==="FORBIDDEN")return reply({status:"denied"},403);
 if(code==="IDENTITY_BINDING_REQUIRED")return reply({status:"identity_binding_required"},409);
 return reply({status:"temporarily_unavailable"},503);
}
async function actor(request:Request,ports:MemberStaySupportPorts){
 const sdk=await ports.resolveCurrentSdk(request);
 if(!sdk)return null;
 if(sdk.sessionReady!==true||!/^google-oauth2\|\S+$/.test(sdk.subject)||!sdk.issuer||!sdk.serverConfiguredClientId||!id.safeParse(sdk.expectedAccountId).success)throw Error("MEMBER_SUPPORT_SERVER_ACTOR_INVALID");
 return sdk;
}
export function createMemberStaySupportHandlers(ports:MemberStaySupportPorts){
 return {
  GET:async(request:Request)=>{
   let sdk:MemberSupportSdk|null;
   try{sdk=await actor(request,ports);}catch(e){return authFailure(e);}
   if(!sdk)return reply({status:"identity_binding_required"},409);
   const query=new URL(request.url).searchParams;
   if(query.has("commandKey")){
    const values=query.getAll("commandKey");
    if(values.length!==1||[...query.keys()].some(name=>name!=="commandKey")||
       !memberSupportCommandKeySchema.safeParse(values[0]).success)return reply({status:"validation_error"},400);
    if(!ports.readSupportCommand)return reply({status:"temporarily_unavailable"},503);
    try{
     const result=parseOwnMemberSupportCommandStatus(await ports.readSupportCommand(sdk,values[0]),sdk.expectedAccountId,values[0]);
     return reply(result,200);
    }catch{return reply({status:"temporarily_unavailable"},503);}
   }
   try{
    const [supportRaw,documentsRaw]=await Promise.all([ports.readSupport(sdk),ports.readDocuments(sdk)]);
    const support=ownSupportStateSchema.parse(supportRaw),docs=documents.parse(documentsRaw);
    if(support.accountId!==sdk.expectedAccountId||docs.accountId!==sdk.expectedAccountId||support.selectedCaseId!==null)throw Error("MEMBER_SUPPORT_FULL_REST_SCOPE_INVALID");
    // Original existing REST envelope: both families required; never replace failed
    // documents with [] or publish source test fixtures as database rows.
    return reply({status:"ready",documents:docs.documents,supportCases:support.supportCases},200);
   }catch{return reply({status:"temporarily_unavailable"},503);}
  },
  POST:async(request:Request)=>{
   let sdk:MemberSupportSdk|null;
   try{sdk=await actor(request,ports);}catch(e){const response=authFailure(e); console.warn(JSON.stringify({event:"member_support_post_result",phase:"sdk_admission",httpStatus:response.status})); return response;}
   if(!sdk)return replyPost({status:"identity_binding_required"},409);
   const security=ports.validateMutationRequest(request);
   if(!security.allowed)return replyPost({status:"denied",reason:security.reason??"mutation_request_denied"},403);
   const idempotencyKey=request.headers.get("idempotency-key")?.trim()??"";
   const contentLength=request.headers.get("content-length");
   if(!key.safeParse(idempotencyKey).success||contentLength!==null&&(!/^\d+$/.test(contentLength)||Number(contentLength)>16384))return replyPost({status:"validation_error"},400);
   let command:z.output<typeof ownSupportCommandSchema>;
   try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,"utf8")>16384)return replyPost({status:"validation_error"},400);
    command=ownSupportCommandSchema.parse(JSON.parse(raw));
   }catch{return replyPost({status:"validation_error"},400);}
   const correlationId=`clubs-member-support-${randomUUID()}`;
   try{
    const result=ownSupportReceiptSchema.parse(await ports.executeSupport(sdk,{idempotencyKey,correlationId,command}));
    if(result.accountId!==sdk.expectedAccountId)throw Error("MEMBER_SUPPORT_RECEIPT_SCOPE_INVALID");
    return replyPost({status:result.receipt.outcome,receipt:result.receipt,correlationId},result.receipt.outcome==="denied"?403:200);
   }catch(error){
    const code=typeof error==="object"&&error!==null&&"code" in error?(error as {code?:unknown}).code:null;
    if(code==="23505")return replyPost({status:"conflict"},409);
    if(code==="42501")return replyPost({status:"denied"},403);
    if(code==="22023")return replyPost({status:"validation_error"},400);
    return replyPost({status:"unknown_outcome",reason:"The Support outcome is unknown. Reconcile with GET before any same-key retry.",reconcileAt:"/api/crays/clubs/member/stay-support",retryWithSameIdempotencyKeyOnly:true},503,{"retry-after":"2"});
   }
  },
 };
}
