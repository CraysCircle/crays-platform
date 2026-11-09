import {z} from 'zod';
// Original member-health-experience.v1 structure, plus the additive authorized
// source/pagination fields. Parsing never promotes PARTIAL/UNKNOWN to READY.
const digest=z.string().regex(/^[a-f0-9]{64}$/),uuid=z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
const state=z.enum(['VALUE','UNKNOWN','BLOCKED','MISSING_CONSENT','WITHDRAWN','STALE','PARTIAL','OUTAGE','CONFLICT','EXCLUDED','DELETED','REVIEW_REQUIRED','PERMISSION_DENIED','INSUFFICIENT']);
const timezone=z.string().refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}});
const evidence=z.object({authority:z.string().nullable(),sourceKind:z.string().nullable(),observedWindow:z.string().nullable(),timezone:z.string(),quality:z.string().nullable(),coverage:z.string().nullable(),freshness:z.string().nullable(),gaps:z.array(z.string()),exclusions:z.array(z.string()),conflicts:z.array(z.string()),deletionState:z.string().nullable(),receiptDigest:digest.nullable(),mappingVersion:z.string().nullable()}).passthrough();
const assertion=z.object({id:z.string().min(1),label:z.string(),state,value:z.string().nullable(),unit:z.string().nullable(),reason:z.string(),evidence}).passthrough().refine(row=>row.state!=='VALUE'||(row.value!==null&&row.evidence.receiptDigest!==null&&Boolean(row.evidence.authority)&&Boolean(row.evidence.sourceKind)));
const assertions=z.array(assertion).refine(rows=>new Set(rows.map(row=>row.id)).size===rows.length);
const trend=z.object({id:z.string(),label:z.string(),unit:z.string(),points:z.array(z.object({at:z.string(),value:z.number().finite(),sourceKind:z.string()}).passthrough()),evidence}).passthrough();
const overview=z.object({rangeDays:z.tuple([z.literal(7),z.literal(28),z.literal(90),z.literal(365)]),customMaxDays:z.literal(366),timezone,baseline:z.object({minimumValuesPerWindow:z.literal(4),comparison:z.literal('PREVIOUS_EQUAL_NON_OVERLAPPING_WINDOW'),memberOnly:z.literal(true)}).passthrough(),sourceCompare:z.object({mode:z.literal('SEPARATE_NEVER_MERGED'),availableSources:z.array(z.string())}).passthrough()}).passthrough();
const sourceOption=z.object({id:z.string(),connectionId:uuid,receiptDigest:digest,providerKey:z.string().optional(),sourceKind:z.string().optional()}).passthrough().refine(row=>row.id===row.connectionId+'/'+row.receiptDigest);
const series=z.object({id:z.string(),sourceId:z.string(),connectionId:uuid,receiptDigest:digest,hasMore:z.boolean(),trend,pointEvidence:z.array(z.object({at:z.string(),recordId:uuid,evidence}).passthrough())}).passthrough().refine(row=>row.sourceId===row.connectionId+'/'+row.receiptDigest&&row.trend.points.length===row.pointEvidence.length&&row.pointEvidence.every((point,index)=>point.at===row.trend.points[index].at&&point.evidence.receiptDigest===row.receiptDigest));
const sources={sourceOptions:z.array(sourceOption),sourceSeries:z.array(series),selectedSourceId:z.string().nullable()};
const range=z.object({from:z.string().date(),to:z.string().date(),timezone}).passthrough();
const page=z.object({pageLimit:z.number().int().positive(),hasMore:z.boolean(),nextCursor:z.string().min(1).max(4096).nullable()}).passthrough().refine(value=>value.hasMore===(value.nextCursor!==null));
const pagination=z.object({observations:page,activity:page,sleep:page,workouts:page.optional()}).passthrough();
const streams=z.array(z.object({id:z.enum(['heart-rate','heart-rate-zones','pace','distance','power','cadence','elevation','laps']),label:z.string(),unit:z.string(),state,points:z.array(z.object({offsetSeconds:z.number().finite().nonnegative(),value:z.number().finite()}).passthrough()),reason:z.string(),evidence}).passthrough());
const route=z.object({state,points:z.array(z.object({x:z.number().finite(),y:z.number().finite()}).strict()),startEndHidden:z.literal(true),rawCoordinatesExposed:z.literal(false),reason:z.string(),evidence}).passthrough();
const sleepRecovery=z.object({capabilityBound:z.literal(true),notDiagnostic:z.literal(true),scoresRelabelled:z.literal(false),providerScoresSeparateFromCraysInterpretation:z.literal(true),stateMatrix:z.array(state)}).passthrough();
const runtime=z.object({state:z.enum(['READY','UNAVAILABLE']),label:z.string()}).passthrough();
const memberData=z.object({state:z.enum(['READY','PARTIAL','BLOCKED']),reasonCode:z.string(),label:z.string()}).passthrough();
const source=z.object({state:z.enum(['VALUE','UNKNOWN']),label:z.string()}).passthrough();
const model=z.object({schemaVersion:z.literal('crays.member-health-experience.v1'),availability:z.boolean(),runtime,memberData,source,signals:assertions,workoutAnalytics:assertions,workoutStreams:streams,workoutRouteProjection:route,trends:z.array(trend),overview,sleepRecovery,limitations:z.array(z.string()),...sources}).passthrough();
// Session-twin data stays source-separated. Original server decisions/factors
// and receipt/version relations are retained; eligibility is never a command.
const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const referenceIds=z.array(uuid).min(2).max(10000).refine(ids=>new Set(ids).size===ids.length);
const sameIds=(left:readonly string[],right:readonly string[])=>{const ids=new Set(right);return left.length===right.length&&ids.size===right.length&&left.every(id=>ids.has(id));};
const factors=z.object({strategyVersion:z.literal('crays.studio-session-twin.v1'),observationIds:referenceIds,sourceKinds:z.array(z.string()),activityTypes:z.array(z.string()),typeAgreement:z.boolean(),maximumStartDeltaSeconds:z.number().finite().nonnegative(),minimumWindowOverlapRatio:z.number().finite().min(0).max(1),maximumDurationDeltaSeconds:z.number().finite().nonnegative().nullable(),maximumDistanceDeltaMeters:z.number().finite().nonnegative().nullable(),classification:z.enum(['POSSIBLE_MATCH','DISTINCT','CONFLICT']),setInferenceUsed:z.literal(false),setAuthority:z.literal('CRAYS_ONLY')}).passthrough();
const reconciliationObservation=z.object({observationId:uuid,workoutReceiptId:uuid,activityType:z.string(),sourceKind:z.string(),observedWindow:z.object({start:z.string(),end:z.string(),timezone:z.string()}).passthrough(),receipt:z.object({digest,quality:z.string(),coverage:z.string(),freshnessAt:z.string(),gaps:z.array(z.string()),exclusions:z.array(z.string()),conflicts:z.array(z.string())}).passthrough()}).passthrough();
const reconciliationCandidate=z.object({candidateId:uuid,reconciliationId:uuid,observationIds:referenceIds,clusterDigest:digest,observations:z.array(reconciliationObservation).min(2).max(10000),decision:z.enum(['KEEP_SEPARATE','PREFER_SOURCE','MERGED_PROJECTION','REVIEW_REQUIRED']),decisionVersion:count,classification:z.enum(['POSSIBLE_MATCH','DISTINCT','CONFLICT','CONFIRMED']),chosenObservationId:uuid.nullable(),authorityOrder:z.array(z.string()),strategyVersion:z.string(),factors,evidence:z.object({projection:z.literal('CURRENT_AUTHORIZED_FACTORS_ONLY'),receiptDigests:z.array(digest)}).passthrough(),memberOverride:z.boolean(),confirmationRequired:z.boolean(),confirmationEligible:z.boolean(),rejectEligible:z.boolean(),undoEligible:z.boolean(),confirmAvailable:z.literal(false),rejectAvailable:z.literal(false),undoAvailable:z.literal(false),decisionReceiptSha256:digest.nullable(),updatedAt:z.string()}).passthrough().refine(row=>row.candidateId===row.reconciliationId&&sameIds(row.observationIds,row.factors.observationIds)&&sameIds(row.observationIds,row.observations.map(item=>item.observationId))&&new Set(row.observations.map(item=>item.observationId)).size===row.observations.length&&(row.chosenObservationId===null||row.observationIds.includes(row.chosenObservationId))&&row.evidence.receiptDigests.length===row.observations.length&&row.observations.every((item,index)=>item.receipt.digest===row.evidence.receiptDigests[index]));
const base={status:z.enum(['READY','PARTIAL','BLOCKED']),reasonCode:z.string()};
export const healthResponseSchemas={
 experience:z.object({...base,selectedRange:range,model,pagination}).passthrough(),
 overview:z.object({...base,selectedRange:range,overview,rangePresets:z.array(z.number()),signals:assertions,trends:z.array(trend),limitations:z.array(z.string()),pagination,...sources}).passthrough(),
 'sleep-recovery':z.object({...base,selectedRange:range,...sleepRecovery.shape,signals:assertions,trends:z.array(trend),limitations:z.array(z.string()),pagination,...sources}).passthrough(),
 'workout-analytics':z.object({...base,selectedRange:range,craysSetAuthority:z.literal('CRAYS_ONLY'),sourcesMerged:z.literal(false),summaries:assertions,streams,routeProjection:route,limitations:z.array(z.string()),pagination:page,selectedSourceId:z.string().nullable()}).passthrough(),
 reconciliation:z.object({...base,selectedRange:range,counts:z.object({workoutReceipts:count,greenWorkoutReceipts:count,activeReconciliations:count,reviewRequired:count}).passthrough(),countsScope:z.literal('CURRENT_AUTHORIZED_PAGE_REFERENCES'),candidates:z.array(reconciliationCandidate).max(200).refine(rows=>new Set(rows.map(row=>row.candidateId)).size===rows.length),memberConfirmationAvailable:z.literal(false),undoAvailable:z.literal(false),commandAuthority:z.literal('PENDING_ORIGINAL_WRITE_AUTHORITY'),craysSetAuthority:z.literal('CRAYS_ONLY'),wearableSetInference:z.literal(false),rawStreamsExposed:z.literal(false),availability:z.boolean(),pagination:page,unavailable:z.array(z.object({reason:z.string()}).passthrough())}).passthrough(),
 connections:z.object({...base,runtime,memberData,source,executionAvailable:z.boolean(),executionAuthority:z.literal('/member/train?view=settings'),actions:z.array(z.object({action:z.enum(['CONNECT','BACKFILL','RECONNECT','REVIEW_DUPLICATES','EXPORT','DISCONNECT','DELETE']),state:z.enum(['DELEGATED_TO_TRAIN_SETTINGS','BLOCKED']),reasonCode:z.string().nullable()}).passthrough())}).passthrough(),
};
export type HealthDomain=keyof typeof healthResponseSchemas;
export type HealthResponse<K extends HealthDomain>=z.infer<(typeof healthResponseSchemas)[K]>;
export class HealthReadError extends Error{constructor(public readonly kind:'SESSION'|'PERMISSION'|'INVALID'|'CONFLICT'|'UNAVAILABLE'){super(kind);}}
export type HealthApi={read<K extends HealthDomain>(domain:K,params:URLSearchParams,signal:AbortSignal):Promise<HealthResponse<K>>};
const allowed:Record<HealthDomain,readonly string[]>={experience:['days','from','to','source','observationCursor','activityCursor','sleepCursor','workoutCursor'],overview:['days','from','to','source','observationCursor','activityCursor','sleepCursor'],'sleep-recovery':['days','from','to','source','observationCursor','activityCursor','sleepCursor'],'workout-analytics':['days','from','to','source','workoutCursor'],connections:['days','from','to'],reconciliation:['days','from','to','reconciliationCursor']};
/** Same existing global session, same-origin GET only, no local data cache,
 * no identity/scope headers or fixture fallback. Host aborts on account change.
 * Delegated connection metadata does not authorize a provider command.
 */
export function createHealthApi(onAccessInvalidated:()=>void,transport:typeof fetch=fetch):HealthApi{
 return {async read<K extends HealthDomain>(domain:K,params:URLSearchParams,signal:AbortSignal):Promise<HealthResponse<K>>{
  signal.throwIfAborted();
  if(!Object.hasOwn(allowed,domain))throw new HealthReadError('INVALID');
  const query=new URLSearchParams(params);
  for(const key of query.keys())if(!allowed[domain].includes(key)||query.getAll(key).length!==1)throw new HealthReadError('INVALID');
  try{
   const response=await transport('/api/crays/member/health/'+domain+(query.size?'?'+query:''),{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal});
   signal.throwIfAborted();
   if(response.status===401){onAccessInvalidated();throw new HealthReadError('SESSION');}
   if(response.status===403)throw new HealthReadError('PERMISSION');
   if(response.status===400)throw new HealthReadError('INVALID');
   if(response.status===409)throw new HealthReadError('CONFLICT');
   if(!response.ok)throw new HealthReadError('UNAVAILABLE');
   const value=await response.json();signal.throwIfAborted();
   const parsed=healthResponseSchemas[domain].parse(value);signal.throwIfAborted();
   if(domain!=='connections'){
    // Domain selects the schema above; passthrough extension keys alone must
    // not be used as a discriminator for the original nested experience DTO.
    const binding=parsed as HealthResponse<Exclude<HealthDomain,'connections'>>;
    const actualSource=domain==='experience'?(binding as HealthResponse<'experience'>).model.selectedSourceId:(binding as HealthResponse<'overview'>).selectedSourceId;
    if(domain!=='reconciliation'&&actualSource!==query.get('source'))throw new HealthReadError('UNAVAILABLE');
    for(const key of ['from','to'] as const)if(query.has(key)&&binding.selectedRange[key]!==query.get(key))throw new HealthReadError('UNAVAILABLE');
   }
   return parsed as HealthResponse<K>;
  }catch(error){if(signal.aborted||error instanceof HealthReadError)throw error;throw new HealthReadError('UNAVAILABLE');}
 }};
}
