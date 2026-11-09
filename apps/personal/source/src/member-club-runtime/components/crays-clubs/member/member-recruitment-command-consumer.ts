import {createAmbassadorRecruitmentDraftSchema,type AmbassadorRecruitmentDraft} from "../../../lib/clubs/ambassador-recruitment-draft-contract";
import type {RecruitmentAttemptReference,RecruitmentBrowserCommands,RecruitmentBrowserPolicy,RecruitmentBrowserResult} from "../../../lib/clubs/ambassador-recruitment-native-port-contract";

export type RecruitmentAttemptStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">;
/** The composition must use the browser's cross-tab WebLock for this exact key.
 * No in-memory fallback can admit a mounted native command consumer. */
export type RecruitmentAttemptExclusive=<T>(key:string,work:()=>Promise<T>)=>Promise<T>;
const nonempty=(v:unknown):v is string=>typeof v==="string"&&v.trim().length>0;
function canonical(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>`${JSON.stringify(key)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value)??"undefined";
}
function sameRef(a:RecruitmentAttemptReference,b:RecruitmentAttemptReference){return a.idempotencyKey===b.idempotencyKey&&a.originalAttemptRef===b.originalAttemptRef;}
function parseReference(raw:unknown):RecruitmentAttemptReference {
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("RECRUITMENT_JOURNAL_INVALID");
  const r=raw as Record<string,unknown>;
  if(Object.keys(r).some(k=>!["idempotencyKey","originalAttemptRef"].includes(k))||!nonempty(r.idempotencyKey)||r.originalAttemptRef!==undefined&&!nonempty(r.originalAttemptRef))throw new Error("RECRUITMENT_JOURNAL_INVALID");
  return {idempotencyKey:r.idempotencyKey,...(r.originalAttemptRef===undefined?{}:{originalAttemptRef:r.originalAttemptRef})};
}

/** This is a client command consumer of the canonical owner contract, not an
 * actor resolver or a substitute onboarding engine. Policy/authority are native. */
export function createMemberRecruitmentCommandConsumer(input:{commands:RecruitmentBrowserCommands;policy:RecruitmentBrowserPolicy;storage:RecruitmentAttemptStorage;exclusive:RecruitmentAttemptExclusive;newKey:()=>string}) {
  const policy=structuredClone(input.policy);
  if(!nonempty(policy.policyOriginalId)||!nonempty(policy.privacyNoticeOriginalRef)||!nonempty(policy.journalBinding.opaqueNamespace)||![policy.policyVersion,policy.privacyNoticeVersion,policy.journalBinding.generation].every(v=>Number.isSafeInteger(v)&&v>0))throw new Error("RECRUITMENT_NATIVE_POLICY_UNAVAILABLE");
  const schema=createAmbassadorRecruitmentDraftSchema(policy.input);
  const storageKey=`crays.member.recruitment.v1:${encodeURIComponent(policy.journalBinding.opaqueNamespace)}:${policy.journalBinding.generation}`;
  function read(){const raw=input.storage.getItem(storageKey);return raw===null?null:parseReference(JSON.parse(raw));}
  function write(ref:RecruitmentAttemptReference,expected:RecruitmentAttemptReference|null){
    const previous=read();if(expected?(!previous||!sameRef(previous,expected)):previous!==null)throw new Error("RECRUITMENT_JOURNAL_CHANGED");
    input.storage.setItem(storageKey,JSON.stringify(parseReference(ref)));
    const stored=read();if(!stored||!sameRef(stored,ref))throw new Error("RECRUITMENT_JOURNAL_NOT_DURABLE");
  }
  async function currentPolicy(){const current=await input.commands.readPolicy();if(canonical(current)!==canonical(policy))throw new Error("RECRUITMENT_POLICY_OR_BINDING_CHANGED");}
  function accept(result:RecruitmentBrowserResult,ref:RecruitmentAttemptReference):RecruitmentBrowserResult {
    const next=parseReference(result.ref);
    if(next.idempotencyKey!==ref.idempotencyKey||ref.originalAttemptRef!==undefined&&next.originalAttemptRef!==ref.originalAttemptRef)throw new Error("RECRUITMENT_RESPONSE_REFERENCE_CONFLICT");
    if(result.status==="prepared"&&!next.originalAttemptRef||result.status==="received"&&(!next.originalAttemptRef||!nonempty(result.applicationOriginalRef)||!Number.isSafeInteger(result.revision)||result.revision<1||result.ambassadorAdmitted!==false||result.memberAccessGranted!==false||result.paymentAuthorityGranted!==false)||result.status==="not_committed"&&(!nonempty(result.originalFenceRef)||!/^[a-f0-9]{64}$/.test(result.originalFenceSha256)))throw new Error("RECRUITMENT_RESPONSE_UNCONFIRMED");
    if(!["prepared","received","unknown_commit","not_committed"].includes(result.status))throw new Error("RECRUITMENT_RESPONSE_UNCONFIRMED");
    write(next,ref);
    // Do not forward extra actor fields or private server draft data into UI state.
    if(result.status==="received")return {status:"received",ref:next,applicationOriginalRef:result.applicationOriginalRef,revision:result.revision,ambassadorAdmitted:false,memberAccessGranted:false,paymentAuthorityGranted:false};
    if(result.status==="not_committed")return {status:"not_committed",ref:next,originalFenceRef:result.originalFenceRef,originalFenceSha256:result.originalFenceSha256};
    return {status:result.status,ref:next};
  }
  async function executePrepared(result:RecruitmentBrowserResult){
    if(result.status!=="prepared")return result;
    const ref=result.ref;
    if(!ref.originalAttemptRef)throw new Error("RECRUITMENT_ATTEMPT_REFERENCE_REQUIRED");
    await currentPolicy();
    return accept(await input.commands.execute({...ref,originalAttemptRef:ref.originalAttemptRef,journalBinding:policy.journalBinding}),ref);
  }
  async function recover(ref:RecruitmentAttemptReference){await currentPolicy();return executePrepared(accept(await input.commands.reconcile({...ref,journalBinding:policy.journalBinding}),ref));}
  return {
    storageKey,
    async resume(){return input.exclusive(storageKey,async()=>{const ref=read();return ref?recover(ref):null;});},
    async resetFencedAttempt(){return input.exclusive(storageKey,async()=>{
      const ref=read();if(!ref)return false;
      await currentPolicy();
      const result=accept(await input.commands.reconcile({...ref,journalBinding:policy.journalBinding}),ref);
      if(result.status!=="not_committed")return false;
      const stored=read();if(!stored||!sameRef(stored,result.ref))throw new Error("RECRUITMENT_JOURNAL_CHANGED");
      input.storage.removeItem(storageKey);
      if(read()!==null)throw new Error("RECRUITMENT_JOURNAL_NOT_DURABLE");
      return true;
    });},
    async start(draft:AmbassadorRecruitmentDraft){return input.exclusive(storageKey,async()=>{
      const pending=read();if(pending)return recover(pending);
      await currentPolicy();const parsed=schema.parse(draft);const ref=parseReference({idempotencyKey:input.newKey()});
      // Durable original key precedes the first server dispatch. Draft PII stays
      // in memory and the server's original private attempt, never this journal.
      write(ref,null);
      const prepared=accept(await input.commands.prepare({draft:parsed,idempotencyKey:ref.idempotencyKey,policyOriginalId:policy.policyOriginalId,policyVersion:policy.policyVersion,privacyNoticeOriginalRef:policy.privacyNoticeOriginalRef,privacyNoticeVersion:policy.privacyNoticeVersion,journalBinding:policy.journalBinding}),ref);
      return executePrepared(prepared);
    });},
  };
}

export const recruitmentBrowserWebLock:RecruitmentAttemptExclusive=async(key,work)=>{
  if(typeof navigator==="undefined"||!navigator.locks)throw new Error("RECRUITMENT_CROSS_TAB_LOCK_UNAVAILABLE");
  return navigator.locks.request(key,{mode:"exclusive"},work);
};
