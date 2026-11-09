import type {ProductWorld,Entity,ActionContext} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
import {privacyState} from './privacyOverview.ts';

export type FitnessMediaBrief={draftId:string;title:string;note:string;sample:'photo'|'video';capturedAt:string;retentionUntil:string};
export type FitnessMedia=Entity&{kind:'fitness-media-preview';version:number;brief:FitnessMediaBrief;state:'pending-scan'|'private'|'quarantined'|'deletion-requested'|'deleted';scanOutcome:'pending'|'unknown'|'clear-example'|'quarantined-example';creationSnapshot:string;deleteAttemptId?:string;deleteOutcome?:'pending'|'unknown'|'confirmed-example';synthetic:true;privateByDefault:true;history:{version:number;state:string;action:string;at:number}[]};
export const trainerExample={id:'fitness-assigned-trainer-example',name:'Your example trainer',authority:'Explicit local assignment example · no real trainer account'} as const;
const mediaKind='fitness-media-preview';
function iso(s:unknown):s is string{return typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?Z$/.test(s)&&Number.isFinite(Date.parse(s));}
export function fitnessMediaBrief(input:FitnessMediaBrief){
 if(!input||Object.keys(input).some(k=>!['draftId','title','note','sample','capturedAt','retentionUntil'].includes(k))||typeof input.draftId!=='string'||input.draftId.length<8||input.draftId.length>160||typeof input.title!=='string'||!input.title.trim()||input.title.length>160||typeof input.note!=='string'||input.note.length>2000||!['photo','video'].includes(input.sample)||!iso(input.capturedAt)||!iso(input.retentionUntil)||Date.parse(input.retentionUntil)<=Date.parse(input.capturedAt))throw Error('Review a named photo or video example, its capture time and a later retention time.');
 return {...input,title:input.title.trim(),note:input.note.trim()};
}
export const fitnessMediaSnapshot=(brief:FitnessMediaBrief)=>JSON.stringify(fitnessMediaBrief(brief));
function unique(w:ProductWorld,id:string){return w.objects.filter(o=>o.id===id).length===1;}
function valid(o:Entity){try{return Boolean(fitnessMediaBrief(o.brief as FitnessMediaBrief))&&o.synthetic===true&&o.privateByDefault===true&&Number.isSafeInteger(o.version)&&Number(o.version)>0&&['pending-scan','private','quarantined','deletion-requested','deleted'].includes(String(o.state))&&['pending','unknown','clear-example','quarantined-example'].includes(String(o.scanOutcome))&&Array.isArray(o.history)&&o.history.length>0&&o.history.every(h=>Number.isSafeInteger(h.version)&&Number.isFinite(h.at)&&typeof h.action==='string'&&typeof h.state==='string');}catch{return false;}}
export const ownFitnessMedia=(w:ProductWorld):FitnessMedia[]=>w.identity.signedIn?w.objects.filter((o):o is FitnessMedia=>o.owner===w.owner&&o.kind===mediaKind&&unique(w,o.id)&&valid(o)):[];
export function fitnessMediaAccess(w:ProductWorld,id:string,now=Date.now()){
 const media=ownFitnessMedia(w).find(o=>o.id===id);if(!media)return {media:undefined,viewable:false,expired:false,grants:[] as Entity[]};
 const expired=Date.parse(media.brief.retentionUntil)<=now;
 const viewable=media.state==='private'&&media.scanOutcome==='clear-example'&&!expired;
 const grants=w.identity.signedIn?w.objects.filter(o=>o.owner===w.owner&&o.kind==='permission'&&o.fitnessMediaId===id&&o.fitnessMediaVersion===media.version&&o.fitnessTrainerId===trainerExample.id&&o.recipient===trainerExample.name&&o.exampleOnly===true&&unique(w,o.id)&&typeof o.startsAt==='number'&&Number.isFinite(o.startsAt)&&typeof o.expiresAt==='number'&&Number.isFinite(o.expiresAt)&&o.expiresAt<=Date.parse(media.brief.retentionUntil)&&privacyState(o,now)==='Current'&&o.purpose==='progress-review'&&o.dataType==='progress-media · this exact example only'):[];
 return {media,expired,viewable,grants:viewable?grants:[]};
}
export function ownFitnessMediaPermissions(w:ProductWorld,id:string){return w.identity.signedIn?w.objects.filter(o=>o.owner===w.owner&&o.kind==='permission'&&o.fitnessMediaId===id&&o.exampleOnly===true&&unique(w,o.id)):[];}
export function fitnessMediaGrantSnapshot(w:ProductWorld,id:string,version:string,expiresAt:string){
 const {media,viewable}=fitnessMediaAccess(w,id);if(!media||!viewable||String(media.version)!==version)throw Error('Review your current private, clear and unexpired media original first.');
 if(!iso(expiresAt)||Date.parse(expiresAt)<=Date.now()||Date.parse(expiresAt)>Date.parse(media.brief.retentionUntil))throw Error('Choose a future grant expiry within this media’s retention period.');
 return JSON.stringify({id,version,recipient:trainerExample.id,purpose:'progress-review',dataClasses:['progress-media'],expiresAt});
}
export function applyFitnessMedia(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('fitness.media.'))return null;
 if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Sign in to your own private progress media.');
 const now=Date.now();let next=w,id=ctx.objectId||'',message='';
 if(op==='fitness.media.save'){
  const brief=fitnessMediaBrief(JSON.parse(data.brief||'null'));
  if(data.approved!=='Yes'||data.snapshot!==fitnessMediaSnapshot(brief))throw Error('Review this exact private example before saving.');
  const prior=w.objects.filter(o=>o.owner===w.owner&&o.kind===mediaKind&&(o.brief as FitnessMediaBrief)?.draftId===brief.draftId);
  if(prior.length){const original=ownFitnessMedia(w).find(o=>o.id===prior[0].id);if(prior.length!==1||!original||original.creationSnapshot!==data.snapshot)throw Error('This saved media intent changed or needs review. Keep its original; do not create a duplicate.');return {ok:true,world:w,objectId:original.id,message:'Opened the same private media example.'};}
  if(Date.parse(brief.capturedAt)>now+60_000||Date.parse(brief.retentionUntil)<=now)throw Error('Use an observed capture time and a retention time that has not passed.');
  id=localPreviewId();if(w.objects.some(o=>o.id===id))throw Error('The original reference conflicts. No example was created.');
  const media:FitnessMedia={id,owner:w.owner,kind:mediaKind,version:1,brief,state:'pending-scan',scanOutcome:'pending',creationSnapshot:data.snapshot,synthetic:true,privateByDefault:true,history:[{version:1,state:'pending-scan',action:'Saved private local example; no upload or scan executed',at:now}]};
  next={...w,objects:[...w.objects,media]};message='Private example saved. Its scan is pending; no file was uploaded.';
 }else{
  const current=ownFitnessMedia(w).find(o=>o.id===id);if(!current)throw Error('This own media original is missing or needs review.');
  if(data.version!==String(current.version)||data.approved!=='Yes')throw Error('Review the current original and confirm this separate action.');
  if(op==='fitness.media.grant'){
   if(data.snapshot!==fitnessMediaGrantSnapshot(w,id,data.version,data.expiresAt))throw Error('The selected recipient, purpose or validity changed. Review this grant again.');
   if(ownFitnessMediaPermissions(w,id).some(o=>o.fitnessMediaVersion===current.version&&privacyState(o,now)==='Current'))throw Error('This exact example already has a current grant. Review or revoke the original first.');
   const permission:Entity={id:localPreviewId(),owner:w.owner,kind:'permission',name:'Private progress media review · example',recipient:trainerExample.name,purpose:'progress-review',dataType:'progress-media · this exact example only',scope:'One exact private local media example; no goals, measurements, nutrition or workout logs',status:'active',startsAt:now,expiresAt:Date.parse(data.expiresAt),version:1,fitnessMediaId:id,fitnessMediaVersion:current.version,fitnessTrainerId:trainerExample.id,exampleOnly:true,automaticMemory:false,recording:false,transcription:false};
   if(w.objects.some(o=>o.id===permission.id))throw Error('Conflicting grant reference; nothing was shared.');next={...w,objects:[...w.objects,permission]};message='One limited local grant example saved in Permissions. No trainer received media.';
  }else{
   const media=structuredClone(current);
   if(op==='fitness.media.scan'){
    if(media.state!=='pending-scan'||Date.parse(media.brief.retentionUntil)<=now)throw Error('Only the current, unexpired pending example can review a scan outcome.');
    if(!['clear-example','quarantined-example','unknown'].includes(data.outcome))throw Error('Choose one explicitly fictional scan outcome.');
    media.scanOutcome=data.outcome as FitnessMedia['scanOutcome'];media.state=data.outcome==='clear-example'?'private':data.outcome==='quarantined-example'?'quarantined':'pending-scan';message=data.outcome==='unknown'?'Scan outcome remains unknown. Check this same original; no repeat upload.':'Fictional scan outcome recorded; no real malware scan was performed.';
   }else if(op==='fitness.media.delete-request'){
    if(['deleted','deletion-requested'].includes(media.state))throw Error('Keep the existing deletion result or unknown original; do not create another request.');
    media.state='deletion-requested';media.deleteAttemptId=localPreviewId();media.deleteOutcome='pending';message='Local deletion review requested. Access is held; deletion from any provider is not confirmed.';
   }else if(op==='fitness.media.delete-result'){
    if(media.state!=='deletion-requested'||data.attemptId!==media.deleteAttemptId||!['unknown','confirmed-example'].includes(data.outcome))throw Error('Check this exact pending deletion attempt.');
    media.deleteOutcome=data.outcome as FitnessMedia['deleteOutcome'];if(data.outcome==='confirmed-example')media.state='deleted';message=data.outcome==='unknown'?'Deletion outcome unknown. Its same attempt and history are retained.':'Deletion confirmed in the local example only; no remote erasure is claimed.';
   }else throw Error('Use a supported original media action.');
   media.version++;media.history.push({version:media.version,state:media.state,action:message,at:now});next={...w,objects:w.objects.map(o=>o.id===id&&o.owner===w.owner?media:o)};
  }
 }
 // The existing product command dispatcher commits its cloned input world.
 // Keep that one authority; a returned replacement world would be ignored.
 if(next!==w)w.objects=next.objects;
 return {ok:true,world:w,objectId:id,message};
}
