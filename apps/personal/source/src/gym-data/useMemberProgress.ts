import {useCallback,useEffect,useState} from 'react';
import {z} from 'zod';
import type {GymAccess} from './client/gym-access';
// Preserve original Core column names, decimal strings, version strings and nulls.
const row=z.record(z.string(),z.unknown()),rows=z.array(row);
const schema=z.object({status:z.literal('ready'),goals:rows,measurements:rows,media:rows,sharing:rows,challenges:rows,privacyRequests:rows,rewards:rows,eligibleTrainers:rows,authority:z.object({canonicalStore:z.literal('crays-core'),privateMediaByDefault:z.literal(true),healthInferenceAllowed:z.literal(false)}).passthrough(),holistic:z.object({programmes:rows,tasks:rows,taskEvents:rows,weeklyReviewSelections:rows,dailyTimeline:rows,dailyReflections:rows,privateMilestones:rows,privatePatterns:rows,activityBaselineProposals:rows,reportPreviews:rows,weeklyReviewDecisions:rows}).passthrough(),challengeAuthority:z.object({evidence:rows,recalculations:rows,appeals:rows}).passthrough()}).passthrough();
export type MemberProgress=z.infer<typeof schema>;
export type ProgressRow=Record<string,unknown>;
export const originalMemberProgressPath='/api/crays/member/fitness/progress';
type Snapshot={owner:string;phase:'loading'|'ready'|'permission'|'session'|'unavailable';model:MemberProgress|null};
export function useMemberProgress(active:boolean,access:GymAccess|null,invalidate:()=>void){
 const owner=active&&access?.kind==='ready'?access.ownerKey:null;
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[revision,setRevision]=useState(0);
 const reload=useCallback(()=>{setSnapshot(null);setRevision(x=>x+1);},[]);
 useEffect(()=>{
  if(!owner){setSnapshot(null);return;}
  const controller=new AbortController();setSnapshot({owner,phase:'loading',model:null});
  void(async()=>{try{
   const response=await fetch(originalMemberProgressPath,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});controller.signal.throwIfAborted();
   if(response.status===401){invalidate();setSnapshot({owner,phase:'session',model:null});return;}
   if(response.status===403){setSnapshot({owner,phase:'permission',model:null});return;}
   if(!response.ok)throw new Error('unavailable');
   const model=schema.parse(await response.json());controller.signal.throwIfAborted();setSnapshot({owner,phase:'ready',model});
  }catch{if(!controller.signal.aborted)setSnapshot({owner,phase:'unavailable',model:null});}})();
  return()=>controller.abort();
 },[owner,revision,invalidate]);
 // Select synchronously by the current owner, before an effect can run.
 const current=snapshot?.owner===owner?snapshot:null;
 return {model:current?.model??null,phase:owner?current?.phase??'loading':'access',reload,owner};
}
export type MemberProgressData=ReturnType<typeof useMemberProgress>;
