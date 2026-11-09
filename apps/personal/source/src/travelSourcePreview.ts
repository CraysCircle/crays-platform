import type {ProductWorld,ActionContext,Entity} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
import {catalogueCurrencyDigits,cataloguePriceUnits} from './venueCatalogue.ts';
import {travelDemoOptions,type TravelComparisonDraft,type TravelOption} from './travelComparisons.ts';
import {travelSourceAccess,validTimestamp} from './travelSourceAccess.ts';
export type TravelSourceScenario='offers'|'empty'|'failed'|'expired';
export type TravelSourcePreview=Entity&{kind:'travel-source-preview';providerId:string;sourceSnapshot:string;criteriaSnapshot:string;outcome:TravelSourceScenario;options:TravelOption[];issuedAt:string;expiresAt:string;platformAccess:'unproven';realExecution:false};
const need=(condition:unknown,message:string)=>{if(!condition)throw Error(message);};
const keys=['name','kind','origin','destination','startDate','endDate','travellers','criteria','currency','budgetLimit'] as const;
export function sourceCriteriaSnapshot(draft:TravelComparisonDraft){return JSON.stringify(Object.fromEntries(keys.map(key=>[key,draft[key]])));}
export function travelSourcePreviewFor(w:ProductWorld,id:string):TravelSourcePreview|undefined{return w.identity.signedIn?w.objects.find(o=>o.id===id&&o.owner===w.owner&&o.kind==='travel-source-preview') as TravelSourcePreview|undefined:undefined;}
function validateCriteria(draft:TravelComparisonDraft){
 need(draft&&typeof draft==='object'&&!Array.isArray(draft),'Review the actual comparison criteria.');
 for(const key of keys)need(typeof draft[key]==='string'&&draft[key].length<=(key==='criteria'?4000:1000),`Review ${key}.`);
 need(['stay','flight','rail'].includes(draft.kind)&&draft.name.trim()&&draft.destination.trim()&&(draft.kind==='stay'||draft.origin.trim()),'Choose your named comparison and exact route or destination.');
 for(const day of [draft.startDate,draft.endDate])need(/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number(day.slice(0,4))>0&&Number.isFinite(Date.parse(`${day}T12:00:00Z`))&&new Date(`${day}T12:00:00Z`).toISOString().slice(0,10)===day,'Choose real comparison dates.');
 need(draft.endDate>=draft.startDate&&/^[1-9]\d*$/.test(draft.travellers)&&Number.isSafeInteger(Number(draft.travellers))&&Number(draft.travellers)<=100000,'Review dates and traveller count.');
 need(catalogueCurrencyDigits(draft.currency)!==undefined&&(draft.budgetLimit===''||cataloguePriceUnits(draft.budgetLimit,draft.currency)!==undefined),'Choose one supported currency and an exact optional budget.');
}
export function previewBindingStatus(w:ProductWorld,artifact:TravelSourcePreview,draft?:TravelComparisonDraft,now=Date.now()){
 const current=travelSourcePreviewFor(w,artifact.id);
 if(!current)return {status:'source-unavailable',reason:'Open this own saved source preview.',ready:false,platformAccess:'unproven' as const,realExecution:false as const};
 let criteria:TravelComparisonDraft;try{criteria=JSON.parse(current.criteriaSnapshot);}catch{return {status:'source-unavailable',reason:'This recorded source has invalid criteria.',ready:false,platformAccess:'unproven' as const,realExecution:false as const};}
 const access=travelSourceAccess(w,{providerId:current.providerId,kind:criteria.kind,action:'search',snapshot:current.sourceSnapshot},now);
 if(!access.ready)return access;
 if(draft&&sourceCriteriaSnapshot(draft)!==current.criteriaSnapshot)return {...access,status:'query-changed',reason:'The comparison criteria changed. Prepare a new source preview for these exact details.',ready:false};
 if(!validTimestamp(current.issuedAt)||!validTimestamp(current.expiresAt)||Date.parse(current.expiresAt)<=Date.parse(current.issuedAt)||Date.parse(current.issuedAt)>now)return {...access,status:'quote-validity-required',reason:'Review the explicitly recorded scenario validity.',ready:false};
 if(Date.parse(current.expiresAt)<=now)return {...access,status:'quote-expired',reason:'The recorded scenario quote expired. Prepare a fresh preview before booking.',ready:false};
 if(current.outcome==='empty'||current.outcome==='failed')return {...access,status:current.outcome,reason:current.outcome==='empty'?'This explicit scenario returned no options. Your criteria remain saved.':'This explicit source scenario failed. No provider action or booking occurred.',ready:false};
 return access;
}
export function applyTravelSourcePreview(w:ProductWorld,op:string,data:Record<string,string>,_ctx:ActionContext,now=Date.now()){
 if(!op.startsWith('complete.travel-source.'))return;
 need(op==='complete.travel-source.preview','Choose a supported source-preview action.');
 let draft:TravelComparisonDraft;try{draft=JSON.parse(data.draft);}catch{throw Error('Review the actual comparison criteria.');}validateCriteria(draft);
 const access=travelSourceAccess(w,{providerId:data.providerId,kind:draft.kind,action:'search',snapshot:data.accessSnapshot},now);need(access.ready,access.reason);need(data.approved==='Yes'&&data.accessSnapshot===access.snapshotJSON,'Review this exact account and local source scenario.');
 need(['offers','empty','failed','expired'].includes(data.scenario),'Choose an explicit fictional source outcome.');
 need(validTimestamp(data.observedAt)&&validTimestamp(data.expiresAt)&&Date.parse(data.observedAt)<=now&&Date.parse(data.expiresAt)>Date.parse(data.observedAt),'Record the scenario observation and explicit valid-until time.');
 need(data.scenario==='expired'?Date.parse(data.expiresAt)<=now:Date.parse(data.expiresAt)>now,'Keep the explicit scenario and its validity consistent.');
 const outcome=data.scenario as TravelSourceScenario,criteriaSnapshot=sourceCriteriaSnapshot(draft);
 const fingerprint=JSON.stringify({providerId:data.providerId,sourceSnapshot:access.snapshotJSON,criteriaSnapshot,outcome,issuedAt:data.observedAt,expiresAt:data.expiresAt});
 const existing=w.objects.find(o=>o.owner===w.owner&&o.kind==='travel-source-preview'&&o.creationFingerprint===fingerprint);if(existing)return {objectId:existing.id,message:'This exact immutable source scenario already exists. No provider request was repeated.'};
 const options=['offers','expired'].includes(outcome)?travelDemoOptions(draft).map(option=>({...option,provider:`FICTIONAL ${data.providerId} preview; not a provider offer`,observedAt:data.observedAt})):[];
 const id=localPreviewId();w.objects.unshift({id,owner:w.owner,kind:'travel-source-preview',name:`Fictional ${data.providerId} source preview`,providerId:data.providerId,sourceSnapshot:access.snapshotJSON,criteriaSnapshot,outcome,options,issuedAt:data.observedAt,expiresAt:data.expiresAt,creationFingerprint:fingerprint,platformAccess:'unproven',realExecution:false,createdAt:now});
 return {objectId:id,message:'Explicit fictional source outcome recorded. No provider search, booking, payment or account access occurred.'};
}
