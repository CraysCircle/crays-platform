import {financeChuckProjection} from './partnerFinanceJourney.ts';
import type {ActionContext,Entity,ProductWorld} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';

export type PartnerVertical='club'|'gym';
export type PartnerRole='ambassador'|'trainer'|'member';
export type PartnerProgramme=Entity&{kind:'partner-programme-preview';exampleOnly:true;subjectId:string;vertical:PartnerVertical;role:PartnerRole;spaceId:string;spaceName:string;tenantKey:string;version:number;grantVersion:number;status:'active'|'suspended'|'revoked';expiresAt:number;disclosed:boolean;headline:string;invitation:string;linkState:'draft'|'active'|'paused';linkVersion:number;agreementVersion:string;agreementStatus:'pending';rateBps:null;capabilities:{readAssigned:boolean;reviewAssigned:boolean;publishReferral:boolean;finalAdmission:false};history:{at:number;event:string;version:number}[]};
export type PartnerCase=Entity&{kind:'partner-case-preview';exampleOnly:true;programmeId:string;vertical:PartnerVertical;spaceId:string;tenantKey:string;version:number;assignmentVersion:number;reviewerId:string;applicantId:string;name:string;email:string;type:'individual'|'family'|'team';country:string;interest:string;motivation:string;contribution:string;relationship:string;identityVerified:boolean;status:string;submittedAt:number;expiresAt:number;history:{at:number;status:string;reason:string}[]};
export type PartnerAttempt=Entity&{kind:'partner-attempt-preview';exampleOnly:true;programmeId:string;caseId:string;programmeVersion:number;grantVersion:number;caseVersion:number;assignmentVersion:number;command:string;reason:string;snapshot:string;status:'queued'|'unknown'|'confirmed'|'rejected';at:number;receiptAt?:number};
export type PartnerStatement=Entity&{kind:'partner-statement-preview';exampleOnly:true;programmeId:string;programmeName:string;spaceId:string;spaceName:string;tenantKey:string;beneficiaryId:string;agreementVersion:string;currency:'USD';period:string;status:'awaiting-source';eligibleBasisMinor:null;agreedRateBps:null;amountMinor:null;bookingReferences:string[];payoutReference:null;at:number};
export type PartnerApplicationDraft={draftId:string;vertical:PartnerVertical;roles:string[];name:string;email:string;country:string;language:string;company:string;website:string;story:string;audience:string;channels:string;motivation:string;contribution:string;consent:boolean};
export type PartnerApplication=Entity&{kind:'partner-application-preview';exampleOnly:true;version:number;draft:PartnerApplicationDraft;status:'draft'|'submitted'|'more-information-required'|'withdrawn';creationSnapshot:string;submittedAt:number|null;history:{at:number;status:string}[]};
export type PartnerChuckReview=Entity&{kind:'partner-chuck-review-preview';exampleOnly:true;sourceId:string;fingerprint:string;name:string;selectedFields:string[];excerpt:string;request:string;expiresAt:number};
const unique=(w:ProductWorld,id:string)=>w.objects.filter(o=>o.id===id).length===1;
export const ownPartnerProgrammes=(w:ProductWorld):PartnerProgramme[]=>w.identity.signedIn?w.objects.filter((o):o is PartnerProgramme=>o.owner===w.owner&&o.subjectId===w.owner&&o.kind==='partner-programme-preview'&&o.exampleOnly===true&&unique(w,o.id)):[];
export const ownPartnerApplications=(w:ProductWorld):PartnerApplication[]=>w.identity.signedIn?w.objects.filter((o):o is PartnerApplication=>o.owner===w.owner&&o.kind==='partner-application-preview'&&o.exampleOnly===true&&unique(w,o.id)):[];
export const ownPartnerStatements=(w:ProductWorld):PartnerStatement[]=>w.identity.signedIn?w.objects.filter((o):o is PartnerStatement=>o.owner===w.owner&&o.beneficiaryId===w.owner&&o.kind==='partner-statement-preview'&&o.exampleOnly===true&&o.currency==='USD'&&unique(w,o.id)):[];
export const partnerActive=(p:PartnerProgramme,now=Date.now())=>p.status==='active'&&p.expiresAt>now;
export function partnerCases(w:ProductWorld,programmeId:string,now=Date.now()):PartnerCase[]{
  const p=ownPartnerProgrammes(w).find(p=>p.id===programmeId);
  if(!p||!partnerActive(p,now)||!p.capabilities.readAssigned)return [];
  return w.objects.filter((o):o is PartnerCase=>o.owner===w.owner&&o.kind==='partner-case-preview'&&o.exampleOnly===true&&o.programmeId===p.id&&o.reviewerId===w.owner&&o.spaceId===p.spaceId&&o.tenantKey===p.tenantKey&&o.vertical===p.vertical&&Number.isFinite(o.expiresAt)&&Number(o.expiresAt)>now&&unique(w,o.id));
}
/** Payload-free retained receipt projection; an expired assignment never exposes its applicant. */
export function partnerCaseReceipts(w:ProductWorld,programmeId:string,now=Date.now()){
 const p=ownPartnerProgrammes(w).find(p=>p.id===programmeId);if(!p)return [];
 return w.objects.filter(o=>o.owner===w.owner&&o.kind==='partner-case-preview'&&o.exampleOnly===true&&o.programmeId===p.id&&o.reviewerId===w.owner&&o.spaceId===p.spaceId&&o.tenantKey===p.tenantKey&&o.vertical===p.vertical&&unique(w,o.id)&&Number.isFinite(o.expiresAt)&&Number(o.expiresAt)<=now).map(o=>({id:o.id,expiresAt:Number(o.expiresAt),status:'Assignment expired · applicant details hidden'}));
}
/** Earliest applicable deadline; UI also refreshes on visibility resume through usePreviewExpiry. */
export function partnerCaseDeadline(w:ProductWorld,programmeId:string,now=Date.now()){
 const p=ownPartnerProgrammes(w).find(p=>p.id===programmeId);if(!p)return NaN;
 const dates=[p.expiresAt,...partnerCases(w,programmeId,now).map(c=>c.expiresAt)].filter(t=>Number.isFinite(t)&&t>now);return dates.length?Math.min(...dates):NaN;
}
export function partnerPublicBadges(w:ProductWorld,subjectId:string,now=Date.now()){
  return w.objects.filter((o):o is PartnerProgramme=>o.kind==='partner-programme-preview'&&o.exampleOnly===true&&o.subjectId===subjectId&&o.owner===subjectId&&o.disclosed===true&&unique(w,o.id)&&partnerActive(o as PartnerProgramme,now)).map(p=>({id:p.id,subjectId:p.subjectId,name:p.vertical==='club'?'Club Ambassador · example':'Gym partner · example',spaceName:p.spaceName,expiresAt:p.expiresAt,exampleOnly:true as const}));
}
export function partnerReviewActions(p:PartnerProgramme,c:PartnerCase,now=Date.now()){
  if(!partnerActive(p,now)||!p.capabilities.reviewAssigned||c.programmeId!==p.id||c.vertical!==p.vertical||c.spaceId!==p.spaceId||c.tenantKey!==p.tenantKey||c.expiresAt<=now)return [];
  if(p.vertical==='gym')return c.status==='awaiting-referrer-confirmation'&&c.identityVerified?['confirm-known','not-known']:[];
  if(['assigned','more-information-required'].includes(c.status))return ['start-review'];
  return c.status==='ambassador-review'?['request-information','recommend','not-recommend']:[];
}
export function partnerCaseSnapshot(w:ProductWorld,programmeId:string,caseId:string,command:string,reason:string,now=Date.now()){
  const p=ownPartnerProgrammes(w).find(p=>p.id===programmeId),c=partnerCases(w,programmeId,now).find(c=>c.id===caseId);
  if(!p||!c||c.applicantId===w.owner||!partnerReviewActions(p,c,now).includes(command))throw Error('This assigned application or action is unavailable to your current programme.');
  if(typeof reason!=='string'||reason.trim().length<(command==='start-review'?0:10)||reason.length>2000)throw Error('Write a specific reason or exact information request before continuing.');
  return {programme:p,application:c,snapshot:JSON.stringify({programmeId:p.id,grantVersion:p.grantVersion,spaceId:p.spaceId,tenantKey:p.tenantKey,caseId:c.id,caseVersion:c.version,assignmentVersion:c.assignmentVersion,command,reason:reason.trim()})};
}
export function currentPartnerAttempt(w:ProductWorld,id:string,now=Date.now()):PartnerAttempt|undefined{
  const a=w.identity.signedIn&&unique(w,id)?w.objects.find(o=>o.id===id&&o.owner===w.owner&&o.kind==='partner-attempt-preview') as PartnerAttempt|undefined:undefined;
  if(!a||!partnerCases(w,a.programmeId,now).some(c=>c.id===a.caseId))return;
  return a;
}
export function partnerApplicationDraft(input:PartnerApplicationDraft):PartnerApplicationDraft{
  if(!input||typeof input.draftId!=='string'||input.draftId.length<8||!['club','gym'].includes(input.vertical)||!Array.isArray(input.roles)||!input.roles.length||new Set(input.roles).size!==input.roles.length||input.roles.some(r=>!['creator','influencer','affiliate','community-builder','trainer','member'].includes(r)))throw Error('Choose your programme and how you would like to contribute.');
  for(const key of ['name','email','country','language','company','website','story','audience','channels','motivation','contribution'] as const)if(typeof input[key]!=='string'||input[key].length>2000)throw Error('Keep the supplied application fields under 2000 characters.');
  if(input.name.trim().length<2||!/^\S+@\S+\.\S+$/.test(input.email)||!input.country.trim()||!input.language.trim()||input.motivation.trim().length<20||input.contribution.trim().length<20||input.consent!==true)throw Error('Complete your contact details, motivation, contribution and specific application consent.');
  if(input.website){try{const url=new URL(input.website);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{throw Error('Use an HTTPS website without credentials, or leave it empty.');}}
  return {...input,roles:[...input.roles].sort(),email:input.email.trim().toLowerCase()};
}
export function partnerChuckSource(w:ProductWorld,id:string,now=Date.now()){
  const c=w.objects.find(o=>o.id===id&&o.owner===w.owner&&o.kind==='partner-case-preview') as PartnerCase|undefined;
  if(c&&c.expiresAt>now&&partnerCases(w,c.programmeId,now).some(x=>x.id===id)){const p=ownPartnerProgrammes(w).find(p=>p.id===c.programmeId)!;return {name:'My assigned application',version:c.version,programmeId:c.programmeId,expiresAt:Math.min(p.expiresAt,c.expiresAt),fingerprint:JSON.stringify([id,c.version,c.assignmentVersion,p.grantVersion]),fields:{Interest:c.interest,Motivation:c.motivation,Contribution:c.contribution,Relationship:c.relationship,'Applicant name':c.name,'Contact email':c.email},request:'Summarise the application details I select and suggest useful questions for my review.'};}
  const s=ownPartnerStatements(w).find(s=>s.id===id);if(s)return {name:'My original partner statement',version:1,programmeId:s.programmeId,expiresAt:0,fingerprint:JSON.stringify([id,s.agreementVersion,s.status]),fields:{Programme:s.programmeName,Spot:s.spaceName,Agreement:s.agreementVersion,'Source status':'Awaiting source; commission basis, rate and amount not released'},request:'Explain what is missing from this statement and what I should do next.'};
  const a=ownPartnerApplications(w).find(a=>a.id===id);if(a)return {name:'My partner programme application',version:a.version,programmeId:'',expiresAt:0,fingerprint:JSON.stringify([id,a.version,a.status]),fields:{Motivation:a.draft.motivation,Contribution:a.draft.contribution,Audience:a.draft.audience,'My story':a.draft.story},request:'Help me improve my programme application using only the details I select.'};
  return financeChuckProjection(w,id);
}
export function partnerChuckSnapshot(w:ProductWorld,id:string,fields:string[],request:string,now=Date.now()){
  const source=partnerChuckSource(w,id,now);if(!source||!Array.isArray(fields)||!fields.length||new Set(fields).size!==fields.length||fields.some(f=>!Object.hasOwn(source.fields,f))||typeof request!=='string'||!request.trim()||request.length>2000)throw Error('Select the exact permitted fields and question for Chuck.');
  const excerpt=['Explicit fictional programme example; not actual applicant or settlement data.',...fields.map(f=>`${f}: ${source.fields[f as keyof typeof source.fields]}`)].join('\n');
  return {source,excerpt,snapshot:JSON.stringify({id,fingerprint:source.fingerprint,fields,request:request.trim()})};
}
export function currentPartnerChuckReview(w:ProductWorld,id:string,now=Date.now()):PartnerChuckReview|undefined{
  const r=w.identity.signedIn&&unique(w,id)?w.objects.find(o=>o.owner===w.owner&&o.id===id&&o.kind==='partner-chuck-review-preview') as PartnerChuckReview|undefined:undefined;
  const source=r&&partnerChuckSource(w,r.sourceId,now);return r&&source&&(!r.expiresAt||r.expiresAt>now)&&r.fingerprint===source.fingerprint?r:undefined;
}
export function applyAmbassadorJourney(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null{
  if(!op.startsWith('ambassador.preview.'))return null;
  if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Sign in to your own partner programme workspace.');
  const approved=()=>{if(d.approved!=='Yes')throw Error('Review and confirm this exact example action first.');};
  if(op==='ambassador.preview.programme.example'){
    approved();if(!['club','gym'].includes(d.vertical)||!(d.vertical==='club'?d.role==='ambassador':['trainer','member'].includes(d.role)))throw Error('Choose the explicit Club Ambassador, Gym trainer or authorised Gym member example.');
    const space=w.venues.find(v=>v.id===d.spaceId);if(!space)throw Error('Choose an existing exact Spot for this example.');
    const existing=ownPartnerProgrammes(w).find(p=>p.spaceId===space.id&&p.vertical===d.vertical&&p.role===d.role);if(existing)return {objectId:existing.id,message:'Opening the existing example programme. No new role or real access is granted.'};
    const p:PartnerProgramme={id:localPreviewId(),owner:w.owner,subjectId:w.owner,kind:'partner-programme-preview',exampleOnly:true,vertical:d.vertical as PartnerVertical,role:d.role as PartnerRole,spaceId:space.id,spaceName:space.name,tenantKey:`example:${space.id}`,version:1,grantVersion:1,status:'active',expiresAt:now+30*86400000,disclosed:false,headline:'Good people. Meaningful introductions.',invitation:'Apply through my personal invitation. Programme review, membership, payment and entry remain separate decisions.',linkState:'draft',linkVersion:1,agreementVersion:'source-pending',agreementStatus:'pending',rateBps:null,capabilities:{readAssigned:true,reviewAssigned:true,publishReferral:true,finalAdmission:false},history:[{at:now,event:'Explicit local programme example; no SaaS grant',version:1}]};w.objects.push(p);
    const c:PartnerCase={id:localPreviewId(),owner:w.owner,kind:'partner-case-preview',exampleOnly:true,programmeId:p.id,vertical:p.vertical,spaceId:p.spaceId,tenantKey:p.tenantKey,version:1,assignmentVersion:1,reviewerId:w.owner,applicantId:`fictional-applicant:${p.id}`,name:p.vertical==='club'?'Riley Taylor':'Jamie Morgan',email:'applicant@example.invalid',type:'individual',country:'Example location',interest:p.vertical==='club'?'Community and an upcoming stay':'Training and wellbeing',motivation:'I would like to join a thoughtful community and learn from people with different experiences.',contribution:'I would enjoy sharing my experience and contributing to activities with other members.',relationship:'Fictional personal connection for this example only.',identityVerified:p.vertical==='gym',status:p.vertical==='club'?'assigned':'awaiting-referrer-confirmation',submittedAt:now,expiresAt:now+7*86400000,history:[{at:now,status:'submitted',reason:'Explicit fictional application; no real person or contact message.'}]};w.objects.push(c);
    const s:PartnerStatement={id:localPreviewId(),owner:w.owner,kind:'partner-statement-preview',exampleOnly:true,programmeId:p.id,programmeName:p.vertical==='club'?'Club Ambassador':'Gym referral partner',spaceId:p.spaceId,spaceName:p.spaceName,tenantKey:p.tenantKey,beneficiaryId:w.owner,agreementVersion:p.agreementVersion,currency:'USD',period:new Date(now).toISOString().slice(0,7),status:'awaiting-source',eligibleBasisMinor:null,agreedRateBps:null,amountMinor:null,bookingReferences:[],payoutReference:null,at:now};w.objects.push(s);
    return {objectId:p.id,message:'Private programme example opened with one fictional assigned application. No membership, health access, payable commission or real role was created.'};
  }
  if(op==='ambassador.preview.application.save'){
    approved();const draft=partnerApplicationDraft(JSON.parse(d.draft));const snapshot=JSON.stringify(draft);if(d.snapshot!==snapshot)throw Error('Your application changed after review.');
    const prior=ownPartnerApplications(w).find(a=>a.draft.draftId===draft.draftId);if(prior){if(JSON.stringify(prior.draft)===snapshot||!ctx.objectId&&prior.creationSnapshot===snapshot)return {objectId:prior.id,message:'Opening the same original application. No duplicate was submitted.'};if(prior.id!==ctx.objectId||d.version!==String(prior.version)||!['draft','more-information-required'].includes(prior.status))throw Error('Open your current editable original application.');prior.version++;prior.draft=draft;prior.status='draft';prior.history.push({at:now,status:'draft'});return {objectId:prior.id,message:'Original application draft updated; no partner role or submission.'};}
    if(ctx.objectId)throw Error('This own original application is unavailable.');
    const a:PartnerApplication={id:localPreviewId(),owner:w.owner,kind:'partner-application-preview',exampleOnly:true,version:1,draft,status:'draft',creationSnapshot:snapshot,submittedAt:null,history:[{at:now,status:'draft'}]};w.objects.push(a);return {objectId:a.id,message:'Your private example application draft is saved. It is not submitted or approved.'};
  }
  if(op==='ambassador.preview.application.state'){
    approved();const a=ownPartnerApplications(w).find(a=>a.id===ctx.objectId);if(!a||String(a.version)!==d.version)throw Error('Open your latest original partner application.');
    if(!(d.status==='submitted'&&['draft','more-information-required'].includes(a.status)||d.status==='withdrawn'&&['draft','submitted','more-information-required'].includes(a.status)||d.status==='more-information-required'&&a.status==='submitted'&&d.scenario==='explicit-example-response'))throw Error('This application transition is unavailable.');
    a.status=d.status as PartnerApplication['status'];a.version++;if(a.status==='submitted')a.submittedAt=now;a.history.push({at:now,status:a.status});return {objectId:a.id,message:'Example application status updated. No email, real submission, acceptance or recruitment rights were created.'};
  }
  if(op==='ambassador.preview.chuck.prepare'){
    approved();const fields=JSON.parse(d.fields),review=partnerChuckSnapshot(w,ctx.objectId||'',fields,d.request,now);if(d.snapshot!==review.snapshot)throw Error('The selected fields, source permission or question changed. Review again.');
    const r:PartnerChuckReview={id:localPreviewId(),owner:w.owner,kind:'partner-chuck-review-preview',exampleOnly:true,sourceId:ctx.objectId!,fingerprint:review.source.fingerprint,name:review.source.name,selectedFields:fields,excerpt:review.excerpt,request:d.request.trim(),expiresAt:review.source.expiresAt};w.objects.push(r);return {objectId:r.id,message:'Only this reviewed excerpt is prepared for an unsent Chuck draft. No application decision or message was sent.'};
  }
  const p=ownPartnerProgrammes(w).find(p=>p.id===ctx.objectId);
  if(!p)throw Error('This own programme is unavailable.');
  if(op==='ambassador.preview.programme.state'){
    approved();if(d.version!==String(p.version)||!['active','suspended','revoked'].includes(d.status))throw Error('Review the latest programme state.');
    if(p.status==='revoked')throw Error('A revoked grant cannot be silently restored. A new authoritative assignment is required.');
    p.status=d.status as PartnerProgramme['status'];p.version++;p.grantVersion++;if(p.status!=='active'){p.disclosed=false;p.linkState='paused';}p.history.push({at:now,event:`Example programme ${p.status}`,version:p.version});return {objectId:p.id,message:'Example lifecycle changed. Badge, link and future review actions respect the current grant; own historical statements remain separate.'};
  }
  if(op==='ambassador.preview.link.save'){
    approved();if(!partnerActive(p,now)||!p.capabilities.publishReferral||d.version!==String(p.version)||typeof d.headline!=='string'||d.headline.trim().length<8||d.headline.length>180||typeof d.invitation!=='string'||d.invitation.trim().length<20||d.invitation.length>1500||!['draft','active','paused'].includes(d.state)||!['Yes','No'].includes(d.disclosed))throw Error('Review your current link authority, invitation, public disclosure and publication state.');
    p.headline=d.headline.trim();p.invitation=d.invitation.trim();p.disclosed=d.disclosed==='Yes';p.linkState=d.state as PartnerProgramme['linkState'];p.version++;p.linkVersion++;p.history.push({at:now,event:'Reviewed example invitation/public disclosure',version:p.version});return {objectId:p.id,message:'Example invitation saved. No public server pass, real link publication, membership or attribution receipt was created.'};
  }
  if(op==='ambassador.preview.review.prepare'){
    approved();const review=partnerCaseSnapshot(w,p.id,d.caseId,d.command,d.reason,now);if(d.snapshot!==review.snapshot)throw Error('This application, assignment or reason changed. Review again.');
    const pending=w.objects.filter(o=>o.owner===w.owner&&o.kind==='partner-attempt-preview'&&o.caseId===review.application.id&&['queued','unknown'].includes(String(o.status))) as PartnerAttempt[];
    if(pending.length){if(pending.length===1&&pending[0].snapshot===review.snapshot)return {objectId:pending[0].id,message:'Opening the same pending original attempt. No duplicate action.'};throw Error('Check the same pending original attempt before preparing another review.');}
    const a:PartnerAttempt={id:localPreviewId(),owner:w.owner,kind:'partner-attempt-preview',exampleOnly:true,programmeId:p.id,caseId:review.application.id,programmeVersion:p.version,grantVersion:p.grantVersion,caseVersion:review.application.version,assignmentVersion:review.application.assignmentVersion,command:d.command,reason:d.reason.trim(),snapshot:review.snapshot,status:'queued',at:now};w.objects.push(a);return {objectId:a.id,message:'Example action queued. The application is unchanged until its explicit response is explored.'};
  }
  if(op==='ambassador.preview.review.response'){
    approved();const a=currentPartnerAttempt(w,d.attemptId,now);if(!a||a.programmeId!==p.id||!['queued','unknown'].includes(a.status)||!['unknown','confirmed','rejected'].includes(d.status))throw Error('Open the same current original review attempt.');
    if(d.status==='confirmed'){
      const review=partnerCaseSnapshot(w,p.id,a.caseId,a.command,a.reason,now);if(a.snapshot!==review.snapshot||a.grantVersion!==p.grantVersion||a.caseVersion!==review.application.version||a.assignmentVersion!==review.application.assignmentVersion)throw Error('The grant, assignment or application changed. Do not apply an old response.');
      const statuses:Record<string,string>={'start-review':'ambassador-review','request-information':'more-information-required',recommend:'recommended','not-recommend':'not-recommended','confirm-known':'known-confirmed','not-known':'not-known-rejected'};
      review.application.status=statuses[a.command];review.application.version++;review.application.history.push({at:now,status:review.application.status,reason:a.reason});
    }
    a.status=d.status as PartnerAttempt['status'];a.receiptAt=now;return {objectId:a.id,message:'Explicit example response recorded on the same attempt. No real message, final Club admission, payment, health grant or payout occurred.'};
  }
  throw Error('This programme example action is unavailable.');
}
