"use client";
import {publicFullApplicationSchema,publicFullContextSchema,publicFullApplicationJournalSchema,publicFullApplicationReplySchema,
 PUBLIC_FULL_APPLICATION_CONSENT_VERSION,PUBLIC_FULL_APPLICATION_ENDPOINTS,PUBLIC_FULL_APPLICATION_PURPOSE,
 type OriginalPublicFullFormValues,type PublicFullApplicationContext,type PublicFullApplicationJournal,type PublicFullApplicationReply} from "./public-full-ambassador-application-contract";
export type PublicFullApplicationAttempt=Readonly<{idempotencyKey:string;requestBody:string;requestSha256:string;requiresRecoveryFirst:boolean;journal:PublicFullApplicationJournal}>;
async function sha(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,"0")).join("")}
function randomContext(){const b=new Uint8Array(32);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("")}
/** Keep PII in this memory-only attempt. Persist/read back only journal metadata
 * before first dispatch. A storage failure must block a reload-safe send, never
 * silently replace an ambiguous attempt or generate another UUID after reload. */
export async function createPublicFullApplicationAttempt(input:{applicant:OriginalPublicFullFormValues;
 context:Omit<PublicFullApplicationContext,"opaqueReferralContext">;priorJournal?:PublicFullApplicationJournal}):Promise<PublicFullApplicationAttempt>{
 const prior=input.priorJournal?publicFullApplicationJournalSchema.parse(input.priorJournal):null;
 const context=publicFullContextSchema.parse({...input.context,opaqueReferralContext:prior?.opaqueReferralContext??randomContext()});
 const dto=publicFullApplicationSchema.parse({schema:"crays.clubs.public-full-ambassador-application.v1",purpose:PUBLIC_FULL_APPLICATION_PURPOSE,
 type:"submit_application",applicant:input.applicant,context,consentStatementVersion:PUBLIC_FULL_APPLICATION_CONSENT_VERSION});
 const requestBody=JSON.stringify(dto),requestSha256=await sha(requestBody);
 if(prior&&(prior.requestSha256!==requestSha256||prior.locale!==context.locale||prior.ambassadorSlug!==context.ambassadorSlug||prior.canonicalPersonalPath!==context.canonicalPersonalPath||prior.entryPath!==context.entryPath))throw Error("ORIGINAL_APPLICATION_REENTRY_MISMATCH");
 const idempotencyKey=prior?.idempotencyKey??"cclub:application:"+crypto.randomUUID();
 const journal=publicFullApplicationJournalSchema.parse({schema:"crays.clubs.public-full-application-journal.v1",idempotencyKey,requestSha256,...context,
 consentStatementVersion:PUBLIC_FULL_APPLICATION_CONSENT_VERSION,state:prior?.state??"pending",createdAt:prior?.createdAt??new Date().toISOString()});
 return Object.freeze({idempotencyKey,requestBody,requestSha256,requiresRecoveryFirst:prior!==null,journal});
}
function matchedReply(value:unknown,journal:PublicFullApplicationJournal):PublicFullApplicationReply{
 const r=publicFullApplicationReplySchema.parse(value);if(r.status!=="unknown"){
  const b=r.binding;if(b.idempotencyKey!==journal.idempotencyKey||b.requestSha256!==journal.requestSha256||b.locale!==journal.locale||b.ambassadorSlug!==journal.ambassadorSlug||b.canonicalPersonalPath!==journal.canonicalPersonalPath)throw Error("APPLICATION_RECEIPT_BINDING_MISMATCH");
 }return r;
}
const observedRecoveries=new WeakMap<PublicFullApplicationReply,string>();
async function observedRecovery(reply:PublicFullApplicationReply,journal:PublicFullApplicationJournal){observedRecoveries.set(reply,await sha(JSON.stringify(journal)));return reply;}
const unknown=():PublicFullApplicationReply=>({status:"unknown",retryMode:"retain_original_idempotency_key"});
/** No automatic POST retry. Recovery is read-only on the same existing ledger;
 * unknown never means not_found or permits resetting a pending journal.
 * After an actual recovery lookup, manual reentry may retry the identical original key/body
 * on pending or unknown; the server must atomically reconcile the same durable command. */
export async function recoverPublicFullApplication(journalValue:PublicFullApplicationJournal):Promise<PublicFullApplicationReply>{
 const journal=publicFullApplicationJournalSchema.parse(journalValue);
 try{const r=await fetch(PUBLIC_FULL_APPLICATION_ENDPOINTS.recovery,{method:"POST",cache:"no-store",credentials:"same-origin",
 headers:{"Content-Type":"application/json","Idempotency-Key":journal.idempotencyKey},body:JSON.stringify({requestSha256:journal.requestSha256,
 locale:journal.locale,ambassadorSlug:journal.ambassadorSlug,canonicalPersonalPath:journal.canonicalPersonalPath,consentStatementVersion:journal.consentStatementVersion})});
 if(r.status!==200)return observedRecovery(unknown(),journal);return observedRecovery(matchedReply(await r.json(),journal),journal);
 }catch{return observedRecovery(unknown(),journal);}
}
export async function submitPublicFullApplication(attempt:PublicFullApplicationAttempt,journalReadBack:PublicFullApplicationJournal,recoveryObservation?:PublicFullApplicationReply):Promise<PublicFullApplicationReply>{
 const journal=publicFullApplicationJournalSchema.parse(journalReadBack);
 if(attempt.requiresRecoveryFirst&&(!recoveryObservation||observedRecoveries.get(recoveryObservation)!==await sha(JSON.stringify(journal))||matchedReply(recoveryObservation,journal).status==="persisted"))throw Error("APPLICATION_RECOVERY_REQUIRED");
 publicFullApplicationSchema.parse(JSON.parse(attempt.requestBody));
 if(attempt.idempotencyKey!==journal.idempotencyKey||attempt.requestSha256!==journal.requestSha256||JSON.stringify(journal)!==JSON.stringify(attempt.journal)||await sha(attempt.requestBody)!==attempt.requestSha256)throw Error("APPLICATION_JOURNAL_READBACK_REQUIRED");
 try{const r=await fetch(PUBLIC_FULL_APPLICATION_ENDPOINTS.submit,{method:"POST",cache:"no-store",credentials:"same-origin",
 headers:{"Content-Type":"application/json","Idempotency-Key":attempt.idempotencyKey},body:attempt.requestBody});
 if(r.status!==200&&r.status!==202)return unknown();return matchedReply(await r.json(),journal);
 }catch{return unknown();}
}
