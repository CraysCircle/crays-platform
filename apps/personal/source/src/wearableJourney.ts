import type {ActionContext, Entity, ProductWorld} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';

export const wearableClasses = ['ACTIVITY','WORKOUT','SLEEP','HEART_RATE','HRV','BODY','GPS','HIGH_SENSITIVITY'] as const;
export type WearableClass = typeof wearableClasses[number];
export const wearableClassLabels: Record<WearableClass,string> = {ACTIVITY:'Activity',WORKOUT:'Workouts',SLEEP:'Sleep',HEART_RATE:'Heart rate',HRV:'Heart-rate variability',BODY:'Body measurements',GPS:'Routes & location',HIGH_SENSITIVITY:'Sensitive health data'};
export const wearableProviders = ['Apple Health','Health Connect','Garmin','Oura','WHOOP','Polar','Withings','Technogym','EGYM','Eight Sleep','Dexcom'] as const;
export type WearableConsent = {classes:WearableClass[]; purpose:'HEALTH_OVERVIEW'|'WORKOUT_READ'; days:30|90|365};
export type WearableObservation = {id:string; version:number; label:string; value:number|null; unit:string; dataClass:WearableClass; method:string; kind:'measurement'|'provider-score'; observedAt:number; syncedAt:number; coverage:string; state:'ACTIVE'|'EXCLUDED'|'DELETED'|'QUARANTINED'; seriesKey?:string; sourceLabel?:string; quality?:'VALUE'|'PARTIAL'|'STALE'|'UNKNOWN'|'BLOCKED'; calibration?:string; baseline?:{value:number;unit:string;window:string}; contributors?:{observationId:string;label:string;value:number|null;unit:string;quality:string}[]; limitations?:string};
export type WearableJob = {id:string; type:'sync'|'backfill'|'export'|'delete'; status:'queued'|'processing'|'unknown'|'failed'|'ready'|'confirmed'|'expired'; at:number; consentVersion:number; expiresAt?:number};
export type WearableConnection = Entity & {kind:'wearable-connection-preview'; exampleOnly:true; provider:string; version:number; status:'connected-preview'|'disconnected'; osGrant:boolean; consent:WearableConsent|null; consentVersion:number; expiresAt:number; observations:WearableObservation[]; jobs:WearableJob[]; history:{at:number; event:string; version:number}[]};
export type WearableReview = Entity & {kind:'wearable-review-preview'; exampleOnly:true; connectionId:string; connectionVersion:number; consentVersion:number; expiresAt:number; observationIds:string[]; excerpt:string; request:string};
export const ownWearables = (w:ProductWorld):WearableConnection[] => w.identity.signedIn ? w.objects.filter((o):o is WearableConnection=>o.kind==='wearable-connection-preview'&&o.owner===w.owner&&o.exampleOnly===true&&w.objects.filter(x=>x.id===o.id).length===1) : [];
export const wearableReadable = (c:WearableConnection,now=Date.now()) => c.status==='connected-preview'&&c.osGrant&&!!c.consent&&c.expiresAt>now;
export function wearableConsent(input:WearableConsent):WearableConsent {
  if(!input||!['HEALTH_OVERVIEW','WORKOUT_READ'].includes(input.purpose)||![30,90,365].includes(input.days)||!Array.isArray(input.classes)||!input.classes.length||input.classes.some(c=>!wearableClasses.includes(c))||new Set(input.classes).size!==input.classes.length) throw Error('Choose a purpose, data categories and a 30, 90 or 365 day period.');
  if(input.purpose==='WORKOUT_READ'&&input.classes.some(c=>!['WORKOUT','ACTIVITY','HEART_RATE','GPS'].includes(c))) throw Error('This workout purpose does not cover the other selected health categories.');
  return {...input,classes:wearableClasses.filter(c=>input.classes.includes(c))};
}
export const wearableConsentSnapshot = (provider:string,consent:WearableConsent) => JSON.stringify({provider,consent:wearableConsent(consent)});
function examples(now:number):WearableObservation[] {
  return [
    {id:'steps',label:'Steps',value:6840,unit:'steps',dataClass:'ACTIVITY',method:'Fictional device step count',kind:'measurement',coverage:'One example day; no trend'},
    {id:'sleep',label:'Time asleep',value:7.2,unit:'hours',dataClass:'SLEEP',method:'Fictional sleep-window estimate',kind:'measurement',coverage:'One example night; not sleep quality'},
    {id:'resting-heart-rate',label:'Resting heart rate',value:62,unit:'bpm',dataClass:'HEART_RATE',method:'Fictional resting measurement',kind:'measurement',coverage:'One example reading; no diagnosis'},
    {id:'hrv',label:'Heart-rate variability',value:42,unit:'ms',dataClass:'HRV',method:'Fictional RMSSD, five-minute window',kind:'measurement',coverage:'Not comparable to SDNN or another method'},
    {id:'workout',label:'Workout duration',value:35,unit:'minutes',dataClass:'WORKOUT',method:'Fictional device workout interval',kind:'measurement',coverage:'Not proof of completing your training plan'},
    {id:'body',label:'Body mass',value:72,unit:'kg',dataClass:'BODY',method:'Fictional scale reading',kind:'measurement',coverage:'Not body composition or body age'},
  ].map(o=>({...o,dataClass:o.dataClass as WearableClass,kind:o.kind as 'measurement',version:1,observedAt:now-3600000,syncedAt:now,state:'ACTIVE' as const}));
}
export function wearableValueUsable(o:WearableObservation):boolean {
 return o.state==='ACTIVE'&&o.value!==null&&Number.isFinite(o.value)&&(!o.quality||['VALUE','PARTIAL'].includes(o.quality));
}
// Supplied fixture values, never a real provider response or a proprietary score calculation.
export function wearableMultiDayExamples(now:number):WearableObservation[] {
 const midnight=Date.parse(new Date(now).toISOString().slice(0,10)+'T00:00:00Z');
 const nights:(number|null)[]=[7.1,6.8,null,7.4,null,7.2,7.6];
 const rows:WearableObservation[]=nights.map((value,i)=>({id:`fictional-sleep-night-${i}`,version:1,label:`Time asleep · example night ${i+1}`,value,unit:'hours',dataClass:'SLEEP',method:'Fictional source sleep-window estimate v1',kind:'measurement',observedAt:Math.min(midnight-(6-i)*86400000+6*3600000,now),syncedAt:now,coverage:value===null?'No usable reading supplied for this night':'One supplied fictional night; sensor completeness is unverified',state:'ACTIVE',seriesKey:'fictional-sleep-v1',sourceLabel:'CRAYS fictional source simulator v1 · not the selected device provider',quality:i===2?'UNKNOWN':i===4?'BLOCKED':i===0?'STALE':i===1?'PARTIAL':'VALUE',calibration:'4 of 7 example nights usable; personal baseline not calibrated',baseline:{value:7,unit:'hours',window:'Separate supplied fictional comparison window; not a calculated personal baseline'},limitations:'Illustrative sleep estimates only; missing and blocked nights cannot be inferred.'}));
 rows.push({id:'fictional-source-sleep-score',version:1,label:'Sleep score · fictional provider-style example',value:72,unit:'points / 100',dataClass:'SLEEP',method:'Supplied fictional source score v1; formula not supplied',kind:'provider-score',observedAt:Math.min(midnight+6*3600000,now),syncedAt:now,coverage:'One supplied score; no multi-day score trend',state:'ACTIVE',sourceLabel:'CRAYS fictional source simulator v1 · not an Apple, Oura or other actual provider score',quality:'VALUE',calibration:'Fictional source marks this score available; no clinical validation',contributors:[{observationId:'fictional-sleep-night-6',label:'Source-supplied sleep duration contributor',value:7.6,unit:'hours',quality:'VALUE'}],limitations:'72 is supplied as design data. CRAYS does not compute it from the contributor and cannot reconstruct or validate a proprietary formula. No diagnosis, readiness advice or trainer permission follows.'});
 return rows;
}
export function wearableReviewable(c:WearableConnection,o:WearableObservation):boolean {
 return wearableValueUsable(o)&&Boolean(c.consent?.classes.includes(o.dataClass))&&(!o.contributors||o.contributors.every(x=>{const source=c.observations.filter(row=>row.id===x.observationId);return source.length===1&&wearableValueUsable(source[0])&&Boolean(c.consent?.classes.includes(source[0].dataClass));}));
}
export function wearableOverview(c:WearableConnection,period:'day'|'week'|'month',now=Date.now()) {
 const start=new Date(now);start.setUTCHours(0,0,0,0);if(period==='week')start.setUTCDate(start.getUTCDate()-6);if(period==='month')start.setUTCDate(start.getUTCDate()-27);
 const end=new Date(now);end.setUTCHours(23,59,59,999);
 const rows=c.observations.filter(o=>!['DELETED','QUARANTINED'].includes(o.state)&&c.consent?.classes.includes(o.dataClass)&&o.observedAt>=+start&&o.observedAt<=+end);
 const series=Array.from(new Set(rows.filter(o=>o.seriesKey&&o.kind==='measurement').map(o=>o.seriesKey!))).map(key=>{const points=rows.filter(o=>o.seriesKey===key).sort((a,b)=>a.observedAt-b.observedAt),first=points[0],same=points.every(o=>o.method===first.method&&o.unit===first.unit&&o.sourceLabel===first.sourceLabel&&o.kind===first.kind),usable=same?points.filter(wearableValueUsable):[],a=usable[0],b=usable.at(-1);return {key,points,usable:usable.length,days:period==='day'?1:period==='week'?7:28,delta:usable.length>1?Number((b!.value!-a.value!).toFixed(3)):null,unit:first.unit,source:first.sourceLabel,method:first.method,comparable:same};});
 return {start:+start,end:+end,rows,series,timezone:'UTC'};
}
export function wearableReviewSnapshot(w:ProductWorld,connectionId:string,ids:string[],request:string,now=Date.now()) {
  const c=ownWearables(w).find(c=>c.id===connectionId);
  if(!c||!wearableReadable(c,now))throw Error('Review a current device and unexpired purpose permission first.');
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||typeof request!=='string'||!request.trim()||request.length>2000)throw Error('Select readings and tell Chuck what you want to understand.');
  const rows=ids.map(id=>{const matches=c.observations.filter(o=>o.id===id);return matches.length===1?matches[0]:undefined;});
  if(rows.some(o=>!o||!wearableReviewable(c,o)))throw Error('A selected reading is unavailable or no longer permitted.');
  const excerpt=['Fictional wearable example, not my actual health data.',`Source: ${c.provider}. Purpose: ${c.consent!.purpose==='HEALTH_OVERVIEW'?'My private health overview':'Read my workout activity'}.`,...rows.map(o=>`${o!.label}: ${o!.value} ${o!.unit}; ${o!.kind}; ${o!.sourceLabel||c.provider}; ${o!.method}; observed ${new Date(o!.observedAt).toISOString()}; quality ${o!.quality||'VALUE'}; ${o!.coverage}; calibration ${o!.calibration||'not supplied'}; ${o!.limitations||'No additional source limitations supplied'}${o!.contributors?'; supplied contributors: '+o!.contributors.map(x=>`${x.label}: ${x.value===null?'not available':x.value} ${x.unit}; ${x.quality}; original ${x.observationId}`).join(' | '):''}.`)].join('\n');
  return {snapshot:JSON.stringify({connectionId,version:c.version,consentVersion:c.consentVersion,readings:rows,request:request.trim()}),excerpt,request:request.trim(),ids:[...ids]};
}
export function currentWearableReview(w:ProductWorld,id:string,now=Date.now()):WearableReview|undefined {
  if(!w.identity.signedIn||w.objects.filter(o=>o.id===id).length!==1)return;
  const r=w.objects.find(o=>o.id===id&&o.owner===w.owner&&o.kind==='wearable-review-preview') as WearableReview|undefined;
  const c=r&&ownWearables(w).find(c=>c.id===r.connectionId);
  if(!r||!c||!wearableReadable(c,now)||r.expiresAt<=now||c.version!==r.connectionVersion||c.consentVersion!==r.consentVersion)return;
  return r;
}
export function wearableExport(w:ProductWorld,connectionId:string,jobId:string,now=Date.now()) {
  const c=ownWearables(w).find(c=>c.id===connectionId),job=c?.jobs.find(j=>j.id===jobId&&j.type==='export');
  if(!c||!job||job.status!=='ready'||!job.expiresAt||job.expiresAt<=now)throw Error('This own example export is unavailable or expired.');
  if(c.jobs.some(j=>j.type==='delete'&&j.status!=='failed'))throw Error('Deletion is pending or confirmed. This earlier export is no longer available here.');
  return {exampleOnly:true,provider:c.provider,denomination:'No financial data',exportedAt:new Date(now).toISOString(),readings:c.observations.filter(o=>!['DELETED','QUARANTINED'].includes(o.state)),limits:'Normalized fictional readings only. No credentials, provider raw archive, health diagnosis or actual member data.'};
}
export function applyWearableJourney(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null {
  if(!op.startsWith('wearable.preview.'))return null;
  if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Sign in to your own private wearable workspace.');
  const connections=ownWearables(w);let c=connections.find(c=>c.id===ctx.objectId);
  if(ctx.objectId&&!c)throw Error('This device original is unavailable to your account.');
  const approved=()=>{if(data.approved!=='Yes')throw Error('Review and confirm this exact action first.');};
  const change=(event:string)=>{c!.version++;c!.history.push({at:now,event,version:c!.version});};
  if(op==='wearable.preview.connect') {
    approved();if(!wearableProviders.includes(data.provider as typeof wearableProviders[number])||data.osGrant!=='Yes')throw Error('Choose a planned provider and separately review the simulated OS/provider grant.');
    const consent=wearableConsent(JSON.parse(data.consent));
    if(data.snapshot!==wearableConsentSnapshot(data.provider,consent))throw Error('The reviewed permission selection changed.');
    if(c&&data.version!==String(c.version))throw Error('This device changed. Review its latest state.');
    if(!c&&connections.some(x=>x.provider===data.provider))throw Error('Review the existing device, including its revoked permissions, instead of creating a duplicate.');
    if(c&&c.provider!==data.provider)throw Error('Keep this original provider identity.');
    if(!c){c={id:localPreviewId(),owner:w.owner,kind:'wearable-connection-preview',exampleOnly:true,provider:data.provider,version:0,status:'disconnected',osGrant:false,consent:null,consentVersion:0,expiresAt:0,observations:[],jobs:[],history:[]};w.objects.push(c);}
    c.status='connected-preview';c.osGrant=true;c.consent=consent;c.consentVersion++;c.expiresAt=now+consent.days*86400000;
    // Reconnection is explicit and never revives readings erased by the user.
    change('Reviewed example connection and new purpose consent');return {objectId:c.id,message:'Example connection saved. No OS access or provider connection was made.'};
  }
  if(!c)throw Error('Open your own existing device first.');
  if(data.version!==String(c.version))throw Error('This device or permission changed. Reopen its latest original.');
  if(op==='wearable.preview.disconnect'||op==='wearable.preview.revoke') {
    approved();c.consent=null;c.consentVersion++;c.expiresAt=0;if(op.endsWith('disconnect')){c.osGrant=false;c.status='disconnected';}
    change(op.endsWith('disconnect')?'Disconnected example provider; purpose revoked':'Revoked example purpose consent');return {objectId:c.id,message:'Future reads and Chuck handoffs are stopped. Export and deletion remain separate; previous external copies cannot be recalled.'};
  }
  if(op==='wearable.preview.observation') {
    approved();const o=c.observations.find(o=>o.id===data.observationId);
    if(!o||data.observationVersion!==String(o.version)||!(data.action==='exclude'&&o.state==='ACTIVE'||data.action==='undo'&&o.state==='EXCLUDED'))throw Error('Only the current active/excluded reading can be changed. Deleted or quarantined readings cannot be restored here.');
    o.state=data.action==='exclude'?'EXCLUDED':'ACTIVE';o.version++;change(`Reading ${data.action}`);return {objectId:c.id,message:'Reading selection updated. Existing reviews require a new explicit review.'};
  }
  if(op==='wearable.preview.job') {
    approved();if(!['sync','backfill','export','delete'].includes(data.type))throw Error('Choose the specific data action.');
    if(data.type==='delete'&&(data.reauthenticated!=='Yes'||data.phrase!=='DELETE EXAMPLE DATA'))throw Error('Review recent authentication and type the exact example deletion phrase.');
    if(['sync','backfill'].includes(data.type)&&!wearableReadable(c,now))throw Error('A current provider grant and purpose consent are required for a new read.');
    if(c.jobs.some(j=>j.type===data.type&&['queued','processing','unknown'].includes(j.status)))throw Error('Reconcile the same pending original request before trying another.');
    const job:WearableJob={id:localPreviewId(),type:data.type as WearableJob['type'],status:'queued',at:now,consentVersion:c.consentVersion};c.jobs.push(job);
    if(job.type==='delete'){c.consent=null;c.consentVersion++;c.expiresAt=0;}
    change(`Example ${job.type} request queued`);return {objectId:job.id,message:'Example request queued. No provider worker has executed it.'};
  }
  if(op==='wearable.preview.job.scenario') {
    approved();const job=c.jobs.find(j=>j.id===data.jobId);if(!job)throw Error('Open the same original request.');
    const transitions:Record<string,string[]>={queued:['processing','unknown','failed'],processing:['ready','confirmed','unknown','failed'],unknown:['processing','ready','confirmed','failed'],ready:['expired'],failed:[],confirmed:[],expired:[]};
    if(!transitions[job.status].includes(data.status)||data.status==='confirmed'&&job.type!=='delete'||data.status==='ready'&&job.type==='delete'||data.status==='expired'&&job.type!=='export')throw Error('This original request cannot make that transition.');
    if(['sync','backfill'].includes(job.type)&&data.status==='ready'){
      if(!wearableReadable(c,now)||job.consentVersion!==c.consentVersion)throw Error('The original read permission expired or was revoked. This response cannot import data.');
      if(data.dataset!==undefined&&data.dataset!=='single-day'&&data.dataset!=='fictional-seven-day')throw Error('Choose an explicit fictional reading dataset.');
      if(data.dataset==='fictional-seven-day'){
        const incoming=wearableMultiDayExamples(now).filter(o=>c!.consent!.classes.includes(o.dataClass));
        if(!incoming.length)throw Error('This fictional sleep dataset needs current sleep-purpose permission.');
        if(incoming.some(o=>c!.observations.some(old=>old.id===o.id)))throw Error('This exact fictional dataset already exists; retain its exclusions and deletion history.');
        c.observations.push(...incoming);
      }else if(!c.observations.length)c.observations=examples(now).filter(o=>c!.consent!.classes.includes(o.dataClass));
    }
    job.status=data.status as WearableJob['status'];if(job.type==='export'&&job.status==='ready')job.expiresAt=now+86400000;
    if(job.type==='delete'&&job.status==='confirmed'){c.observations=c.observations.map(o=>({id:o.id,version:o.version+1,dataClass:o.dataClass,state:'DELETED',label:'Deleted example reading',value:0,unit:'',method:'',kind:'measurement',observedAt:0,syncedAt:0,coverage:''}));for(const r of w.objects.filter(o=>o.owner===w.owner&&o.kind==='wearable-review-preview'&&o.connectionId===c!.id)){r.excerpt='';r.request='';r.observationIds=[];r.creationSnapshot='';}}
    change(`Explored ${job.type} outcome: ${job.status}`);return {objectId:job.id,message:'Explicit example outcome recorded on the same request. No live provider or erasure guarantee.'};
  }
  if(op==='wearable.preview.review') {
    approved();const preview=wearableReviewSnapshot(w,c.id,JSON.parse(data.ids),data.request,now);
    if(data.snapshot!==preview.snapshot)throw Error('The selected readings or request changed. Review again.');
    const prior=w.objects.filter(o=>o.owner===w.owner&&o.kind==='wearable-review-preview'&&o.connectionId===c!.id&&o.creationSnapshot===preview.snapshot);
    if(prior.length){const current=prior.length===1&&currentWearableReview(w,prior[0].id,now);if(!current)throw Error('This reviewed excerpt has a conflicting original. Reopen it rather than making another.');return {objectId:current.id,message:'Opening the same reviewed excerpt; no duplicate or message was created.'};}
    const r:WearableReview={id:localPreviewId(),owner:w.owner,kind:'wearable-review-preview',exampleOnly:true,connectionId:c.id,connectionVersion:c.version,consentVersion:c.consentVersion,expiresAt:c.expiresAt,observationIds:preview.ids,excerpt:preview.excerpt,request:preview.request,creationSnapshot:preview.snapshot};w.objects.push(r);return {objectId:r.id,message:'A private reviewed example excerpt is ready. Nothing was sent to Chuck or a feed.'};
  }
  throw Error('This wearable example action is unavailable.');
}
