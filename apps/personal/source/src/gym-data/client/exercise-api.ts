import {z} from 'zod';
import {equipmentIds,loadTypes,movementPatterns,movementPlanes} from '../original-contracts/vocabulary';
import type {ExerciseSearchReadModel,ExerciseDetailReadModel,ExerciseMedia} from '../original-contracts/exercise-catalog-contract';

const digest=z.string().regex(/^[a-f0-9]{64}$/);
const states=z.enum(['READY','EMPTY','NO_RESULTS','NOT_FOUND','BLOCKED','UNAVAILABLE','PERMISSION_DENIED','REVIEW_REQUIRED']);
const sourceUrl=z.string().url().refine(value=>{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;});
const media=z.object({mediaId:z.string().uuid(),kind:z.enum(['IMAGE','VIDEO']),match:z.enum(['EXACT','FAMILY_LEVEL']),stage:z.enum(['START','PEAK','MAIN','UNKNOWN']),posterUrl:z.string().regex(/^\/api\/crays\/member\/train\/media\/[a-f0-9-]{36}$/i),altText:z.string(),width:z.number().positive(),height:z.number().positive(),attributionLabel:z.string(),attributionUrl:sourceUrl,sourceDigest:digest,reviewReceiptDigest:digest}).refine(value=>value.posterUrl===`/api/crays/member/train/media/${value.mediaId}`);
const summary=z.object({craysExerciseId:z.string().uuid(),slug:z.string().min(1),name:z.string().min(1),movementPattern:z.enum(movementPatterns),movementPlane:z.enum(movementPlanes),loadType:z.enum(loadTypes),equipment:z.array(z.enum(equipmentIds)),primaryMuscles:z.array(z.string()),level:z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','UNKNOWN']),goals:z.array(z.string()),hasExactMedia:z.boolean(),media:media.nullable(),mediaSequence:z.array(media),publicationReceiptDigest:digest});
const filters=z.object({query:z.string().optional(),muscle:z.string().optional(),equipment:z.enum(equipmentIds).optional(),movement:z.enum(movementPatterns).optional(),goal:z.string().optional(),level:z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','UNKNOWN']).optional(),limitation:z.string().optional(),media:z.enum(['EXACT','ANY','NONE']).optional(),take:z.number().int().min(1).max(48),cursor:z.string().optional()});
const search=z.object({contract:z.literal('crays.train-exercise-search.v2'),state:states,items:z.array(summary),nextCursor:z.string().nullable(),appliedFilters:filters,publicationReceiptDigest:digest.nullable(),availableLimitations:z.array(z.string()),reason:z.string().nullable(),cursorApplied:z.boolean().optional()});
const detail=z.object({contract:z.literal('crays.train-exercise-detail.v2'),state:states,publicationReceiptDigest:digest.nullable(),reason:z.string().nullable(),exercise:summary.extend({description:z.string(),instructions:z.array(z.string()),techniqueCues:z.array(z.string()),commonMistakes:z.array(z.string()),secondaryMuscles:z.array(z.string()),alternatives:z.array(z.object({craysExerciseId:z.string().uuid(),name:z.string(),reason:z.string()})),provenance:z.array(z.object({sourceKind:z.string(),sourceReceiptDigest:digest,sourceObjectId:z.string(),licenseLabel:z.string(),objectUrl:sourceUrl})),attribution:z.object({label:z.string(),url:sourceUrl}).nullable(),safetyNotice:z.string()}).nullable()});

export class ExerciseReadError extends Error{
 constructor(public readonly kind:'SESSION'|'PERMISSION'|'CURSOR'|'UNAVAILABLE'){super(kind);}
}
export type ExerciseSearchResponse=ExerciseSearchReadModel&Readonly<{cursorApplied?:boolean}>;
export type ExerciseApi={
 search(params:URLSearchParams,signal:AbortSignal):Promise<ExerciseSearchResponse>;
 detail(id:string,signal:AbortSignal):Promise<ExerciseDetailReadModel>;
 media(media:ExerciseMedia,signal:AbortSignal):Promise<Blob>;
};
/** Original same-origin APIs only. The host owns the single shared login.
 * owner/session selection never comes from an email, request header or query.
 * onSessionRequired asks the host to re-read Gym access; it is not a global
 * logout instruction. The host must independently re-read its original SDK.
 */
export function createExerciseApi(onSessionRequired:()=>void,transport:typeof fetch=fetch):ExerciseApi{
 async function request(url:string,signal:AbortSignal,allowDetailState=false){
  signal.throwIfAborted();
  const response=await transport(url,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal});
  signal.throwIfAborted();
  if(response.status===401){if(!signal.aborted)onSessionRequired();throw new ExerciseReadError('SESSION');}
  if(response.status===403){
   const body=await response.clone().json().catch(()=>null) as {reason?:unknown;message?:unknown;note?:unknown}|null;
   signal.throwIfAborted();
   const copy=[body?.reason,body?.message,body?.note].filter((value):value is string=>typeof value==='string').join(' ');
   const sessionRequired=/\b(sign in|log in|session.+required|verified own-member session|required member session)\b/i.test(copy);
   if(sessionRequired&&!signal.aborted)onSessionRequired();
   throw new ExerciseReadError(sessionRequired?'SESSION':'PERMISSION');
  }
  if(response.status===400)throw new ExerciseReadError('CURSOR');
  if(!response.ok&&!(allowDetailState&&(response.status===404||response.status===409)))throw new ExerciseReadError('UNAVAILABLE');
  return response;
 }
 async function readJson(response:Response,signal:AbortSignal){const value:unknown=await response.json();signal.throwIfAborted();return value;}
 return {
  async search(params,signal){try{
   const query=new URLSearchParams(params),keys=['q','muscle','equipment','movement','goal','level','limitation','media','take','cursor'];
   if([...query.keys()].some(key=>!keys.includes(key)||query.getAll(key).length!==1))throw new ExerciseReadError('CURSOR');
   const model=search.parse(await readJson(await request(`/api/crays/member/train/exercises?${query}`,signal),signal));signal.throwIfAborted();
   for(const key of ['query','muscle','equipment','movement','goal','level','limitation'] as const){const requested=query.get(key==='query'?'q':key)?.trim()||undefined;if(model.appliedFilters[key]!==requested)throw new ExerciseReadError('UNAVAILABLE');}
   if(model.appliedFilters.take!==Number(query.get('take')??24)||(model.appliedFilters.media??'ANY')!==(query.get('media')??'ANY')||(model.cursorApplied!==undefined&&model.cursorApplied!==query.has('cursor')))throw new ExerciseReadError('UNAVAILABLE');
   if((model.state==='READY')!==(model.items.length>0))throw new ExerciseReadError('UNAVAILABLE');
   return model;}catch(error){if(error instanceof ExerciseReadError||signal.aborted)throw error;throw new ExerciseReadError('UNAVAILABLE');}},
  async detail(id,signal){try{const response=await request(`/api/crays/member/train/exercises/${encodeURIComponent(id)}`,signal,true);const model=detail.parse(await readJson(response,signal));signal.throwIfAborted();if((response.status===409&&model.state!=='REVIEW_REQUIRED')||(response.status===404&&model.state!=='NOT_FOUND'))throw new ExerciseReadError('UNAVAILABLE');
   if((model.state==='READY')!==(model.exercise!==null))throw new ExerciseReadError('UNAVAILABLE');
   if(model.exercise){const selected=id.trim(),isUuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(selected);if(isUuid?model.exercise.craysExerciseId.toLowerCase()!==selected.toLowerCase():model.exercise.slug!==selected)throw new ExerciseReadError('UNAVAILABLE');}
   return model;}catch(error){if(error instanceof ExerciseReadError||signal.aborted)throw error;throw new ExerciseReadError('UNAVAILABLE');}},
  async media(value,signal){
   signal.throwIfAborted();
   const parsed=media.safeParse(value);if(!parsed.success)throw new ExerciseReadError('UNAVAILABLE');
   const blob=await(await request(parsed.data.posterUrl,signal)).blob();
   signal.throwIfAborted();
   if(blob.size===0||!(blob.type.startsWith('image/')||(value.kind==='VIDEO'&&blob.type.startsWith('video/'))))throw new ExerciseReadError('UNAVAILABLE');
   // The original TRAIN view binds sourceDigest to the asset source_sha256.
   // A current asset response must still match the selected catalogue version.
   const bytes=await blob.arrayBuffer();signal.throwIfAborted();
   const actual=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
   signal.throwIfAborted();
   if(actual!==parsed.data.sourceDigest)throw new ExerciseReadError('UNAVAILABLE');
   return blob;
  },
 };
}
