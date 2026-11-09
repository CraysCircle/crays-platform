import type {Entity,ProductWorld} from './productModel.ts';
import {canDirectMessage} from './communicationPolicy.ts';

/** Selective disclosure projection; only complete.assessment.share/unshare creates or revokes authority. */
export const assessmentDisclosureFields=[{id:'result',label:'Result or reflection'},{id:'instrument',label:'Instrument'},{id:'source',label:'Source'},{id:'instrumentVersion',label:'Instrument version'},{id:'language',label:'Language'}] as const;
export const assessmentDisclosurePurposes=['Business','Socializing','Dating'] as const;
export type AssessmentDisclosurePurpose=typeof assessmentDisclosurePurposes[number];
export type AssessmentDisclosureField=typeof assessmentDisclosureFields[number]['id'];
const serial=(v:unknown)=>JSON.stringify(v);
function need(v:unknown,message:string):asserts v{if(!v)throw Error(message);}
function unique(w:ProductWorld,id:string){const rows=w.objects.filter(o=>o.id===id);return rows.length===1?rows[0]:undefined;}
function result(w:ProductWorld,id:string,owner:string){const r=unique(w,id);if(!r||r.kind!=='assessment'||r.owner!==owner||!Number.isSafeInteger(r.version)||Number(r.version)<1||!['self-reported-not-validated','validated-example','imported-not-validated'].includes(String(r.status)))return;return r;}
export function assessmentDisclosureContact(w:ProductWorld,id:string){return w.identity.signedIn&&id!==w.owner&&w.people.filter(p=>p.id===id).length===1&&canDirectMessage(w,id);}
function fieldList(fields:unknown):fields is AssessmentDisclosureField[]{return Array.isArray(fields)&&fields.length>0&&fields.length<=assessmentDisclosureFields.length&&new Set(fields).size===fields.length&&fields.every(f=>assessmentDisclosureFields.some(allowed=>allowed.id===f));}
function selectedSnapshot(r:Entity,fields:AssessmentDisclosureField[]){const out:Record<string,string>={};for(const f of fields){const v=r[f]??'Not supplied';if(typeof v!=='string'||v.length>6000)return;out[f]=v;}return out;}
export function assessmentDisclosureReview(w:ProductWorld,assessmentId:string,recipient:string,purpose:string,fields:unknown,expires:string,now=Date.now()){
 need(w.identity.signedIn,'Sign in to review your private result.');const r=result(w,assessmentId,w.owner);need(r,'Choose your own current available assessment version.');need(assessmentDisclosureContact(w,recipient),'Choose a current mutually accepted VIF.');need(assessmentDisclosurePurposes.some(p=>p===purpose),'Choose one explicit sharing purpose.');need(fieldList(fields),'Choose distinct permitted fields only.');const expiry=Date.parse(expires);need(Number.isSafeInteger(expiry)&&expiry>now&&new Date(expiry).toISOString()===expires,'Choose an exact future permission expiry.');const snapshot=selectedSnapshot(r,fields);need(snapshot,'Review the original selected values; private structured data cannot be disclosed.');
 return serial({source:'assessment-disclosure-review-v1',owner:w.owner,resultId:r.id,version:r.version,assessmentStatus:r.status,recipient,purpose,fields:[...fields],snapshot,expiresAt:expiry,matching:false});
}
export type SharedAssessmentInsight={grantId:string;resultId:string;version:number;assessmentStatus:string;purpose:AssessmentDisclosurePurpose;expiresAt:number;fields:{id:AssessmentDisclosureField;label:string;value:string}[]};
function projection(w:ProductWorld,g:Entity,owner:string,recipient:string,purpose:AssessmentDisclosurePurpose,now:number):SharedAssessmentInsight|undefined{
 if(unique(w,g.id)!==g||g.kind!=='assessment-permission'||g.owner!==owner||g.recipient!==recipient||g.use!=='disclosure'||g.status!=='active'||g.matching!==false||!Array.isArray(g.purposes)||g.purposes.length!==1||g.purposes[0]!==purpose||!fieldList(g.fields)||!Number.isSafeInteger(g.expiresAt)||Number(g.expiresAt)<=now||typeof g.resultId!=='string')return;
 const r=result(w,g.resultId,owner);if(!r||g.version!==r.version||g.assessmentStatus!==r.status)return;const selected=selectedSnapshot(r,g.fields);if(!selected||!g.snapshot||typeof g.snapshot!=='object'||Array.isArray(g.snapshot))return;const keys=Object.keys(g.snapshot).sort();if(serial(keys)!==serial([...g.fields].sort()))return;const snapshot=g.snapshot as Record<string,unknown>;if(g.fields.some(f=>snapshot[f]!==selected[f]))return;
 return {grantId:g.id,resultId:r.id,version:Number(r.version),assessmentStatus:String(r.status),purpose,expiresAt:Number(g.expiresAt),fields:g.fields.map(id=>({id,label:assessmentDisclosureFields.find(f=>f.id===id)!.label,value:selected[id]}))};
}
export function sharedAssessmentInsights(w:ProductWorld,personId:string,purpose:AssessmentDisclosurePurpose,now=Date.now()):SharedAssessmentInsight[]{
 if(!assessmentDisclosureContact(w,personId)||!assessmentDisclosurePurposes.includes(purpose)||!Number.isFinite(now))return [];
 return w.objects.filter(g=>g.owner===personId&&g.recipient===w.owner).map(g=>projection(w,g,personId,w.owner,purpose,now)).filter((p):p is SharedAssessmentInsight=>!!p);
}
export function outgoingAssessmentDisclosures(w:ProductWorld,assessmentId:string,now=Date.now()){
 if(!w.identity.signedIn)return [];
 return w.objects.filter(g=>g.owner===w.owner&&g.kind==='assessment-permission'&&g.use==='disclosure'&&g.resultId===assessmentId&&unique(w,g.id)===g).map(g=>{const purposes=g.purposes,purpose=Array.isArray(purposes)&&purposes.length===1&&assessmentDisclosurePurposes.includes(purposes[0] as AssessmentDisclosurePurpose)?purposes[0] as AssessmentDisclosurePurpose:undefined;const qualified=typeof g.recipient==='string'&&purpose&&assessmentDisclosureContact(w,g.recipient)?projection(w,g,w.owner,g.recipient,purpose,now):undefined;return {id:g.id,recipient:typeof g.recipient==='string'?g.recipient:'',purpose:purpose||'Unverified purpose',fields:fieldList(g.fields)?g.fields.map(id=>assessmentDisclosureFields.find(f=>f.id===id)!.label):[],expiresAt:Number.isSafeInteger(g.expiresAt)?Number(g.expiresAt):NaN,status:g.status==='revoked'?'revoked':Number(g.expiresAt)<=now?'expired':qualified?'active':'needs-review',canRevoke:g.status==='active'};});
}
