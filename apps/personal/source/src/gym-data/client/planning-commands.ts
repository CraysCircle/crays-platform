import {z} from 'zod';
import {templateInput,programInput,calendarInput,calendarDecisionInput,programStateInput,substitutionInput,proposalDecisionInput,sessionStartInput} from '../original-contracts/planning-command-contracts';
import {trainingPlanningRequest} from '../original-contracts/training-planning-request';
import type {GymAccess} from './gym-access';
import {createPlanningApi} from './planning-api';
import {createTrainingApi} from './training-api';

const uuid=z.string().uuid(),version=z.union([z.number().int().positive().safe(),z.string().regex(/^[1-9][0-9]*$/)]),digest=z.string().regex(/^[a-f0-9]{64}$/);
const templateReceipt=z.object({templateId:uuid,templateVersion:version,contentSha256:digest,lifecycleState:z.enum(['DRAFT','ACTIVE','ARCHIVED'])}).passthrough();
const programReceipt=z.object({programId:uuid,programVersion:version,lifecycleState:z.literal('DRAFT'),contentSha256:digest}).passthrough();
const calendarReceipt=z.object({eventId:uuid,state:z.enum(['PLANNED','MOVED','SKIPPED','COMPLETED','CANCELLED']),eventVersion:version}).passthrough();
const programStateReceipt=z.object({programId:uuid,lifecycleState:z.enum(['ACTIVE','PAUSED','COMPLETED','ARCHIVED']),activeVersion:version}).passthrough();
const sessionReceipt=z.object({sessionId:uuid,state:z.enum(['ACTIVE','PAUSED','COMPLETED','ABORTED']),sessionVersion:version,sourceKind:z.enum(['TEMPLATE','FREE']),sourceId:uuid.nullable(),sourceVersion:version.nullable()}).passthrough();
const decision=z.enum(['ACCEPTED','REJECTED']);
const recommendationReceipt=z.object({recommendationId:uuid,profileVersion:version,proposedProgramContent:z.json(),explanation:z.json(),rulesetVersion:z.string(),state:z.literal('PROPOSED')}).passthrough();
const recommendationDecision=z.object({recommendationId:uuid,state:decision,program:programReceipt.nullable()}).passthrough().refine(row=>(row.state==='ACCEPTED')===(row.program!==null));
const substitutionReceipt=z.object({proposalId:uuid,originalExerciseId:uuid,substituteExerciseId:uuid,mappingVersion:z.string(),reasonCodes:z.array(z.string()),explanation:z.json(),evidence:z.json(),state:z.literal('PROPOSED')}).passthrough();
const substitutionDecision=z.object({proposalId:uuid,state:decision,substituteExerciseId:uuid}).passthrough();
function envelope<T extends z.ZodType>(contract:string,key:string,schema:T){return z.object({contract:z.literal(contract),state:z.literal('READY'),[key]:schema}).passthrough();}
export type PlanningCommandResult=
 |{state:'CONFIRMED';receipt:Record<string,unknown>;readbackRequired:true}
 |{state:'CONFLICT';activeSession?:{sessionId:string;state:'ACTIVE'|'PAUSED';sessionVersion:string|number};readbackRequired:true}
 |{state:'UNCONFIRMED'|'OWNER_CHANGED';readbackRequired:true}
 |{state:'INVALID'|'OFFLINE'|'SESSION'|'PERMISSION'|'BLOCKED'|'BUSY'|'RECOVERY_REQUIRED';readbackRequired:false};
export type PlanningCommandPorts={access:()=>GymAccess|null;online:()=>boolean;send:typeof fetch;onAccessInvalidated:()=>void};
/** Existing original commands, explicit user dispatch only. No automatic retry,
 * no offline queue, no authentication headers, no optimistic records. An
 * uncertain/confirmed outcome locks further commands until original readback.
 * Unknown creates have no original idempotency key and MUST NOT be replayed.
 */
export function createPlanningCommands(ports:PlanningCommandPorts){
 let busy=false;
 const recovery=new Map<string,Recovery>();
 const verified=new Set<string>();
 const recoverySchema=z.object({domain:z.enum(['templates','programs','calendar','recommendations','substitutions','sessions']),id:uuid.nullable(),date:z.string().date().nullable(),version:version.nullable(),receiptVerified:z.boolean(),relatedProgram:z.object({id:uuid,version}).strict().nullable()}).strict();
 type Recovery=z.infer<typeof recoverySchema>;
 const storageKey=(owner:string)=>'crays.gym.planning.recovery.v1:'+encodeURIComponent(owner);
 function pending(owner:string):Recovery|null{
  if(recovery.has(owner))return recovery.get(owner)!;
  if(typeof window==='undefined')return null;
  try{const raw=window.sessionStorage.getItem(storageKey(owner));if(!raw)return null;const parsed=recoverySchema.safeParse(JSON.parse(raw));return parsed.success?parsed.data:null;}catch{return null;}
 }
 function isLocked(owner:string){
  if(recovery.has(owner))return true;
  if(typeof window==='undefined')return false;
  try{return window.sessionStorage.getItem(storageKey(owner))!==null;}catch{return true;}
 }
 function lock(owner:string,entry:Recovery){
  verified.delete(owner);
  if(typeof window!=='undefined'){try{window.sessionStorage.setItem(storageKey(owner),JSON.stringify(entry));}catch{return false;}}
  recovery.set(owner,entry);return true;
 }
 function unlock(owner:string){
  if(typeof window!=='undefined'){try{window.sessionStorage.removeItem(storageKey(owner));}catch{return false;}}
  recovery.delete(owner);verified.delete(owner);return true;
 }
 const sameOwner=(owner:string)=>{const access=ports.access();return access?.kind==='ready'&&access.ownerKey===owner;};
 async function execute(owner:string,path:string,method:'POST'|'PATCH',input:unknown,inputSchema:z.ZodType,contract:string,key:string,receiptSchema:z.ZodType,matches:(receipt:Record<string,unknown>)=>boolean=()=>true,readbackDate?:string):Promise<PlanningCommandResult>{
  if(!sameOwner(owner))return {state:'OWNER_CHANGED',readbackRequired:true};
  if(busy)return {state:'BUSY',readbackRequired:false};
  if(isLocked(owner))return {state:'RECOVERY_REQUIRED',readbackRequired:false};
  const parsed=inputSchema.safeParse(input);
  if(!parsed.success)return {state:'INVALID',readbackRequired:false};
  if(!ports.online())return {state:'OFFLINE',readbackRequired:false};
  // Capture validated bytes before the first await; caller draft edits cannot
  // change an in-flight original request.
  const body=JSON.stringify(parsed.data);
  // Persist only the affected original domain/ID/date/version, never a request
  // body, notes, credentials or token. Unknown creates stay blocked after reload.
  const parts=path.split('/');
  const entry:Recovery={domain:parts[0] as Recovery['domain'],id:uuid.safeParse(parts[1]).success?parts[1]:null,date:z.string().date().safeParse(readbackDate??(parsed.data as Record<string,unknown>).localDate).success?String(readbackDate??(parsed.data as Record<string,unknown>).localDate):null,version:null,receiptVerified:false,relatedProgram:null};
  if(!lock(owner,entry))return {state:'BLOCKED',readbackRequired:false};
  busy=true;
  try{
   let dispatched=false;
   const result=await trainingPlanningRequest((url,options)=>{
    if(!sameOwner(owner))throw Error('OWNER_CHANGED_BEFORE_DISPATCH');
    dispatched=true;
    return ports.send(url,{...options,credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'content-type':'application/json'}});
   },'/api/crays/member/train/'+path,{method,body},true);
   if(!sameOwner(owner)){if(dispatched)recovery.set(owner,entry);return {state:'OWNER_CHANGED',readbackRequired:true};}
   if(result.p.state==='OFFLINE'){unlock(owner);return {state:'OFFLINE',readbackRequired:false};}
   if(result.p.state==='UNCONFIRMED'){recovery.set(owner,entry);return {state:'UNCONFIRMED',readbackRequired:true};}
   if(result.r.status===401){unlock(owner);ports.onAccessInvalidated();return {state:'SESSION',readbackRequired:false};}
   if(result.r.status===403){unlock(owner);return {state:'PERMISSION',readbackRequired:false};}
   if(result.r.status===400){unlock(owner);return {state:'INVALID',readbackRequired:false};}
   if(result.r.status===423){unlock(owner);return {state:'BLOCKED',readbackRequired:false};}
   recovery.set(owner,entry);
   if(result.r.status===409){
    const active=z.object({sessionId:uuid,state:z.enum(['ACTIVE','PAUSED']),sessionVersion:version}).safeParse(result.p.activeSession);
    if(path==='sessions'&&active.success)lock(owner,{...entry,id:active.data.sessionId,version:active.data.sessionVersion,receiptVerified:true});
    return {state:'CONFLICT',...(path==='sessions'&&active.success?{activeSession:active.data}:{}),readbackRequired:true};
   }
   if(!result.r.ok)return {state:'UNCONFIRMED',readbackRequired:true};
   const response=envelope(contract,key,receiptSchema).safeParse(result.p);
   if(!response.success)return {state:'UNCONFIRMED',readbackRequired:true};
   const receipt=response.data[key] as Record<string,unknown>;
   if(!matches(receipt))return {state:'UNCONFIRMED',readbackRequired:true};
   const id=receipt.templateId??receipt.programId??receipt.eventId??receipt.recommendationId??receipt.proposalId??receipt.sessionId;
   const recordVersion=receipt.templateVersion??receipt.programVersion??receipt.eventVersion??receipt.activeVersion??receipt.sessionVersion??null;
   const linked=receipt.program as {programId:string;programVersion:string|number}|null|undefined;
   if(!lock(owner,{...entry,id:typeof id==='string'?id:entry.id,version:recordVersion as Recovery['version'],receiptVerified:true,relatedProgram:linked?{id:linked.programId,version:linked.programVersion}:null}))return {state:'UNCONFIRMED',readbackRequired:true};
   return {state:'CONFIRMED',receipt,readbackRequired:true};
  }finally{busy=false;}
 }
 const invalid=():Promise<PlanningCommandResult>=>Promise.resolve({state:'INVALID',readbackRequired:false});
 const decisionState=(action:unknown)=>action==='ACCEPT'?'ACCEPTED':'REJECTED';
 return {
  needsReadback:(owner:string)=>isLocked(owner),
  /** Caller must have reloaded all affected original records and obtained an
   * explicit reconciliation decision. This never replays the pending request. */
  async reconcileReadback(owner:string,signal:AbortSignal):Promise<{domain:string;record:Record<string,unknown>}> {
   verified.delete(owner);signal.throwIfAborted();
   const entry=pending(owner);if(!sameOwner(owner)||busy||!entry?.id||!entry.receiptVerified)throw Error('NO_IDENTIFIABLE_ORIGINAL_RECORD_KEEP_LOCKED');
   let record:Record<string,unknown>|undefined;
   if(entry.domain==='sessions'){
    const model=await createTrainingApi(ports.onAccessInvalidated,ports.send).detail(entry.id,signal);
    if('session'in model)record=model.session;
   }else{
    if(entry.domain==='calendar'&&!entry.date)throw Error('ORIGINAL_CALENDAR_DATE_REQUIRED_KEEP_LOCKED');
    const query=entry.domain==='calendar'?new URLSearchParams({from:entry.date!,to:entry.date!}):new URLSearchParams();
    const model=await createPlanningApi(ports.onAccessInvalidated,ports.send).read(entry.domain,query,signal);
    const names={templates:['templates','templateId'],programs:['programs','programId'],calendar:['events','eventId'],recommendations:['recommendations','recommendationId'],substitutions:['proposals','proposalId']} as const;
    const [collection,key]=names[entry.domain];
    const rows=(model as unknown as Record<string,unknown>)[collection];
    if(Array.isArray(rows))record=rows.find(row=>row[key]===entry.id) as Record<string,unknown>|undefined;
   }
   signal.throwIfAborted();
   if(!sameOwner(owner)||!record||JSON.stringify(pending(owner))!==JSON.stringify(entry))throw Error('ORIGINAL_READBACK_UNAVAILABLE_KEEP_LOCKED');
   const recordVersion=record.templateVersion??record.activeVersion??record.eventVersion??record.sessionVersion;
   if(entry.version!==null&&(!version.safeParse(recordVersion).success||BigInt(String(recordVersion))<BigInt(entry.version)))throw Error('ORIGINAL_VERSION_NOT_OBSERVED_KEEP_LOCKED');
   if(entry.relatedProgram){
    const programs=await createPlanningApi(ports.onAccessInvalidated,ports.send).read('programs',new URLSearchParams(),signal);
    const linked=programs.programs.find(row=>row.programId===entry.relatedProgram!.id);
    signal.throwIfAborted();
    if(!sameOwner(owner)||!linked||String(linked.activeVersion)!==String(entry.relatedProgram.version)||JSON.stringify(pending(owner))!==JSON.stringify(entry))throw Error('LINKED_ORIGINAL_DRAFT_NOT_OBSERVED_KEEP_LOCKED');
    record={...record,linkedProgrammeName:linked.name,linkedProgrammeState:linked.lifecycleState};
   }
   verified.add(owner);return {domain:entry.domain,record};
  },
  acknowledgeReadback(owner:string){if(!sameOwner(owner)||busy||!verified.has(owner))return false;return unlock(owner);},
  createTemplate(owner:string,input:unknown){const parsed=templateInput.safeParse(input);if(!parsed.success||parsed.data.templateId!==null||parsed.data.expectedVersion!==null)return invalid();return execute(owner,'templates','POST',parsed.data,templateInput,'crays.train-template.v1','template',templateReceipt,r=>String(r.templateVersion)==='1'&&r.lifecycleState===parsed.data.lifecycleState);},
  createProgram(owner:string,input:unknown){return execute(owner,'programs','POST',input,programInput,'crays.train-program.v1','program',programReceipt,r=>String(r.programVersion)==='1');},
  schedule(owner:string,input:unknown){return execute(owner,'calendar','POST',input,calendarInput,'crays.train-calendar-event.v1','event',calendarReceipt,r=>r.state==='PLANNED'&&String(r.eventVersion)==='1');},
  calendarDecision(owner:string,id:string,input:unknown,readbackDate?:string){const value=calendarDecisionInput.safeParse(input);if(!uuid.safeParse(id).success||!value.success)return invalid();const target={MOVE:'MOVED',SKIP:'SKIPPED',COMPLETE:'COMPLETED',CANCEL:'CANCELLED'};return execute(owner,'calendar/'+encodeURIComponent(id),'PATCH',value.data,calendarDecisionInput,'crays.train-calendar-event.v1','event',calendarReceipt,r=>r.eventId===id&&r.state===target[value.data.action]&&BigInt(String(r.eventVersion))===BigInt(value.data.expectedVersion)+1n,readbackDate);},
  programState(owner:string,id:string,input:unknown){const value=programStateInput.safeParse(input);if(!uuid.safeParse(id).success||!value.success)return invalid();const target={ACTIVATE:'ACTIVE',PAUSE:'PAUSED',COMPLETE:'COMPLETED',ARCHIVE:'ARCHIVED'};return execute(owner,'programs/'+encodeURIComponent(id)+'/state','PATCH',value.data,programStateInput,'crays.train-program-state.v1','program',programStateReceipt,r=>r.programId===id&&r.lifecycleState===target[value.data.action]&&String(r.activeVersion)===String(value.data.expectedVersion));},
  suggest(owner:string){return execute(owner,'recommendations','POST',{},z.object({}).strict(),'crays.train-plan-recommendation.v1','recommendation',recommendationReceipt);},
  decideRecommendation(owner:string,id:string,input:unknown){const value=proposalDecisionInput.safeParse(input);if(!uuid.safeParse(id).success||!value.success)return invalid();return execute(owner,'recommendations/'+encodeURIComponent(id),'PATCH',value.data,proposalDecisionInput,'crays.train-plan-recommendation-decision.v1','decision',recommendationDecision,r=>r.recommendationId===id&&r.state===decisionState(value.data.action));},
  requestSubstitution(owner:string,input:unknown){const value=substitutionInput.safeParse(input);if(!value.success)return invalid();return execute(owner,'substitutions','POST',value.data,substitutionInput,'crays.train-substitution.v1','proposal',substitutionReceipt,r=>r.originalExerciseId===value.data.originalExerciseId&&JSON.stringify(r.reasonCodes)===JSON.stringify(value.data.reasonCodes));},
  decideSubstitution(owner:string,id:string,input:unknown){const value=proposalDecisionInput.safeParse(input);if(!uuid.safeParse(id).success||!value.success)return invalid();return execute(owner,'substitutions/'+encodeURIComponent(id),'PATCH',value.data,proposalDecisionInput,'crays.train-substitution-decision.v1','proposal',substitutionDecision,r=>r.proposalId===id&&r.state===decisionState(value.data.action));},
  startTemplate(owner:string,input:unknown){const value=sessionStartInput.safeParse(input);if(!value.success||value.data.sourceKind!=='TEMPLATE'||!value.data.sourceId||!value.data.sourceVersion)return invalid();return execute(owner,'sessions','POST',value.data,sessionStartInput,'crays.train-workout-session.v1','session',sessionReceipt,r=>r.sourceKind==='TEMPLATE'&&r.sourceId===value.data.sourceId&&String(r.sourceVersion)===String(value.data.sourceVersion));},
 };
}
