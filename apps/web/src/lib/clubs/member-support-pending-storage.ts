import { z } from "zod";
import { memberSupportAppliedResponseSchema, type MemberSupportCommandForReadback } from "./member-support-command-readback";

const id=z.string().regex(/^[A-Za-z0-9:_.-]{3,180}$/), sha=z.string().regex(/^[a-f0-9]{64}$/);
const category=z.enum(["booking","change","cancellation","arrival","service","access","document","other"]);
const commandSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("open_case"),bookingId:id.optional(),category,subject:z.string().trim().min(3).max(160),message:z.string().trim().min(3).max(4000)}).strict(),
  z.object({type:z.literal("add_message"),caseId:id,message:z.string().trim().min(3).max(4000)}).strict(),
]);
const ackSchema=z.object({receiptId:id,requestId:id,caseId:id,resultingVersion:z.number().int().positive(),
  resultingStatus:z.enum(["open","awaiting_team","awaiting_member","resolved","closed"]),
  replayed:z.boolean(),correlationId:z.string().regex(/^[A-Za-z0-9:_.-]{3,200}$/)}).strict();
const markerSchema=z.object({schema:z.literal("crays.member.support-pending.v1"),accountId:id,
  idempotencyKey:z.string().regex(/^[A-Za-z0-9:_.-]{16,200}$/),commandSha256:sha,messageSha256:sha,subjectSha256:sha.nullable(),
  action:z.enum(["open_case","add_message"]),caseId:id.nullable(),bookingId:id.nullable(),category:category.nullable(),
  acknowledged:z.boolean(),receipt:ackSchema.nullable()}).strict().superRefine((v,c)=>{
    if(v.action==="open_case"?(v.caseId!==null||v.category===null||v.subjectSha256===null):
       (v.caseId===null||v.bookingId!==null||v.category!==null||v.subjectSha256!==null)) c.addIssue({code:"custom",message:"Invalid original command context"});
    if(v.receipt&&(!v.acknowledged||v.action==="add_message"&&v.receipt.caseId!==v.caseId)) c.addIssue({code:"custom",message:"Receipt context mismatch"});
});
export type MemberSupportPendingMarker=z.infer<typeof markerSchema>;
export type MemberSupportPendingStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">;
export type MemberSupportDigest=(text:string)=>Promise<string>;
export const memberSupportDigest:MemberSupportDigest=async text=>{
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
};
function slot(accountId:string){return "crays.member.support.pending.v1:"+id.parse(accountId);}
function canonical(value:unknown){
  const c=commandSchema.parse(value);
  return c.type==="add_message"?{type:c.type,caseId:c.caseId,message:c.message}:
    {type:c.type,...(c.bookingId?{bookingId:c.bookingId}:{}),category:c.category,subject:c.subject,message:c.message};
}
export function restorePendingMemberSupport(accountId:string,storage:MemberSupportPendingStorage):MemberSupportPendingMarker|null{
  const raw=storage.getItem(slot(accountId));if(raw===null)return null;
  const marker=markerSchema.parse(JSON.parse(raw));
  if(marker.accountId!==accountId)throw Error("SUPPORT_PENDING_ACCOUNT_MISMATCH");
  return marker;
}
export async function createPendingMemberSupport(accountId:string,idempotencyKey:string,value:MemberSupportCommandForReadback,
  digest:MemberSupportDigest=memberSupportDigest):Promise<MemberSupportPendingMarker>{
  const c=canonical(value);
  const [commandSha256,messageSha256,subjectSha256]=await Promise.all([
    digest(JSON.stringify(c)),digest(c.message),c.type==="open_case"?digest(c.subject):Promise.resolve(null),
  ]);
  return markerSchema.parse({schema:"crays.member.support-pending.v1",accountId,idempotencyKey,commandSha256,messageSha256,subjectSha256,
    action:c.type,caseId:c.type==="add_message"?c.caseId:null,bookingId:c.type==="open_case"?c.bookingId??null:null,
    category:c.type==="open_case"?c.category:null,acknowledged:false,receipt:null});
}
/** Fingerprints and original IDs only: no message, subject, credential or provider token. */
export function persistPendingMemberSupport(marker:MemberSupportPendingMarker,storage:MemberSupportPendingStorage):MemberSupportPendingMarker{
  const value=markerSchema.parse(marker),old=restorePendingMemberSupport(value.accountId,storage);
  if(old){
    if(old.idempotencyKey!==value.idempotencyKey||old.commandSha256!==value.commandSha256||
       old.messageSha256!==value.messageSha256||old.subjectSha256!==value.subjectSha256||old.action!==value.action||
       old.caseId!==value.caseId||old.bookingId!==value.bookingId||old.category!==value.category)throw Error("SUPPORT_PENDING_ORIGINAL_PROTECTED");
    return old;
  }
  const key=slot(value.accountId),raw=JSON.stringify(value);
  storage.setItem(key,raw);
  if(storage.getItem(key)!==raw)throw Error("SUPPORT_PENDING_PERSISTENCE_UNPROVEN");
  return value;
}
export function acknowledgePendingMemberSupport(accountId:string,storage:MemberSupportPendingStorage,key:string,payload:unknown){
  const old=restorePendingMemberSupport(accountId,storage);
  if(!old||old.idempotencyKey!==key)throw Error("SUPPORT_PENDING_ACK_KEY_MISMATCH");
  const parsed=memberSupportAppliedResponseSchema.safeParse(payload);
  const receipt=parsed.success?{receiptId:parsed.data.receipt.receiptId,requestId:parsed.data.receipt.requestId,
    caseId:parsed.data.receipt.caseId,resultingVersion:parsed.data.receipt.resultingVersion,
    resultingStatus:parsed.data.receipt.resultingStatus,replayed:parsed.data.receipt.replayed,correlationId:parsed.data.correlationId}:null;
  // An acknowledged but unparseable HTTP200 remains read-only, not safe to POST again.
  const identityFields=["receiptId","requestId","caseId","resultingVersion","resultingStatus"] as const;
  if(old.receipt&&receipt&&identityFields.some(k=>old.receipt![k]!==receipt[k]))throw Error("SUPPORT_PENDING_RECEIPT_CHANGED");
  const value=markerSchema.parse({...old,acknowledged:true,receipt:old.receipt??receipt});
  const raw=JSON.stringify(value);storage.setItem(slot(accountId),raw);
  if(storage.getItem(slot(accountId))!==raw)throw Error("SUPPORT_PENDING_ACK_UNPROVEN");
  return value;
}
export function pendingMemberSupportPayload(marker:MemberSupportPendingMarker){
  if(!marker.receipt)return null;
  const {correlationId,...receipt}=marker.receipt;
  return {status:"applied",correlationId,receipt:{...receipt,outcome:"applied",reason:null}};
}
export async function matchesPendingMemberSupport(marker:MemberSupportPendingMarker,command:MemberSupportCommandForReadback,
  digest:MemberSupportDigest=memberSupportDigest){
  return await digest(JSON.stringify(canonical(command)))===marker.commandSha256;
}
export function clearPendingMemberSupport(accountId:string,storage:MemberSupportPendingStorage,key:string){
  const old=restorePendingMemberSupport(accountId,storage);
  if(!old||old.idempotencyKey!==key)throw Error("SUPPORT_PENDING_CLEAR_KEY_MISMATCH");
  storage.removeItem(slot(accountId));
  if(storage.getItem(slot(accountId))!==null)throw Error("SUPPORT_PENDING_CLEAR_UNPROVEN");
}
