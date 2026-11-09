import {sha256Hex} from './privateEpubGenerator';
import type {ProductWorld,Entity,ActionContext} from './productModel';
import {ownPrivateAccount} from './ownPrivateAccount';
import {circleAdminAuthoritySnapshot} from './circleAccess';
import {localPreviewId} from './localPreviewId';

// Local preview only. Current original Circle administration and separately
// reviewed commercial purpose are required; no live provider/Core authority.
export const registrationAnswerTypes=['text','long-text','email','phone','url','npub','agree-check','facebook','x','insta','linkedin','single-select','multi-select'] as const;
export type RegistrationQuestion={label:string;required:boolean;answerType:typeof registrationAnswerTypes[number];options?:string[]};
export type CommercialTierPayload={name:string;description:string;blurb:string;buttonText:string;registrationQuestions:{questions:RegistrationQuestion[]};isGated:boolean;isPaid:boolean;isRecommended:boolean;currency:'USD';monthlyAmount:number;yearlyAmount:number;rank:number};
export type CommercialTier=Entity&{kind:'community-commercial-tier';groupId:string;version:number;status:'published'|'withdrawn';payload:CommercialTierPayload;history:{version:number;payload:CommercialTierPayload;status:'published'|'withdrawn';at:number}[];source:'local-reviewed-commercial-preview';liveExecution:false};
type Terms=Entity&{kind:'community-commercial-terms';groupId:string;version:number;authority:string;purpose:'membership-administration';termsVersion:'commercial-preview-v1';acceptedAt:number;source:'local-reviewed-commercial-preview';liveExecution:false;events:{key:string;operation:string;payload:string;at:number}[]};
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
const unique=(w:ProductWorld,id:string)=>w.objects.filter(o=>o.id===id).length===1;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function text(v:unknown,max:number,required=false):v is string{return typeof v==='string'&&v.length<=max&&(!required||!!v.trim())&&v===v.trim();}
export function validCommercialTierPayload(v:unknown):v is CommercialTierPayload{
 if(!plain(v)||Object.keys(v).sort().join(',')!==['name','description','blurb','buttonText','registrationQuestions','isGated','isPaid','isRecommended','currency','monthlyAmount','yearlyAmount','rank'].sort().join(','))return false;
 if(!text(v.name,200,true)||!text(v.description,4000)||!text(v.blurb,100)||!text(v.buttonText,20)||!['isGated','isPaid','isRecommended'].every(k=>typeof v[k]==='boolean')||v.currency!=='USD')return false;
 if(!['monthlyAmount','yearlyAmount','rank'].every(k=>Number.isSafeInteger(v[k])&&Number(v[k])>=0)||Number(v.monthlyAmount)>100000000||Number(v.yearlyAmount)>100000000||Number(v.rank)>100000)return false;
 if(v.isPaid?Number(v.monthlyAmount)+Number(v.yearlyAmount)<=0:Number(v.monthlyAmount)!==0||Number(v.yearlyAmount)!==0)return false;
 const q=v.registrationQuestions;if(!plain(q)||Object.keys(q).join(',')!=='questions'||!Array.isArray(q.questions)||q.questions.length>20)return false;
 const labels=new Set<string>();
 for(const x of q.questions){if(!plain(x)||Object.keys(x).some(k=>!['label','required','answerType','options'].includes(k))||!text(x.label,300,true)||labels.has(x.label.toLowerCase())||typeof x.required!=='boolean'||!registrationAnswerTypes.includes(x.answerType as RegistrationQuestion['answerType']))return false;labels.add(x.label.toLowerCase());const choice=x.answerType==='single-select'||x.answerType==='multi-select';if(choice){if(!Array.isArray(x.options)||x.options.length<2||x.options.length>30||!x.options.every(o=>text(o,200,true))||new Set(x.options.map(o=>o.toLowerCase())).size!==x.options.length)return false;}else if(x.options!==undefined)return false;}
 return true;
}
function validTier(w:ProductWorld,r:Entity,groupId:string,now:number):r is CommercialTier{
 if(r.kind!=='community-commercial-tier'||r.owner!==w.owner||r.groupId!==groupId||!unique(w,r.id)||r.source!=='local-reviewed-commercial-preview'||r.liveExecution!==false||!Number.isSafeInteger(r.version)||Number(r.version)<1||!['published','withdrawn'].includes(String(r.status))||!validCommercialTierPayload(r.payload)||!Array.isArray(r.history)||r.history.length!==r.version)return false;
 return r.history.every((h:unknown,i:number)=>plain(h)&&h.version===i+1&&validCommercialTierPayload(h.payload)&&['published','withdrawn'].includes(String(h.status))&&Number.isFinite(h.at)&&Number(h.at)>0&&Number(h.at)<=now&&(i===0||Number(h.at)>=Number((r.history as {at:number}[])[i-1].at)))&&JSON.stringify(r.history[r.history.length-1].payload)===JSON.stringify(r.payload)&&r.history[r.history.length-1].status===r.status;
}
export function commercialCircle(w:ProductWorld,groupId:string,now=Date.now()){
 try{
 if(!ownPrivateAccount(w)||w.owner!=='thorben'||w.identity.destination!=='Demo account'||!Number.isFinite(now)||now<=0)return;
 const authority=circleAdminAuthoritySnapshot(w,groupId,now),groups=w.objects.filter(o=>o.id===groupId);if(!authority||groups.length!==1)return;
 const termsRows=w.objects.filter(o=>o.kind==='community-commercial-terms'&&o.groupId===groupId),tiers=w.objects.filter(o=>o.kind==='community-commercial-tier'&&o.groupId===groupId);
 if(termsRows.length>1||tiers.some(r=>!validTier(w,r,groupId,now)))return;
 let terms:Terms|undefined;
 if(termsRows.length){const t=termsRows[0] as Terms;if(t.owner!==w.owner||!unique(w,t.id)||t.source!=='local-reviewed-commercial-preview'||t.liveExecution!==false||t.purpose!=='membership-administration'||t.termsVersion!=='commercial-preview-v1'||!Number.isSafeInteger(t.version)||t.version<1||!Number.isFinite(t.acceptedAt)||t.acceptedAt<=0||t.acceptedAt>now||!Array.isArray(t.events)||t.events.some(e=>!text(e.key,200,true)||typeof e.operation!=='string'||typeof e.payload!=='string'||!Number.isFinite(e.at)||e.at<=0||e.at>now)||new Set(t.events.map(e=>e.key)).size!==t.events.length)return;terms=t;}
 const ready=terms?.authority===authority;
 return {group:groups[0],authority,terms,ready,tiers:(tiers as CommercialTier[]).sort((a,b)=>a.payload.rank-b.payload.rank||a.id.localeCompare(b.id)),currency:'USD' as const};
 }catch{return;}
}
export function commercialReview(w:ProductWorld,groupId:string,now=Date.now()){
 const c=commercialCircle(w,groupId,now);return c?'commercial-review-v1:'+sha256Hex(JSON.stringify({owner:w.owner,groupId,authority:c.authority,terms:c.terms||null,tiers:c.tiers,currency:c.currency})):'';
}
export function applyCommunityCommercial(w:ProductWorld,op:string,d:Record<string,string>,ctx:Partial<ActionContext>,now=Date.now()){
 if(!op.startsWith('community.commercial.'))return;
 const groupId=ctx.objectId||'',c=commercialCircle(w,groupId,now);need(c&&(!ctx.personId||ctx.personId===w.owner),'Review current administration of this exact original Circle.');
 need(text(d.actionKey,200,true),'Use one original action key.');const payload=JSON.stringify(d),prior=c.terms?.events.find(e=>e.key===d.actionKey);
 if(prior){need(prior.operation===op&&prior.payload===payload,'This key belongs to another original instruction.');return {objectId:groupId,message:'This original example action was already recorded.'};}
 need(d.review===commercialReview(w,groupId,now)&&d.approved==='Yes','This Circle or its commercial terms changed. Review the current original.');
 if(op==='community.commercial.terms.accept'){
  need(d.purpose==='membership-administration'&&d.termsVersion==='commercial-preview-v1','Review this separate commercial purpose.');
  if(c.terms){need(!c.ready,'These current terms are already reviewed.');c.terms.authority=c.authority;c.terms.version++;c.terms.acceptedAt=now;}
  else w.objects.push({id:localPreviewId(),owner:w.owner,kind:'community-commercial-terms',groupId,version:1,authority:c.authority,purpose:'membership-administration',termsVersion:'commercial-preview-v1',acceptedAt:now,source:'local-reviewed-commercial-preview',liveExecution:false,events:[]} as Terms);
 }else{
  need(c.ready&&c.terms,'Review the separate commercial purpose before managing offers.');
  if(op==='community.commercial.tier.create'||op==='community.commercial.tier.update'){
   let p:unknown;try{p=JSON.parse(d.payload);}catch{throw Error('Review the supported original plan fields.');}need(validCommercialTierPayload(p),'Review the name, USD amounts and registration questions.');need(!c.tiers.some(t=>t.id!==d.tierId&&t.payload.name===p.name),'This Circle already has an original plan with that name.');
   if(op.endsWith('.create')){need(!d.tierId,'A new offer needs its own original identity.');w.objects.push({id:localPreviewId(),owner:w.owner,kind:'community-commercial-tier',groupId,version:1,status:'published',payload:p,history:[{version:1,payload:structuredClone(p),status:'published',at:now}],source:'local-reviewed-commercial-preview',liveExecution:false} as CommercialTier);}
   else{const t=c.tiers.find(t=>t.id===d.tierId);need(t&&t.status==='published'&&String(t.version)===d.tierVersion,'Review the exact current published plan.');t.version++;t.payload=p;t.history.push({version:t.version,payload:structuredClone(p),status:t.status,at:now});}
  }else if(op==='community.commercial.tier.withdraw'){
   const t=c.tiers.find(t=>t.id===d.tierId);need(t&&t.status==='published'&&String(t.version)===d.tierVersion,'Review the exact current offer before withdrawing it.');t.version++;t.status='withdrawn';t.history.push({version:t.version,payload:structuredClone(t.payload),status:t.status,at:now});
  }else throw Error('This commercial action is not available.');
 }
 const current=w.objects.find(o=>o.kind==='community-commercial-terms'&&o.groupId===groupId) as Terms;current.events.push({key:d.actionKey,operation:op,payload,at:now});current.version++;
 return {objectId:groupId,message:'Original Circle example updated. No real plan, charge, private-history permission or invoice was created.'};
}
