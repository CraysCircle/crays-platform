import "server-only";
import {createHash,randomUUID} from "node:crypto";
import type {PoolClient} from "pg";
import {getCorePgPool} from "./client";
import {resolveNativePersonalOwnerInTransaction,type NativePersonalPrincipal} from "./personal-messenger-adapter";

/** Source-only owning commands. No endpoint, automatic grants or worker launch.
 * Host supplies verified NativePersonalPrincipal, original Core runtime attempt
 * and custody attestations. A model may propose a plan; only the separate
 * authenticated owner confirmation admits that EXACT plan. Neither a callback,
 * arbitrary scope string, SQLite row nor successful process exit grants it.
 */
const fail=(code:string)=>new Error("PERSONAL_FEED_"+code);
const sha=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
const uuid=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const version=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=1&&Number(v)<Number.MAX_SAFE_INTEGER;
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=="object"||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))throw fail("INVALID_INPUT");return v as Record<string,unknown>;}
function keys(v:Record<string,unknown>,allowed:string[],required:string[]=allowed){if(Object.keys(v).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(v,k)))throw fail("INVALID_FIELDS");}
function text(v:unknown,max=256):string{if(typeof v!=="string"||!v.length||v.trim()!==v||Buffer.byteLength(v)>max||/[\x00-\x1f\x7f]/.test(v))throw fail("INVALID_TEXT");return v;}
function url(v:unknown):string{const raw=text(v,2048),u=new URL(raw);if(u.protocol!=="https:"||u.username||u.password||u.hash)throw fail("INVALID_URL");return u.href;}
function bool(v:unknown):boolean{if(typeof v!=="boolean")throw fail("INVALID_BOOLEAN");return v;}
function digest(v:unknown):string{if(!sha(v))throw fail("INVALID_DIGEST");return v;}
function id(v:unknown):string{if(!uuid(v))throw fail("INVALID_ID");return v;}
export type PersonalFeedPlan=Readonly<{
 schema:"crays.personal-feed-plan.v1"; operation:string; arguments:Readonly<Record<string,unknown>>;
 changesState:boolean; destructive:boolean;
 // Explicit finite host-discovered original source URLs + observed feature-state
 // snapshot. A URL allowlist is NOT itself network/SSRF permission.
 disclosure:Readonly<{purpose:"own-feed-refresh";sourceStateSHA256:string;urls:readonly string[]}>|null;
}>;
/** Same eight original functional families. Help/version need no feature grant.
 * No shell, database path, arbitrary argv or credential fields. Stable normalized
 * field order freezes the exact proposal before any awaited Core work.
 */
export function capturePersonalFeedPlan(value:unknown):PersonalFeedPlan{
 const raw=object(value);keys(raw,["operation","arguments","disclosure"],["operation","arguments"]);
 const op=text(raw.operation,16),a=object(raw.arguments),out:Record<string,unknown>={};
 const optionalText=(k:string,n=256)=>{if(a[k]!==undefined)out[k]=text(a[k],n);};
 switch(op){
 case "blogs":keys(a,[]);break;
 case "add":keys(a,["name","url","feedUrl","scrapeSelector","userAgent"],["name","url"]);out.name=text(a.name);out.url=url(a.url);if(a.feedUrl!==undefined)out.feedUrl=url(a.feedUrl);optionalText("scrapeSelector",512);optionalText("userAgent",512);break;
 case "remove":keys(a,["name"]);out.name=text(a.name);break;
 case "read":case "unread":keys(a,["articleId"]);if(typeof a.articleId!=="string"||!/^[1-9][0-9]{0,18}$/.test(a.articleId)||BigInt(a.articleId)>BigInt("9223372036854775807"))throw fail("INVALID_ARTICLE_ID");out.articleId=a.articleId;break;
 case "read-all":keys(a,["name"],[]);optionalText("name");break;
 case "scan":keys(a,["name","storeDescriptions","storeKeywords","descriptionMaxChars"],[]);optionalText("name");out.storeDescriptions=a.storeDescriptions===undefined?false:bool(a.storeDescriptions);out.storeKeywords=a.storeKeywords===undefined?false:bool(a.storeKeywords);if(a.descriptionMaxChars!==undefined){if(out.storeDescriptions!==true||!Number.isSafeInteger(a.descriptionMaxChars)||Number(a.descriptionMaxChars)<1||Number(a.descriptionMaxChars)>10000)throw fail("INVALID_DESCRIPTION_LIMIT");out.descriptionMaxChars=a.descriptionMaxChars;}break;
 case "articles":keys(a,["name","all","showDescriptions","showKeywords"],[]);optionalText("name");for(const k of ["all","showDescriptions","showKeywords"])out[k]=a[k]===undefined?false:bool(a[k]);break;
 default:throw fail("UNKNOWN_OPERATION");
 }
 let disclosure:PersonalFeedPlan["disclosure"]=null;
 if(op==="scan"){
  const d=object(raw.disclosure);keys(d,["purpose","sourceStateSHA256","urls"]);
  if(d.purpose!=="own-feed-refresh"||!Array.isArray(d.urls)||!d.urls.length||d.urls.length>40)throw fail("DISCLOSURE_REQUIRED");
  const urls=d.urls.map(url).sort();if(new Set(urls).size!==urls.length)throw fail("DUPLICATE_DISCLOSURE");
  disclosure=Object.freeze({purpose:"own-feed-refresh",sourceStateSHA256:digest(d.sourceStateSHA256),urls:Object.freeze(urls)});
 }else if(raw.disclosure!==undefined&&raw.disclosure!==null)throw fail("UNEXPECTED_DISCLOSURE");
 return Object.freeze({schema:"crays.personal-feed-plan.v1",operation:op,arguments:Object.freeze(out),changesState:!["blogs","articles"].includes(op),destructive:["remove","read-all"].includes(op),disclosure});
}

type StateRow={state_id:string;account_id:string;canonical_person_id:string;agent_id:string;engine_sha256:string;initial_state_sha256:string;worker_binding_sha256:string};
type IntentRow={intent_id:string;runtime_attempt_id:string;state_id:string;expected_version:string;expected_state_sha256:string;plan:PersonalFeedPlan;plan_sha256:string;expired:boolean};
export type FeedWorkerBinding=Readonly<{runtimeAttemptId:string;workerBindingSHA256:string}>;
export type FeedClaim=Readonly<{attemptId:string;intentId:string;stateId:string;expectedVersion:number;expectedStateSHA256:string;canonicalPersonId:string;agentId:string;runtimeAttemptId:string;sdkRunId:string;runtimeBindingSHA256:string;engineSHA256:string;workerBindingSHA256:string;plan:PersonalFeedPlan;planSHA256:string;freshlyCreated:boolean;receiptState:string}>;
export type FeedOutcomeKind="unknown"|"succeeded"|"failed_no_effect"|"reconciled_succeeded"|"reconciled_no_effect";
function createOwnPersonalFeedCommands(principal:NativePersonalPrincipal){
 async function transaction<T>(work:(c:PoolClient,who:Awaited<ReturnType<typeof resolveNativePersonalOwnerInTransaction>>)=>Promise<T>):Promise<T>{
  principal.assertCurrent();const c=await getCorePgPool().connect();let active=false,committing=false,discard=false;
  try{
   const r=await c.query<{rolsuper:boolean;rolbypassrls:boolean}>("select rolsuper,rolbypassrls from pg_roles where rolname=current_user");
   if(!r.rows[0]||r.rows[0].rolsuper||r.rows[0].rolbypassrls)throw fail("NON_BYPASS_CORE_REQUIRED");
   await c.query("begin");active=true;await c.query("set local lock_timeout='1500ms';set local statement_timeout='5000ms'");
   await c.query("select set_config('crays.native_personal_provider_key',$1,true),set_config('crays.native_personal_provider_subject',$2,true)",[principal.providerKey,principal.providerSubject]);
   const mapped=await c.query("select account_id from crays_core.auth_identities where provider_key=$1 and provider_subject=$2 and verified and account_id=$3 limit 2",[principal.providerKey,principal.providerSubject,principal.accountId]);
   if(mapped.rows.length!==1)throw fail("CURRENT_OWNER_REQUIRED");
   await c.query("select set_config('crays.native_personal_account',$1,true),set_config('crays.personal_feed_producer','typed-feed-v1',true)",[principal.accountId]);
   const who=await resolveNativePersonalOwnerInTransaction(c,principal);principal.assertCurrent();
   const result=await work(c,who);principal.assertCurrent();committing=true;await c.query("commit");active=false;principal.assertCurrent();return result;
  }catch(e){if(active)await c.query("rollback").catch(()=>{discard=true;});if(committing)throw fail("OUTCOME_UNKNOWN_RECONCILE_SAME_COMMAND");throw e;}
  finally{c.release(discard||(active&&committing));}
 }
 async function invocation(c:PoolClient,attemptId:string,agentId:string){
  text(attemptId,128);await c.query("select crays_core.assert_native_personal_runtime_attempt_current($1,$2)",[attemptId,principal.accountId]);
  const r=await c.query("select agent_id,runtime_binding_sha256,sdk_run_id from crays_core.personal_messenger_runtime_attempts where attempt_id=$1 and account_id=$2",[attemptId,principal.accountId]);
  if(r.rows.length!==1||r.rows[0].agent_id!==agentId)throw fail("CURRENT_INVOCATION_REQUIRED");return r.rows[0];
 }
 async function state(c:PoolClient,stateId:string,who:Awaited<ReturnType<typeof resolveNativePersonalOwnerInTransaction>>){
  // Serializes head checks/claims/results without holding transactions over CLI IO.
  await c.query("select pg_advisory_xact_lock(hashtextextended($1,0))",["personal-feed:"+principal.accountId+":"+stateId]);
  const r=await c.query<StateRow>("select * from crays_core.personal_feed_states where state_id=$1 and account_id=$2",[stateId,principal.accountId]);const s=r.rows[0];
  if(r.rows.length!==1||s.agent_id!==who.agent_id||s.canonical_person_id!==who.canonical_person_id)throw fail("OWN_STATE_REQUIRED");
  if((await c.query("select 1 from crays_core.personal_feed_revocations where state_id=$1",[stateId])).rows.length)throw fail("STATE_REVOKED");
  const h=await c.query<{state_version:string;state_sha256:string}>(`select o.state_version::text,o.state_sha256 from crays_core.personal_feed_outcomes o
   join crays_core.personal_feed_attempts a on a.attempt_id=o.attempt_id join crays_core.personal_feed_intents i on i.intent_id=a.intent_id
   where i.state_id=$1 and o.kind in ('succeeded','reconciled_succeeded') order by o.ordinal desc limit 1`,[stateId]);
  return {...s,version:h.rows.length?Number(h.rows[0].state_version):1,sha256:h.rows[0]?.state_sha256??s.initial_state_sha256};
 }
 async function intent(c:PoolClient,intentId:string){const r=await c.query<IntentRow>("select *,expected_version::text,expires_at<=clock_timestamp() expired from crays_core.personal_feed_intents where intent_id=$1 and account_id=$2",[intentId,principal.accountId]);if(r.rows.length!==1)throw fail("OWN_INTENT_REQUIRED");const row=r.rows[0];
  const normalized=capturePersonalFeedPlan({operation:row.plan.operation,arguments:row.plan.arguments,disclosure:row.plan.disclosure});
  if(hash(JSON.stringify(normalized))!==row.plan_sha256)throw fail("STORED_PLAN_CHANGED");row.plan=normalized;return row;}
 async function latest(c:PoolClient,attemptId:string){return (await c.query<{kind:FeedOutcomeKind;receipt_id:string;state_version:string;state_sha256:string;evidence_sha256:string}>("select * from crays_core.personal_feed_outcomes where attempt_id=$1 order by ordinal desc limit 1",[attemptId])).rows[0];}
 async function currentIntent(c:PoolClient,intentId:string,who:Awaited<ReturnType<typeof resolveNativePersonalOwnerInTransaction>>){const i=await intent(c,intentId),s=await state(c,i.state_id,who);const runtime=await invocation(c,i.runtime_attempt_id,who.agent_id);return {i,s,runtime};}
 return Object.freeze({
  /** Host custody command, never a model tool. Proof hashes bind immutable engine,
   * private state and complete loss-aware continuity review; they are evidence,
   * not self-authenticating grants. The admitted host must actually verify them.
   * No path or legacy overwrite is accepted. No migration is performed here. */
  async registerState(input:Readonly<{stateId:string;runtimeAttemptId:string;engineSHA256:string;initialStateSHA256:string;workerBindingSHA256:string;continuity:Readonly<{sourceSnapshotSHA256:string;planSHA256:string;preservedArchiveSHA256:string;compatible:true}>}>){
   const x=object(input);keys(x,["stateId","runtimeAttemptId","engineSHA256","initialStateSHA256","workerBindingSHA256","continuity"]);
   const stateId=id(x.stateId),runtime=text(x.runtimeAttemptId,128),engine=digest(x.engineSHA256),initial=digest(x.initialStateSHA256),worker=digest(x.workerBindingSHA256);
   const cont=object(x.continuity);keys(cont,["sourceSnapshotSHA256","planSHA256","preservedArchiveSHA256","compatible"]);if(cont.compatible!==true)throw fail("CONTINUITY_RECONCILIATION_REQUIRED");
   const continuity=hash(JSON.stringify([digest(cont.sourceSnapshotSHA256),digest(cont.planSHA256),digest(cont.preservedArchiveSHA256)]));
   return transaction(async(c,who)=>{await invocation(c,runtime,who.agent_id);await c.query("select pg_advisory_xact_lock(hashtextextended($1,0))",["personal-feed:"+principal.accountId+":"+stateId]);
    const prior=await c.query("select * from crays_core.personal_feed_states where state_id=$1",[stateId]);
    if(prior.rows.length){const p=prior.rows[0];if(p.account_id!==who.account_id||p.canonical_person_id!==who.canonical_person_id||p.agent_id!==who.agent_id||p.runtime_attempt_id!==runtime||p.engine_sha256!==engine||p.initial_state_sha256!==initial||p.worker_binding_sha256!==worker||p.continuity_sha256!==continuity)throw fail("STATE_IDEMPOTENCY_CONFLICT");}
    else await c.query(`insert into crays_core.personal_feed_states(state_id,account_id,canonical_person_id,agent_id,runtime_attempt_id,engine_sha256,initial_state_sha256,continuity_sha256,worker_binding_sha256) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[stateId,who.account_id,who.canonical_person_id,who.agent_id,runtime,engine,initial,continuity,worker]);
    return Object.freeze({stateId,version:1,stateSHA256:initial,registered:true});});
  },
  /** Stage only. No authority for the worker until owner confirmation+claim. */
  async propose(input:Readonly<{intentId:string;stateId:string;runtimeAttemptId:string;expectedVersion:number;expectedStateSHA256:string;plan:unknown}>){
   const x=object(input);keys(x,["intentId","stateId","runtimeAttemptId","expectedVersion","expectedStateSHA256","plan"]);
   const intentId=id(x.intentId),stateId=id(x.stateId),runtime=text(x.runtimeAttemptId,128),expectedSHA=digest(x.expectedStateSHA256),expected=x.expectedVersion;if(!version(expected))throw fail("INVALID_VERSION");
   const plan=capturePersonalFeedPlan(x.plan),planSHA=hash(JSON.stringify(plan));if(plan.disclosure&&plan.disclosure.sourceStateSHA256!==expectedSHA)throw fail("DISCLOSURE_STATE_CHANGED");
   return transaction(async(c,who)=>{const s=await state(c,stateId,who);await invocation(c,runtime,who.agent_id);
    const old=await c.query<IntentRow>("select *,expected_version::text from crays_core.personal_feed_intents where intent_id=$1",[intentId]);
    if(old.rows.length){const p=old.rows[0];if(p.state_id!==stateId||p.runtime_attempt_id!==runtime||Number(p.expected_version)!==expected||p.expected_state_sha256!==expectedSHA||p.plan_sha256!==planSHA)throw fail("INTENT_IDEMPOTENCY_CONFLICT");}
    else {if(s.version!==expected||s.sha256!==expectedSHA)throw fail("STATE_VERSION_CONFLICT");await c.query(`insert into crays_core.personal_feed_intents(intent_id,account_id,state_id,runtime_attempt_id,expected_version,expected_state_sha256,operation,plan,plan_sha256) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,[intentId,who.account_id,stateId,runtime,expected,expectedSHA,plan.operation,JSON.stringify(plan),planSHA]);}
    return Object.freeze({intentId,plan,planSHA256:planSHA,authorityGranted:false});});
  },
  /** Authenticated explicit owner UI command only; never installed in model tools.
   * Requires exact presented plan digest, destructive choice and URL disclosure.
   * The HTTP/Auth0/UI admission is deliberately not invented by this source. */
  async confirm(input:Readonly<{intentId:string;planSHA256:string;destructiveConfirmed:boolean;disclosureConfirmed:boolean}>){
   const x=object(input);keys(x,["intentId","planSHA256","destructiveConfirmed","disclosureConfirmed"]);const intentId=id(x.intentId),planSHA=digest(x.planSHA256),destructive=bool(x.destructiveConfirmed),disclosure=bool(x.disclosureConfirmed);
   return transaction(async(c,who)=>{const {i,s}=await currentIntent(c,intentId,who);if(i.expired)throw fail("INTENT_EXPIRED");if(i.plan_sha256!==planSHA||s.version!==Number(i.expected_version)||s.sha256!==i.expected_state_sha256)throw fail("PRESENTED_PLAN_CHANGED");
    if(i.plan.destructive&&!destructive)throw fail("DESTRUCTIVE_CONFIRMATION_REQUIRED");if(i.plan.disclosure&&!disclosure)throw fail("DISCLOSURE_CONFIRMATION_REQUIRED");
    const prior=await c.query("select * from crays_core.personal_feed_confirmations where intent_id=$1",[intentId]);if(prior.rows.length){const p=prior.rows[0];if(p.plan_sha256!==planSHA||p.destructive_confirmed!==destructive||p.disclosure_confirmed!==disclosure)throw fail("CONFIRMATION_CONFLICT");return Object.freeze({receiptId:p.receipt_id,intentId});}
    const receiptId=randomUUID();await c.query("insert into crays_core.personal_feed_confirmations(intent_id,account_id,receipt_id,plan_sha256,destructive_confirmed,disclosure_confirmed) values($1,$2,$3,$4,$5,$6)",[intentId,who.account_id,receiptId,planSHA,destructive,disclosure]);return Object.freeze({receiptId,intentId});});
  },
  /** Commit before original CLI IO. freshlyCreated=false NEVER authorizes retry.
   * A crash after this claim is unknown until durable feature-state reconciliation. */
  async claim(intentIdValue:string,worker:FeedWorkerBinding):Promise<FeedClaim>{
   const intentId=id(intentIdValue),w=object(worker);keys(w,["runtimeAttemptId","workerBindingSHA256"]);const runtime=text(w.runtimeAttemptId,128),workerSHA=digest(w.workerBindingSHA256);
   return transaction(async(c,who)=>{const {i,s,runtime:run}=await currentIntent(c,intentId,who);if(i.runtime_attempt_id!==runtime||s.worker_binding_sha256!==workerSHA)throw fail("WORKER_BINDING_CHANGED");
    const old=await c.query("select attempt_id from crays_core.personal_feed_attempts where intent_id=$1",[intentId]);let attemptId=old.rows[0]?.attempt_id;const fresh=!attemptId;
    if(fresh){if(i.expired)throw fail("INTENT_EXPIRED");if(s.version!==Number(i.expected_version)||s.sha256!==i.expected_state_sha256)throw fail("STATE_VERSION_CONFLICT");
     const confirmed=await c.query("select 1 from crays_core.personal_feed_confirmations where intent_id=$1 and plan_sha256=$2",[intentId,i.plan_sha256]);if(confirmed.rows.length!==1)throw fail("OWNER_CONFIRMATION_REQUIRED");
     const busy=await c.query(`select 1 from crays_core.personal_feed_attempts a join crays_core.personal_feed_intents i on i.intent_id=a.intent_id
      left join lateral(select kind from crays_core.personal_feed_outcomes where attempt_id=a.attempt_id order by ordinal desc limit 1)o on true
      where i.state_id=$1 and (o.kind is null or o.kind='unknown') limit 1`,[s.state_id]);if(busy.rows.length)throw fail("STATE_RECONCILIATION_REQUIRED");
     attemptId=randomUUID();await c.query("insert into crays_core.personal_feed_attempts(attempt_id,intent_id,account_id,worker_binding_sha256) values($1,$2,$3,$4)",[attemptId,intentId,who.account_id,workerSHA]);}
    const observed=await latest(c,attemptId);return Object.freeze({attemptId,intentId,stateId:s.state_id,expectedVersion:Number(i.expected_version),expectedStateSHA256:i.expected_state_sha256,canonicalPersonId:s.canonical_person_id,agentId:s.agent_id,runtimeAttemptId:i.runtime_attempt_id,sdkRunId:run.sdk_run_id,runtimeBindingSHA256:run.runtime_binding_sha256,engineSHA256:s.engine_sha256,workerBindingSHA256:workerSHA,plan:Object.freeze(i.plan),planSHA256:i.plan_sha256,freshlyCreated:fresh,receiptState:observed?.kind??"unknown_pending_observation"});});
  },
  /** Trusted host verified semantic+snapshot evidence, never exit code/Chat ACK.
   * Unknown keeps expected snapshot as the last KNOWN state, not actual outcome.
   * Reconciliation is a distinct append-only receipt, no automatic re-execution. */
  async recordOutcome(input:Readonly<{attemptId:string;eventKey:string;kind:FeedOutcomeKind;stateVersion:number;stateSHA256:string;evidenceSHA256:string}>,worker:FeedWorkerBinding){
   const x=object(input);keys(x,["attemptId","eventKey","kind","stateVersion","stateSHA256","evidenceSHA256"]);const attemptId=id(x.attemptId),eventKey=id(x.eventKey),kind=x.kind;
   if(!["unknown","succeeded","failed_no_effect","reconciled_succeeded","reconciled_no_effect"].includes(String(kind)))throw fail("INVALID_OUTCOME");
   if(!version(x.stateVersion)&&x.stateVersion!==Number.MAX_SAFE_INTEGER)throw fail("INVALID_VERSION");const resultVersion=Number(x.stateVersion),resultSHA=digest(x.stateSHA256),evidence=digest(x.evidenceSHA256);
   const w=object(worker);keys(w,["runtimeAttemptId","workerBindingSHA256"]);const runtime=text(w.runtimeAttemptId,128),workerSHA=digest(w.workerBindingSHA256);
   return transaction(async(c,who)=>{const ar=await c.query("select * from crays_core.personal_feed_attempts where attempt_id=$1 and account_id=$2",[attemptId,who.account_id]);if(ar.rows.length!==1)throw fail("OWN_ATTEMPT_REQUIRED");const a=ar.rows[0];
    const {i,s}=await currentIntent(c,a.intent_id,who);if(i.runtime_attempt_id!==runtime||s.worker_binding_sha256!==workerSHA||a.worker_binding_sha256!==workerSHA)throw fail("WORKER_BINDING_CHANGED");
    const same=await c.query("select * from crays_core.personal_feed_outcomes where attempt_id=$1 and event_key=$2",[attemptId,eventKey]);if(same.rows.length){const p=same.rows[0];if(p.kind!==kind||Number(p.state_version)!==resultVersion||p.state_sha256!==resultSHA||p.evidence_sha256!==evidence)throw fail("OUTCOME_IDEMPOTENCY_CONFLICT");return Object.freeze({receiptId:p.receipt_id,kind:p.kind});}
    const previous=await latest(c,attemptId),reconciled=String(kind).startsWith("reconciled_");
    if(previous&&previous.kind!=="unknown")throw fail("TERMINAL_OUTCOME_IMMUTABLE");
    // A claimed attempt without a result may have crashed: direct reconciliation
    // is allowed without fabricating an earlier observed-unknown receipt.
    if(reconciled===false&&previous?.kind==="unknown"&&kind!=="unknown")throw fail("RECONCILIATION_RECEIPT_REQUIRED");
    const success=kind==="succeeded"||kind==="reconciled_succeeded",expected=Number(i.expected_version);
    if(resultVersion!==expected+(success&&i.plan.changesState?1:0))throw fail("OUTCOME_VERSION_CONFLICT");
    if(!success||!i.plan.changesState){if(resultSHA!==i.expected_state_sha256)throw fail("NO_EFFECT_SNAPSHOT_CHANGED");}
    const receiptId=randomUUID();await c.query(`insert into crays_core.personal_feed_outcomes(receipt_id,attempt_id,account_id,event_key,kind,state_version,state_sha256,evidence_sha256) values($1,$2,$3,$4,$5,$6,$7,$8)`,[receiptId,attemptId,who.account_id,eventKey,kind,resultVersion,resultSHA,evidence]);return Object.freeze({receiptId,kind});});
  },
  async readAttempt(attemptIdValue:string,worker:FeedWorkerBinding){
   const attemptId=id(attemptIdValue),w=object(worker);keys(w,["runtimeAttemptId","workerBindingSHA256"]);const runtime=text(w.runtimeAttemptId,128),workerSHA=digest(w.workerBindingSHA256);
   return transaction(async(c,who)=>{const ar=await c.query("select intent_id from crays_core.personal_feed_attempts where attempt_id=$1 and account_id=$2",[attemptId,who.account_id]);if(ar.rows.length!==1)throw fail("OWN_ATTEMPT_REQUIRED");
    const {i,s,runtime:run}=await currentIntent(c,ar.rows[0].intent_id,who);if(i.runtime_attempt_id!==runtime||s.worker_binding_sha256!==workerSHA)throw fail("WORKER_BINDING_CHANGED");
    const outcome=await latest(c,attemptId);return Object.freeze({attemptId,intentId:i.intent_id,stateId:s.state_id,canonicalPersonId:s.canonical_person_id,agentId:s.agent_id,runtimeAttemptId:i.runtime_attempt_id,sdkRunId:run.sdk_run_id,runtimeBindingSHA256:run.runtime_binding_sha256,planSHA256:i.plan_sha256,workerBindingSHA256:workerSHA,receiptState:outcome?.kind??"unknown_pending_observation",outcomeReceiptId:outcome?.receipt_id??null,executionAuthorized:false});});
  },
  async readState(stateIdValue:string){const stateId=id(stateIdValue);return transaction(async(c,who)=>{const s=await state(c,stateId,who);return Object.freeze({stateId,version:s.version,stateSHA256:s.sha256,engineSHA256:s.engine_sha256,workerBindingSHA256:s.worker_binding_sha256});});},
  async revokeState(stateIdValue:string){const stateId=id(stateIdValue);return transaction(async(c,who)=>{await state(c,stateId,who);const receiptId=randomUUID();await c.query("insert into crays_core.personal_feed_revocations(state_id,account_id,receipt_id) values($1,$2,$3)",[stateId,who.account_id,receiptId]);return Object.freeze({receiptId,stateId});});},
 });
}

/** Explicit separate host surfaces; do not install owner/custody commands as tools.
 * These server factories do not authenticate arbitrary JS arguments. Admission
 * must reuse the original Auth0/Core principal and permitted producer role.
 */
export function createOwnPersonalFeedRuntimeCommands(principal:NativePersonalPrincipal){
 const c=createOwnPersonalFeedCommands(principal);
 return Object.freeze({propose:c.propose,claim:c.claim,recordOutcome:c.recordOutcome,readAttempt:c.readAttempt,readState:c.readState});
}
export function createOwnPersonalFeedOwnerCommands(principal:NativePersonalPrincipal){
 const c=createOwnPersonalFeedCommands(principal);
 return Object.freeze({confirm:c.confirm,revokeState:c.revokeState,readState:c.readState});
}
export function createOwnPersonalFeedCustodyCommands(principal:NativePersonalPrincipal){
 const c=createOwnPersonalFeedCommands(principal);
 return Object.freeze({registerState:c.registerState});
}
