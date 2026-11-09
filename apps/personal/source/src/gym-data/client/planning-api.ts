import {z} from 'zod';
import {TrainingReadError} from './training-api';
const uuid=z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
const version=z.union([z.string().regex(/^[1-9][0-9]*$/),z.number().int().positive().safe()]);
const timestamp=z.string().datetime({offset:true}),digest=z.string().regex(/^[a-f0-9]{64}$/),state=z.enum(['READY','EMPTY']);
// Original pg DATE columns are serialized by the existing UTC server as an
// ISO midnight timestamp. Accept that exact wire representation while retaining
// it for provenance; never convert the calendar day into the member timezone.
function retainOriginalCalendarDate(value:unknown):unknown{
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const row=value as Record<string,unknown>;
  if(typeof row.localDate==='string'&&/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(row.localDate))
   return {...row,originalLocalDateWireValue:row.localDate,localDate:row.localDate.slice(0,10)};
 }
 return value;
}
const template=z.object({templateId:uuid,name:z.string(),notes:z.string(),templateVersion:version,lifecycleState:z.string(),contentSha256:digest,createdAt:timestamp,exerciseCount:z.number().int().nonnegative()}).passthrough();
const program=z.object({programId:uuid,name:z.string(),goal:z.string(),lifecycleState:z.string(),activeVersion:version,createdAt:timestamp,weeks:z.number().int().positive().nullable(),content:z.json(),contentSha256:digest.nullable(),changeReason:z.string().nullable()}).passthrough();
const event=z.preprocess(retainOriginalCalendarDate,z.object({eventId:uuid,programId:uuid.nullable(),programVersion:version.nullable(),templateId:uuid.nullable(),templateVersion:version.nullable(),localDate:z.string().date(),localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/).nullable(),timezone:z.string().min(1),state:z.string(),originEventId:uuid.nullable(),eventVersion:version,reason:z.string().nullable()}).passthrough().refine(v=>(v.programId===null)===(v.programVersion===null)&&(v.templateId===null)===(v.templateVersion===null)));
const score=z.number().int().min(1).max(5).nullable();
const readiness=z.preprocess(retainOriginalCalendarDate,z.object({readinessId:uuid,localDate:z.string().date(),timezone:z.string().min(1),sleepFeeling:score,stress:score,painOrDiscomfort:score,motivation:score,voluntaryNotes:z.string(),state:z.string(),createdAt:timestamp,withdrawnAt:timestamp.nullable()}).passthrough());
const recommendation=z.object({recommendationId:uuid,profileVersion:version,proposedProgramContent:z.json(),explanation:z.json(),rulesetVersion:z.string(),state:z.string(),expiresAt:timestamp,decidedAt:timestamp.nullable()}).passthrough();
const substitution=z.object({proposalId:uuid,originalExerciseId:uuid,originalName:z.string(),substituteExerciseId:uuid,substituteName:z.string(),mappingVersion:z.string(),reasonCodes:z.array(z.string()),explanation:z.json(),evidence:z.json(),state:z.string(),expiresAt:timestamp,decidedAt:timestamp.nullable()}).passthrough();
const progression=z.object({proposalId:uuid,craysExerciseId:uuid,name:z.string(),proposalKind:z.string(),priorTarget:z.json(),proposedTarget:z.json(),evidence:z.json(),rulesetVersion:z.string(),explanation:z.json(),state:z.string(),expiresAt:timestamp,decidedAt:timestamp.nullable()}).passthrough();
// Passthrough retains additional original version/evidence fields. No response
// field is filled from a local example, another proposal or a provider score.
export const planningSchemas={
 templates:z.object({contract:z.literal('crays.train-templates.v1'),state,templates:z.array(template)}).passthrough().refine(v=>(v.state==='READY')===(v.templates.length>0)),
 programs:z.object({contract:z.literal('crays.train-programs.v1'),state,programs:z.array(program)}).passthrough().refine(v=>(v.state==='READY')===(v.programs.length>0)),
 calendar:z.object({contract:z.literal('crays.train-calendar.v1'),state,events:z.array(event)}).passthrough().refine(v=>(v.state==='READY')===(v.events.length>0)),
 readiness:z.object({contract:z.literal('crays.train-readiness-self-reports.v1'),state,reports:z.array(readiness).max(30),notice:z.string()}).passthrough().refine(v=>(v.state==='READY')===(v.reports.length>0)),
 recommendations:z.object({contract:z.literal('crays.train-plan-recommendations.v1'),state,recommendations:z.array(recommendation).max(20)}).passthrough().refine(v=>(v.state==='READY')===(v.recommendations.length>0)),
 substitutions:z.object({contract:z.literal('crays.train-substitutions.v1'),state,proposals:z.array(substitution).max(50)}).passthrough().refine(v=>(v.state==='READY')===(v.proposals.length>0)),
 progression:z.object({contract:z.literal('crays.train-progression-proposals.v1'),state,proposals:z.array(progression).max(50)}).passthrough().refine(v=>(v.state==='READY')===(v.proposals.length>0)),
 safety:z.object({contract:z.literal('crays.train-safety-boundary.v1'),state:z.literal('READY'),principles:z.array(z.string()),stopSignals:z.array(z.string()),escalation:z.string(),notDiagnostic:z.literal(true)}).passthrough(),
};
export type PlanningDomain=keyof typeof planningSchemas;
export type PlanningResponse<K extends PlanningDomain>=z.infer<(typeof planningSchemas)[K]>;
export type PlanningApi={read<K extends PlanningDomain>(domain:K,params:URLSearchParams,signal:AbortSignal):Promise<PlanningResponse<K>>};
/** Eight existing original GETs only. Server SDK/native/RLS authorization is
 * unchanged. This adapter grants no recommendation, programme or provider write. */
export function createPlanningApi(onAccessInvalidated:()=>void,transport:typeof fetch=fetch):PlanningApi{
 return {async read<K extends PlanningDomain>(domain:K,params:URLSearchParams,signal:AbortSignal):Promise<PlanningResponse<K>>{
  signal.throwIfAborted();
  if(!Object.hasOwn(planningSchemas,domain))throw new TrainingReadError('INVALID');
  const query=new URLSearchParams(params);
  if(domain==='calendar'){
   if([...query.keys()].some(k=>!['from','to'].includes(k)||query.getAll(k).length!==1)||!z.object({from:z.string().date(),to:z.string().date()}).refine(v=>v.from<=v.to).safeParse(Object.fromEntries(query)).success)throw new TrainingReadError('INVALID');
  }else if(query.size)throw new TrainingReadError('INVALID');
  try{
   const response=await transport('/api/crays/member/train/'+domain+(query.size?'?'+query:''),{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal});signal.throwIfAborted();
   if(response.status===401){onAccessInvalidated();throw new TrainingReadError('SESSION');}
   if(response.status===403)throw new TrainingReadError('PERMISSION');
   if(response.status===400)throw new TrainingReadError('INVALID');
   if(!response.ok)throw new TrainingReadError('UNAVAILABLE');
   const value:unknown=await response.json();signal.throwIfAborted();
   const parsed=planningSchemas[domain].parse(value);signal.throwIfAborted();return parsed as PlanningResponse<K>;
  }catch(error){if(signal.aborted||error instanceof TrainingReadError)throw error;throw new TrainingReadError('UNAVAILABLE');}
 }};
}
