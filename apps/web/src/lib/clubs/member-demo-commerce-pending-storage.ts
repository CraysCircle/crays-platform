import {z} from "zod";
import {memberCommerceCommandSchema,memberNonpaymentCommerceCommandSchema,type MemberCommerceCommand} from "./member-demo-commerce-command-contract";
type Store=Pick<Storage,"getItem"|"setItem"|"removeItem">;
const pendingSchema=z.object({schema:z.literal("crays.member.commerce.pending.v1"),accountId:z.string().min(1).max(180),command:memberCommerceCommandSchema,commandId:z.string().min(1).max(180).nullable(),priorCommand:memberCommerceCommandSchema.optional()}).strict();
export type PendingMemberCommerce=z.output<typeof pendingSchema>;
function key(accountId:string){if(!/^[a-zA-Z0-9_-]{1,180}$/.test(accountId))throw Error("COMMERCE_PENDING_ACCOUNT_INVALID");return `crays.member.commerce.pending.v1:${accountId}`;}
export function restorePendingMemberCommerce(accountId:string,storage:Store):PendingMemberCommerce|null{
 const raw=storage.getItem(key(accountId));if(raw===null)return null;
 return decodePendingMemberCommerce(accountId,raw);
}
export function decodePendingMemberCommerce(accountId:string,raw:string):PendingMemberCommerce{
 key(accountId);
 if(raw.length>12000)throw Error("COMMERCE_PENDING_REVIEW_REQUIRED");
 let value:unknown;try{value=JSON.parse(raw);}catch{throw Error("COMMERCE_PENDING_REVIEW_REQUIRED");}
 const parsed=pendingSchema.safeParse(value);
 if(!parsed.success||parsed.data.accountId!==accountId)throw Error("COMMERCE_PENDING_REVIEW_REQUIRED");
 return parsed.data;
}
/** Save and read back before dispatch. A browser record never authorizes Core or
 * proves a provider effect. No automatic retry, expiry, or latest-order lookup. */
export function persistPendingMemberCommerce(accountId:string,storage:Store,command:MemberCommerceCommand,restartCommandId:string|null=null,correlatedRestart:CorrelatedMemberRestart|null=null){
 const parsed=memberCommerceCommandSchema.parse(command),existing=correlatedRestart===null?restorePendingMemberCommerce(accountId,storage):decodePendingMemberCommerce(accountId,correlatedRestart.originalRaw);
 const same=existing&&JSON.stringify(existing.command)===JSON.stringify(parsed);
 const correlated=correlatedRestart!==null&&validateCorrelatedMemberRestart(accountId,storage,parsed,correlatedRestart);
 const restart=existing&&["add","adjust","remove"].includes(existing.command.action)&&parsed.action==="restart"&&restartCommandId!==null&&parsed.commandId===restartCommandId&&(existing.commandId===restartCommandId||correlated);
 if(existing&&!same&&!restart)throw Error("COMMERCE_PENDING_RECONCILIATION_REQUIRED");
 const next:PendingMemberCommerce=same?existing:{schema:"crays.member.commerce.pending.v1",accountId,command:parsed,commandId:null,...(restart?{priorCommand:existing.command}:{})};
 if(correlatedRestart!==null&&!validateCorrelatedMemberRestart(accountId,storage,parsed,correlatedRestart))throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
 storage.setItem(key(accountId),JSON.stringify(next));
 if(JSON.stringify(restorePendingMemberCommerce(accountId,storage))!==JSON.stringify(next))throw Error("COMMERCE_PENDING_NOT_RETAINED");
 return next;
}
export function recordPendingMemberCommerceId(accountId:string,storage:Store,idempotencyKey:string,commandId:string){
 const saved=restorePendingMemberCommerce(accountId,storage);
 if(!saved||saved.command.idempotencyKey!==idempotencyKey||saved.commandId!==null&&saved.commandId!==commandId)throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
 const next=pendingSchema.parse({...saved,commandId});storage.setItem(key(accountId),JSON.stringify(next));
 if(JSON.stringify(restorePendingMemberCommerce(accountId,storage))!==JSON.stringify(next))throw Error("COMMERCE_PENDING_NOT_RETAINED");
}
export function clearPendingMemberCommerce(accountId:string,storage:Store,idempotencyKey:string){
 const saved=restorePendingMemberCommerce(accountId,storage);
 if(saved&&saved.command.idempotencyKey!==idempotencyKey)throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
 storage.removeItem(key(accountId));if(storage.getItem(key(accountId))!==null)throw Error("COMMERCE_PENDING_NOT_CLEARED");
}

import {commerceReadSchema} from "./member-demo-commerce-client";
type MappingStore=Pick<Storage,"getItem"|"setItem"|"key"|"length">;
const pending=pendingSchema;
const mapping=z.object({schema:z.literal("crays.member.commerce.reference-mapping.v1"),accountId:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/),originalRaw:z.string().max(12000),commandId:z.string().min(1).max(180),cartId:z.string().min(1).max(180)}).strict();
const prefix=(account:string)=>`crays.member.commerce.reference-mapping.v1:${account}:`;
async function hash(raw:string){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)))).map(x=>x.toString(16).padStart(2,"0")).join("");}
function keys(account:string,storage:MappingStore){const result:string[]=[],length=storage.length;if(!Number.isInteger(length)||length<0||length>4096)throw Error("COMMERCE_REFERENCE_STORAGE_REVIEW_REQUIRED");for(let n=0;n<length;n++){const key=storage.key(n);if(key?.startsWith(prefix(account)))result.push(key);}if(result.length>16)throw Error("COMMERCE_REFERENCE_ARCHIVE_FULL");return result;}
/** Local correlation only, never authority. The caller still requires fresh Core
 * status/cart correlation before an explicit restart. Original raw is untouched. */
export async function resolveMappedPendingMemberCommerceId(account:string,raw:string,storage:MappingStore,readback:unknown,isCurrent:()=>boolean):Promise<string|null>{
 if(!/^[a-zA-Z0-9_-]{1,180}$/.test(account)||raw.length>12000||!isCurrent())return null;
 const saved=pending.parse(JSON.parse(raw)),decoded=commerceReadSchema.safeParse(readback);if(saved.accountId!==account||!["add","adjust","remove"].includes(saved.command.action)||!decoded.success)return null;
 const proof=decoded.data,status=proof.commandStatus,cart=proof.cart;
 if(proof.accountId!==account||!status?.found||status.accountId!==account||status.state!=="unknown"||status.idempotencyKey!==saved.command.idempotencyKey||JSON.stringify(status.command)!==JSON.stringify(saved.command)||!cart||cart.state!=="reconciliation_required"||!cart.canStartFreshCart||cart.cartId!==status.cartId||cart.unknownCommandId!==status.commandId||cart.version!==saved.command.expectedVersion+1||cart.lines.length!==0||Object.keys(cart.order).length!==0)return null;
 let id:string|null=null;const selected:{key:string;value:string}[]=[];
 for(const key of keys(account,storage)){const value=storage.getItem(key);if(value===null)continue;if(value.length>16000)throw Error("COMMERCE_REFERENCE_ARCHIVE_REVIEW_REQUIRED");const entry=mapping.parse(JSON.parse(value));if(entry.accountId!==account||key!==prefix(account)+entry.sha256||await hash(entry.originalRaw)!==entry.sha256)throw Error("COMMERCE_REFERENCE_ARCHIVE_REVIEW_REQUIRED");if(entry.originalRaw===raw){if(entry.commandId!==status.commandId||entry.cartId!==cart.cartId||id!==null&&id!==entry.commandId)throw Error("COMMERCE_REFERENCE_CONFLICT");id=entry.commandId;selected.push({key,value});}}
 return isCurrent()&&storage.getItem(`crays.member.commerce.pending.v1:${account}`)===raw&&selected.every(entry=>storage.getItem(entry.key)===entry.value)?id:null;
}
/** QA replacement candidate. Never writes/clears the primary pending key. A
 * stale mapping cannot replace a newer intent because it matches exact raw only.
 * Each original raw has its own immutable archive; no shared index lost-update. */
export async function retainCorrelatedPendingMemberCommerceMapping(account:string,storage:MappingStore,readback:unknown,isCurrent:()=>boolean):Promise<boolean>{
 if(!/^[a-zA-Z0-9_-]{1,180}$/.test(account)||!isCurrent())return false;
 const pk=`crays.member.commerce.pending.v1:${account}`,raw=storage.getItem(pk);
 if(raw===null)return false;if(raw.length>12000)throw Error("COMMERCE_PENDING_REVIEW_REQUIRED");
 const saved=pending.parse(JSON.parse(raw)),decoded=commerceReadSchema.safeParse(readback);
 if(saved.accountId!==account||!["add","adjust","remove"].includes(saved.command.action)||!decoded.success)return false;
 const proof=decoded.data,status=proof.commandStatus,cart=proof.cart;
 if(proof.accountId!==account||!status?.found||status.accountId!==account||status.state!=="unknown"||status.idempotencyKey!==saved.command.idempotencyKey||JSON.stringify(status.command)!==JSON.stringify(saved.command)||!cart||cart.state!=="reconciliation_required"||!cart.canStartFreshCart||cart.cartId!==status.cartId||cart.unknownCommandId!==status.commandId||cart.version!==saved.command.expectedVersion+1||cart.lines.length!==0||Object.keys(cart.order).length!==0)return false;
 const digest=await hash(raw),key=prefix(account)+digest;
 if(!isCurrent()||storage.getItem(pk)!==raw)return false;
 const serialized=JSON.stringify(mapping.parse({schema:"crays.member.commerce.reference-mapping.v1",accountId:account,sha256:digest,originalRaw:raw,commandId:status.commandId,cartId:status.cartId}));
 if(serialized.length>16000)throw Error("COMMERCE_REFERENCE_ARCHIVE_FULL");
 const existing=storage.getItem(key);
 if(existing!==null&&existing!==serialized)throw Error("COMMERCE_REFERENCE_ARCHIVE_CONFLICT");
 if(existing===null){if(keys(account,storage).length>=16)throw Error("COMMERCE_REFERENCE_ARCHIVE_FULL");storage.setItem(key,serialized);}
 if(storage.getItem(key)!==serialized)throw Error("COMMERCE_REFERENCE_ARCHIVE_NOT_RETAINED");
 return isCurrent()&&storage.getItem(pk)===raw;
}
export type CorrelatedMemberRestart={originalRaw:string;readback:unknown;mappingKey:string;mappingValue:string;digest:string;commandId:string;isCurrent:()=>boolean};
/** Only the explicit restart handler requests this evidence. No primary write,
 * command dispatch, reference clearing or missing-key inference occurs here. */
export async function prepareCorrelatedMemberRestart(account:string,storage:MappingStore,originalRaw:string,readback:unknown,command:MemberCommerceCommand,isCurrent:()=>boolean):Promise<CorrelatedMemberRestart|null>{
 if(command.action!=="restart")return null;
 if(!isCurrent()||storage.getItem(key(account))!==originalRaw)return null;
 if(!await retainCorrelatedPendingMemberCommerceMapping(account,storage,readback,isCurrent))return null;
 const commandId=await resolveMappedPendingMemberCommerceId(account,originalRaw,storage,readback,isCurrent);
 if(commandId===null)return null;
 const digest=await hash(originalRaw),mappingKey=prefix(account)+digest,mappingValue=storage.getItem(mappingKey);
 if(mappingValue===null||!isCurrent()||storage.getItem(key(account))!==originalRaw)return null;
 const proof={originalRaw,readback,mappingKey,mappingValue,digest,commandId,isCurrent};
 return validateCorrelatedMemberRestart(account,storage,command,proof)?proof:null;
}
function validateCorrelatedMemberRestart(account:string,storage:Pick<Storage,"getItem">,command:MemberCommerceCommand,evidence:CorrelatedMemberRestart):boolean{
 if(command.action!=="restart"||evidence.originalRaw.length>12000||evidence.mappingValue.length>16000||!evidence.isCurrent())return false;
 const original=pendingSchema.safeParse(JSON.parse(evidence.originalRaw)),decoded=commerceReadSchema.safeParse(evidence.readback),entry=mapping.safeParse(JSON.parse(evidence.mappingValue));
 if(!original.success||!decoded.success||!entry.success)return false;
 const saved=original.data,proof=decoded.data,status=proof.commandStatus,cart=proof.cart,m=entry.data;
 return saved.accountId===account&&["add","adjust","remove"].includes(saved.command.action)&&proof.accountId===account&&Boolean(status?.found&&status.accountId===account&&status.state==="unknown"&&status.commandId===evidence.commandId&&status.idempotencyKey===saved.command.idempotencyKey&&JSON.stringify(status.command)===JSON.stringify(saved.command)&&cart&&cart.state==="reconciliation_required"&&cart.canStartFreshCart&&cart.cartId===status.cartId&&cart.unknownCommandId===status.commandId&&cart.version===saved.command.expectedVersion+1&&cart.version===command.expectedVersion&&cart.lines.length===0&&Object.keys(cart.order).length===0&&command.commandId===status.commandId)&&m.accountId===account&&m.originalRaw===evidence.originalRaw&&m.sha256===evidence.digest&&evidence.mappingKey===prefix(account)+evidence.digest&&m.commandId===evidence.commandId&&m.cartId===cart?.cartId&&storage.getItem(key(account))===evidence.originalRaw&&storage.getItem(evidence.mappingKey)===evidence.mappingValue;
}

// Exact missing-intent restart retention and explicit marker recovery.
type MissingIntentStore=Pick<Storage,"getItem"|"setItem"|"key"|"length">;
const missingIntentArchiveSchema=z.object({schema:z.literal("crays.member.commerce.missing-intent-archive.v1"),accountId:z.string(),originalRaw:z.string().max(12000),sha256:z.string().regex(/^[a-f0-9]{64}$/),cartId:z.string().min(1),cartVersion:z.number().int().positive(),unknownCommandId:z.string().min(1)}).strict();
export type MissingIntentRestart={originalRaw:string;readback:unknown;originalReadback?:unknown;command:MemberCommerceCommand;archiveKey:string;archiveValue:string;isCurrent:()=>boolean};
const pendingKey=(account:string)=>`crays.member.commerce.pending.v1:${account}`;
const missingIntentArchivePrefix=(account:string)=>`crays.member.commerce.missing-intent-archive.v1:${account}:`;
async function missingIntentRawSha(raw:string){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)))).map(n=>n.toString(16).padStart(2,"0")).join("");}
function correlateMissingIntentRestart(account:string,raw:string,readback:unknown,restart:MemberCommerceCommand,originalReadback?:unknown){
 if(raw.length>12000||restart.action!=="restart")return null;
 const saved=decodePendingMemberCommerce(account,raw),decoded=commerceReadSchema.safeParse(readback);
 let original=memberNonpaymentCommerceCommandSchema.safeParse(saved.command);
 const recovering=saved.command.action==="restart";
 if(saved.command.action==="restart"){
  if(saved.commandId!==null||!saved.command.abandonedCommand||!saved.priorCommand||saved.command.commandId!==restart.commandId||saved.command.expectedVersion!==restart.expectedVersion||saved.command.idempotencyKey===restart.idempotencyKey)return null;
  original=memberNonpaymentCommerceCommandSchema.safeParse(saved.priorCommand);
  if(!original.success||JSON.stringify(original.data)!==JSON.stringify(saved.command.abandonedCommand)||original.data.idempotencyKey===saved.command.idempotencyKey)return null;
 }
 if(!original.success||!decoded.success||restart.idempotencyKey===original.data.idempotencyKey)return null;
 const proof=decoded.data,cart=proof.cart,status=proof.commandStatus;
 // Missing status is not evidence of past effect absence. The optional nested
 // command asks Core to fence future prepares atomically, before any archive.
 if(proof.accountId!==account||!status||status.found!==false||status.accountId!==account||status.idempotencyKey!==saved.command.idempotencyKey||!cart||cart.state!=="reconciliation_required"||!cart.canStartFreshCart||cart.unknownCommandId===null||cart.unknownCommandId!==restart.commandId||cart.version!==restart.expectedVersion||cart.lines.length!==0||Object.keys(cart.order).length!==0)return null;
 if(recovering){
  const second=commerceReadSchema.safeParse(originalReadback);if(!second.success)return null;
  const prior=second.data.commandStatus;
  if(second.data.accountId!==account||!prior||prior.found!==false||prior.accountId!==account||prior.idempotencyKey!==original.data.idempotencyKey||JSON.stringify(second.data.cart)!==JSON.stringify(cart))return null;
 }else if(originalReadback!==undefined)return null;
 const command=memberCommerceCommandSchema.parse({...restart,abandonedCommand:original.data});
 return {command,cart,original:original.data};
}
/** QA-only explicit restart preparation. Archives exact raw and returns a future
 * atomic Core-fence request. Never replaces/clears pending or dispatches a write. */
export async function prepareMissingIntentMemberRestart(account:string,storage:MissingIntentStore,raw:string,readback:unknown,restart:MemberCommerceCommand,isCurrent:()=>boolean,originalReadback?:unknown):Promise<MissingIntentRestart|null>{
 if(!isCurrent()||storage.getItem(pendingKey(account))!==raw)return null;
 const pair=correlateMissingIntentRestart(account,raw,readback,restart,originalReadback);if(!pair)return null;
 const digest=await missingIntentRawSha(raw),archiveKey=missingIntentArchivePrefix(account)+digest,archiveValue=JSON.stringify(missingIntentArchiveSchema.parse({schema:"crays.member.commerce.missing-intent-archive.v1",accountId:account,originalRaw:raw,sha256:digest,cartId:pair.cart.cartId,cartVersion:pair.cart.version,unknownCommandId:pair.cart.unknownCommandId}));
 if(!isCurrent()||storage.getItem(pendingKey(account))!==raw)return null;
 if(archiveValue.length>16000)throw Error("COMMERCE_INTENT_ARCHIVE_FULL");
 const old=storage.getItem(archiveKey);if(old!==null&&old!==archiveValue)throw Error("COMMERCE_INTENT_ARCHIVE_CONFLICT");
 if(old===null){const length=storage.length;if(!Number.isInteger(length)||length<0||length>4096)throw Error("COMMERCE_INTENT_ARCHIVE_REVIEW_REQUIRED");let count=0;for(let n=0;n<length;n++)if(storage.key(n)?.startsWith(missingIntentArchivePrefix(account)))count++;if(count>=16)throw Error("COMMERCE_INTENT_ARCHIVE_FULL");storage.setItem(archiveKey,archiveValue);}
 if(storage.getItem(archiveKey)!==archiveValue)throw Error("COMMERCE_INTENT_ARCHIVE_NOT_RETAINED");
 const evidence={originalRaw:raw,readback,originalReadback,command:pair.command,archiveKey,archiveValue,isCurrent};
 return await validateMissingIntentMemberRestart(account,storage,evidence)?evidence:null;
}
export async function validateMissingIntentMemberRestart(account:string,storage:Pick<Storage,"getItem">,evidence:MissingIntentRestart):Promise<boolean>{
 const {originalRaw,archiveKey,archiveValue,isCurrent}=evidence,commandRaw=JSON.stringify(evidence.command),readbackRaw=JSON.stringify(evidence.readback),originalReadbackRaw=JSON.stringify(evidence.originalReadback);
 if(!isCurrent()||archiveValue.length>16000)return false;
 const pair=correlateMissingIntentRestart(account,evidence.originalRaw,evidence.readback,evidence.command,evidence.originalReadback),decoded=missingIntentArchiveSchema.safeParse(JSON.parse(archiveValue));if(!pair||!decoded.success)return false;
 const entry=decoded.data,digest=await missingIntentRawSha(originalRaw);
 if(evidence.originalRaw!==originalRaw||evidence.archiveKey!==archiveKey||evidence.archiveValue!==archiveValue||evidence.isCurrent!==isCurrent||JSON.stringify(evidence.command)!==commandRaw||JSON.stringify(evidence.readback)!==readbackRaw||JSON.stringify(evidence.originalReadback)!==originalReadbackRaw||digest!==entry.sha256||!isCurrent()||storage.getItem(pendingKey(account))!==evidence.originalRaw||storage.getItem(evidence.archiveKey)!==evidence.archiveValue)return false;
 const checked=correlateMissingIntentRestart(account,evidence.originalRaw,evidence.readback,evidence.command,evidence.originalReadback);if(!checked||JSON.stringify(checked)!==JSON.stringify(pair))return false;
 return JSON.stringify(pair.command)===JSON.stringify(evidence.command)&&entry.accountId===account&&entry.originalRaw===evidence.originalRaw&&entry.cartId===pair.cart.cartId&&entry.cartVersion===pair.cart.version&&entry.unknownCommandId===pair.cart.unknownCommandId&&evidence.archiveKey===missingIntentArchivePrefix(account)+entry.sha256&&storage.getItem(pendingKey(account))===evidence.originalRaw&&storage.getItem(evidence.archiveKey)===evidence.archiveValue;
}

/** QA-only explicit transition. Native must atomically fence the nested original
 * command; this local record never proves that any past effect was absent. */
export async function persistMissingIntentMemberRestart(account:string,storage:MissingIntentStore,evidence:MissingIntentRestart):Promise<PendingMemberCommerce>{
 const {originalRaw,archiveKey,archiveValue,isCurrent}=evidence;
 const command=memberCommerceCommandSchema.parse(evidence.command),commandRaw=JSON.stringify(command),readbackRaw=JSON.stringify(evidence.readback),originalReadbackRaw=JSON.stringify(evidence.originalReadback);
 if(!await validateMissingIntentMemberRestart(account,storage,evidence))throw Error("COMMERCE_PENDING_RECONCILIATION_REQUIRED");
 if(evidence.originalRaw!==originalRaw||evidence.archiveKey!==archiveKey||evidence.archiveValue!==archiveValue||evidence.isCurrent!==isCurrent||JSON.stringify(evidence.command)!==commandRaw||JSON.stringify(evidence.readback)!==readbackRaw||JSON.stringify(evidence.originalReadback)!==originalReadbackRaw)throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
 const pair=correlateMissingIntentRestart(account,originalRaw,evidence.readback,command,evidence.originalReadback);if(!pair)throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
 const serialized=JSON.stringify({schema:"crays.member.commerce.pending.v1",accountId:account,command,commandId:null,priorCommand:pair.original});
 const next=decodePendingMemberCommerce(account,serialized);
 if(!isCurrent()||storage.getItem(pendingKey(account))!==originalRaw||storage.getItem(archiveKey)!==archiveValue)throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
 storage.setItem(pendingKey(account),serialized);
 if(storage.getItem(pendingKey(account))!==serialized)throw Error("COMMERCE_PENDING_NOT_RETAINED");
 return next;
}


// Per-intent immutable history. Local records never authorize a mutation or
// block a fresh explicit user action: the original Core owns that decision.
const contextPendingSchema=z.object({schema:z.literal("crays.member.commerce.context-pending.v1"),intent:pendingSchema,cartContextToken:z.string().min(1).max(2500)}).strict();
export type ContextPendingMemberCommerce=z.output<typeof contextPendingSchema>;
const contextPrefix=(account:string)=>{key(account);return `crays.member.commerce.context-history.v1:${account}:`;};
const doneKey=(account:string,idempotencyKey:string)=>`crays.member.commerce.context-done.v1:${account}:${idempotencyKey}`;
function readContextIntent(account:string,storage:Pick<Storage,"getItem">,idempotencyKey:string){
 const raw=storage.getItem(contextPrefix(account)+idempotencyKey);if(raw===null)return null;if(raw.length>16000)throw Error("COMMERCE_PENDING_REVIEW_REQUIRED");
 const parsed=contextPendingSchema.parse(JSON.parse(raw));if(parsed.intent.accountId!==account||parsed.intent.command.idempotencyKey!==idempotencyKey)throw Error("COMMERCE_PENDING_ACCOUNT_INVALID");return {raw,parsed};
}
export function restoreContextPending(account:string,storage:Pick<Storage,"getItem"|"key"|"length">,includeChecked=false):ContextPendingMemberCommerce|null{
 const prefix=contextPrefix(account),names:string[]=[],length=storage.length;if(!Number.isInteger(length)||length<0||length>4096)throw Error("COMMERCE_HISTORY_REVIEW_REQUIRED");
 for(let n=0;n<length;n++){const k=storage.key(n);if(k?.startsWith(prefix))names.push(k.slice(prefix.length));}
 for(const id of names.sort().reverse()){
  const item=readContextIntent(account,storage,id);if(item===null)continue;const done=storage.getItem(doneKey(account,id));
  if(done!==null&&done!==item.raw)throw Error("COMMERCE_REFERENCE_ARCHIVE_CONFLICT");if(includeChecked||done===null)return item.parsed;
 }
 return null;
}
export function saveContextPending(account:string,storage:Store,command:MemberCommerceCommand,cartContextToken:string){
 const next=contextPendingSchema.parse({schema:"crays.member.commerce.context-pending.v1",intent:{schema:"crays.member.commerce.pending.v1",accountId:account,command,commandId:null},cartContextToken});
 const name=contextPrefix(account)+next.intent.command.idempotencyKey,raw=JSON.stringify(next);
 if(storage.getItem(name)!==null||storage.getItem(doneKey(account,next.intent.command.idempotencyKey))!==null)throw Error("COMMERCE_DUPLICATE_INTENT_DENIED");
 storage.setItem(name,raw);if(storage.getItem(name)!==raw)throw Error("COMMERCE_PENDING_NOT_RETAINED");return next;
}
/** Marks only this exact intent checked. Both intent and all v1 raw remain. */
export function clearContextPending(account:string,storage:Store,idempotencyKey:string,expected?:ContextPendingMemberCommerce){
 const item=readContextIntent(account,storage,idempotencyKey);if(item===null||expected&&JSON.stringify(expected)!==item.raw)throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
 const name=doneKey(account,idempotencyKey),old=storage.getItem(name);if(old!==null&&old!==item.raw)throw Error("COMMERCE_REFERENCE_ARCHIVE_CONFLICT");
 storage.setItem(name,item.raw);if(storage.getItem(name)!==item.raw||readContextIntent(account,storage,idempotencyKey)?.raw!==item.raw)throw Error("COMMERCE_PENDING_NOT_RETAINED");
}
export async function withMemberCartLock<T>(account:string,operation:()=>Promise<T>):Promise<T>{
 key(account);if(typeof navigator==="undefined"||!navigator.locks?.request)throw Error("COMMERCE_BROWSER_LOCK_REQUIRED");
 return navigator.locks.request(`crays.member.commerce.context.v1:${account}`,{mode:"exclusive"},operation);
}

export function assertContextIntent(account:string,storage:Pick<Storage,"getItem">,expected:ContextPendingMemberCommerce){
 if(readContextIntent(account,storage,expected.intent.command.idempotencyKey)?.raw!==JSON.stringify(expected))throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
}
export function retainContextReceipt(account:string,storage:Store,expected:ContextPendingMemberCommerce,receipt:NonNullable<import("./member-demo-commerce-client").MemberDemoCommerce["commandReceipt"]>){
 assertContextIntent(account,storage,expected);
 const parsed=commerceReadSchema.shape.commandReceipt.unwrap().parse(receipt),command=expected.intent.command;
 if(parsed.idempotencyKey!==command.idempotencyKey||parsed.action!==command.action||parsed.expectedVersion!==command.expectedVersion||command.action==="checkout"&&parsed.expectedTotalMinor!==command.expectedTotalMinor)throw Error("COMMERCE_RECEIPT_REFERENCE_CHANGED");
 const name=`crays.member.commerce.context-receipt.v1:${account}:${command.idempotencyKey}:${parsed.commandId}:${parsed.state}`,raw=JSON.stringify({schema:"crays.member.commerce.context-receipt.v1",accountId:account,originalRaw:JSON.stringify(expected),receipt:parsed}),prior=storage.getItem(name);
 if(prior!==null&&prior!==raw)throw Error("COMMERCE_RECEIPT_ARCHIVE_CONFLICT");storage.setItem(name,raw);
 if(storage.getItem(name)!==raw)throw Error("COMMERCE_RECEIPT_NOT_RETAINED");assertContextIntent(account,storage,expected);
}
