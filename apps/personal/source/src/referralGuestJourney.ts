import type {ActionContext,Entity,ProductWorld} from './productModel.ts';
import {ownPartnerProgrammes,partnerActive,type PartnerCase,type PartnerProgramme} from './ambassadorJourney.ts';
import {localPreviewId} from './localPreviewId.ts';

// Local guest perspective only. No server-pass, verified identity or live attribution is issued.
export type ReferralGuestDraft={draftId:string;applicantType:'individual'|'family'|'team';fullName:string;email:string;basedIn:string;interest:string;preferredArrivalWindow:string;preferredParticipationLength:string;linkedinUrl:string;socialUrl:string;profileUrl:string;motivation:string;contribution:string;relationship?:string;consent:boolean};
export type ReferralGuestApplication=Entity&{kind:'referral-guest-application-preview';exampleOnly:true;programmeId:string;spaceId:string;tenantKey:string;vertical:'club'|'gym';referrerId:string;sourceVersion:number;grantVersion:number;linkVersion:number;version:number;draft:ReferralGuestDraft;creationSnapshot:string;status:'pending'|'unknown'|'submitted'|'withdrawn'|'rejected';submittedAt:number;caseId:string|null;identityVerified:boolean;serverPass:false;continuation?:ReferralGuestContinuation;consentStatementVersion:string;attributionReceiptId:null;history:{at:number;status:string}[]};
export type ReferralGuestStage='identity'|'team-decision'|'team-go'|'eligibility';
export type ReferralGuestSourceAttempt={id:string;stage:ReferralGuestStage;status:'pending'|'unknown'|'confirmed'|'rejected';snapshot:string;fingerprint:string;at:number;receiptId?:string;source:'explicit-fictional-source-response';recipientId:string};
export type ReferralGuestContinuation={attempts:ReferralGuestSourceAttempt[]};
/** The fictional authority response is distinct from supplied guest contact details and Ambassador decisions. */
export function referralGuestContinuationReview(w:ProductWorld,id:string,stage:ReferralGuestStage,now=Date.now()){
 const a=ownReferralGuestApplications(w).find(a=>a.id===id),p=a&&ownPartnerProgrammes(w).find(p=>p.id===a.programmeId),c=a&&p?partnerCurrentGuestCase(w,a,p,now):undefined;
 if(!a||a.status!=='submitted'||!p||!c||!partnerActive(p,now)||p.grantVersion!==a.grantVersion)throw Error('Review the current exact original application, assignment and programme before continuing.');
 if(!['identity','team-decision','team-go','eligibility'].includes(stage))throw Error('Choose a supported original source stage.');
 const attempts=a.continuation?.attempts||[],confirmed=(s:ReferralGuestStage)=>attempts.filter(t=>validGuestSourceReceipt(a,p,c,t,s)).length===1;
 if(stage==='identity'&&!(a.vertical==='gym'&&c.status==='identity-verification-required'&&!a.identityVerified&&!c.identityVerified)||stage==='team-decision'&&!(a.vertical==='club'&&['recommended','team-review'].includes(c.status))||stage==='team-go'&&!(a.vertical==='club'&&c.status==='approved-internal-no-payment'&&confirmed('team-decision'))||stage==='eligibility'&&!(a.vertical==='gym'?c.status==='known-confirmed'&&a.identityVerified&&c.identityVerified&&confirmed('identity'):c.status==='team-go-reconciled'&&confirmed('team-decision')&&confirmed('team-go')))throw Error('This source response is not the next permitted step on the original application.');
 if(confirmed(stage))throw Error('This original source step already has its receipt.');
 const recipientId=c.applicantId,fingerprint=guestSourceFingerprint(a,p,c);
 return {application:a,programme:p,applicationCase:c,stage,recipientId,fingerprint,snapshot:JSON.stringify({source:'explicit-fictional-source-response',stage,fingerprint,liveExecution:false})};
}
function validGuestSourceReceipt(a:ReferralGuestApplication,p:PartnerProgramme,c:PartnerCase,t:ReferralGuestSourceAttempt,stage:ReferralGuestStage){try{const f=JSON.parse(t.fingerprint);return t.stage===stage&&t.status==='confirmed'&&t.source==='explicit-fictional-source-response'&&t.receiptId===`fictional-${stage}-receipt:${t.id}`&&t.recipientId===c.applicantId&&t.snapshot===JSON.stringify({source:'explicit-fictional-source-response',stage,fingerprint:t.fingerprint,liveExecution:false})&&f.applicationId===a.id&&f.caseId===c.id&&JSON.stringify(f.draft)===JSON.stringify(a.draft)&&f.programmeId===p.id&&f.grantVersion===p.grantVersion&&f.spaceId===p.spaceId&&f.tenantKey===p.tenantKey&&f.recipientId===c.applicantId;}catch{return false;}}
function guestSourceFingerprint(a:ReferralGuestApplication,p:PartnerProgramme,c:PartnerCase){return JSON.stringify({applicationId:a.id,caseId:c.id,draft:a.draft,caseVersion:c.version,assignmentVersion:c.assignmentVersion,caseStatus:c.status,programmeId:p.id,grantVersion:p.grantVersion,spaceId:p.spaceId,tenantKey:p.tenantKey,recipientId:c.applicantId});}
function partnerCurrentGuestCase(w:ProductWorld,a:ReferralGuestApplication,p:PartnerProgramme,now:number){const c=referralGuestCase(w,a);return c&&c.expiresAt>now&&Number.isFinite(c.expiresAt)&&p.capabilities.readAssigned&&c.reviewerId===w.owner&&c.assignmentVersion>0?c:undefined;}
/** Read-only handoff: no membership, payment, access credential or payee authority is created. */
export function referralGuestCheckoutContext(w:ProductWorld,id:string,now=Date.now()){
 const a=ownReferralGuestApplications(w).find(a=>a.id===id),p=a&&ownPartnerProgrammes(w).find(p=>p.id===a.programmeId),c=a&&p?partnerCurrentGuestCase(w,a,p,now):undefined;
 if(!a||a.status!=='submitted'||!p||!c||!partnerActive(p,now)||p.grantVersion!==a.grantVersion)return;
 const attempts=a.continuation?.attempts||[],eligibility=attempts.filter(t=>validGuestSourceReceipt(a,p,c,t,'eligibility'));
 if(a.vertical==='gym'&&attempts.filter(t=>validGuestSourceReceipt(a,p,c,t,'identity')).length!==1||a.vertical==='club'&&(['team-decision','team-go'] as const).some(stage=>attempts.filter(t=>validGuestSourceReceipt(a,p,c,t,stage)).length!==1))return;
 if(eligibility.length!==1||eligibility[0].source!=='explicit-fictional-source-response'||eligibility[0].receiptId!==`fictional-eligibility-receipt:${eligibility[0].id}`||eligibility[0].fingerprint!==guestSourceFingerprint(a,p,c)||eligibility[0].recipientId!==c.applicantId||!(a.vertical==='gym'?c.status==='known-confirmed'&&a.identityVerified&&c.identityVerified:c.status==='team-go-reconciled'))return;
 return {source:'explicit-fictional-membership-eligibility' as const,applicationId:a.id,caseId:c.id,programmeId:p.id,spaceId:a.spaceId,tenantKey:a.tenantKey,recipientId:c.applicantId,eligibilityReceipt:eligibility[0].receiptId,personalPaymentApprovalRequired:true as const,liveExecution:false as const};
}
export function validateReferralGuestDraft(input:ReferralGuestDraft,vertical:'club'|'gym'='club'):ReferralGuestDraft {
  const keys=['draftId','applicantType','fullName','email','basedIn','interest','preferredArrivalWindow','preferredParticipationLength','linkedinUrl','socialUrl','profileUrl','motivation','contribution','consent','relationship'];
  if(!input||typeof input!=='object'||Object.keys(input).some(k=>!keys.includes(k))||typeof input.draftId!=='string'||input.draftId.length<8||input.draftId.length>120||!['individual','family','team'].includes(input.applicantType))throw Error('Choose who is applying and keep this original application draft.');
  const result={...input};
  for(const key of keys.filter(k=>!['consent','applicantType','relationship'].includes(k)) as (Exclude<keyof ReferralGuestDraft,'consent'|'applicantType'>)[]){if(typeof input[key]!=='string')throw Error('Check your supplied application details.');result[key]=input[key].trim();}
  if(input.relationship!==undefined&&typeof input.relationship!=='string')throw Error('Check the supplied personal relationship.');
  result.relationship=(input.relationship||'').trim();
  if(vertical==='gym'){
    if(result.applicantType!=='individual'||result.fullName.length<2||result.fullName.length>180||result.email.length>320||!/^\S+@\S+\.\S+$/.test(result.email)||result.relationship.length<3||result.relationship.length>600||result.preferredArrivalWindow.length<2||result.preferredArrivalWindow.length>120||result.interest.length>1000||input.consent!==true)throw Error('Supply your name, contact email, personal connection, preferred start and application consent.');
    for(const key of ['basedIn','preferredParticipationLength','linkedinUrl','socialUrl','profileUrl','motivation','contribution'] as const)if(result[key])throw Error('Use the Gym referral fields; Club membership details are separate.');
    result.email=result.email.toLowerCase();return result;
  }
  for(const key of ['fullName','basedIn','preferredArrivalWindow','preferredParticipationLength'] as const)if(result[key].length<2||result[key].length>120)throw Error('Complete your name, location, arrival window and participation length.');
  if(result.interest.length<2||result.interest.length>160||result.email.length>254||!/^\S+@\S+\.\S+$/.test(result.email))throw Error('Supply an interest and valid contact email. Email is not verified identity.');
  for(const key of ['motivation','contribution'] as const)if(result[key].length<20||result[key].length>2000)throw Error('Tell us your motivation and contribution in at least 20 characters each.');
  for(const key of ['linkedinUrl','socialUrl','profileUrl'] as const)if(result[key]){try{const url=new URL(result[key]);if(url.protocol!=='https:'||url.username||url.password||result[key].length>500)throw Error();result[key]=url.toString();}catch{throw Error('Profile links must use HTTPS without embedded credentials, or remain empty.');}}
  if(result.consent!==true)throw Error('Confirm this application purpose separately from marketing and public-profile consent.');
  result.email=result.email.toLowerCase();return result;
}
export const ownReferralGuestApplications=(w:ProductWorld):ReferralGuestApplication[]=>w.identity.signedIn?w.objects.filter((o):o is ReferralGuestApplication=>o.kind==='referral-guest-application-preview'&&o.exampleOnly===true&&o.owner===w.owner&&w.objects.filter(x=>x.id===o.id).length===1):[];
export function referralGuestCase(w:ProductWorld,a:ReferralGuestApplication):PartnerCase|undefined{
  if(!ownReferralGuestApplications(w).some(x=>x.id===a.id)||!a.caseId||w.objects.filter(o=>o.id===a.caseId).length!==1)return;
  return w.objects.find(o=>o.id===a.caseId&&o.owner===w.owner&&o.kind==='partner-case-preview'&&o.guestApplicationId===a.id&&o.programmeId===a.programmeId&&o.spaceId===a.spaceId&&o.tenantKey===a.tenantKey&&o.vertical===a.vertical&&o.reviewerId===a.referrerId) as PartnerCase|undefined;
}
export function referralInvitation(w:ProductWorld,programmeId:string,now=Date.now()):PartnerProgramme|undefined{
  return ownPartnerProgrammes(w).find(p=>p.id===programmeId&&partnerActive(p,now)&&p.disclosed&&p.linkState==='active'&&p.capabilities.publishReferral);
}
export function referralGuestSnapshot(w:ProductWorld,programmeId:string,input:ReferralGuestDraft,now=Date.now(),originalId?:string){
  const p=referralInvitation(w,programmeId,now);if(!p)throw Error('This invitation is no longer available. Keep your draft and review its current source.');
  const draft=validateReferralGuestDraft(input,p.vertical);
  const consentStatementVersion=p.vertical==='gym'?'CRAYS-REFERRAL-PRIVACY-1':'CCLUB-DIRECT-MEMBERSHIP-APPLICATION-CONSENT-V1';
  const original=originalId?ownReferralGuestApplications(w).find(a=>a.id===originalId&&a.programmeId===p.id):undefined,reviewCase=original?referralGuestCase(w,original):undefined;
  if(originalId&&(!original||original.status!=='submitted'||!reviewCase||reviewCase.status!=='more-information-required'||reviewCase.expiresAt<=now))throw Error('Open the current original information request before responding.');
  return {programme:p,draft,consentStatementVersion,snapshot:JSON.stringify({originalId:original?.id,originalVersion:original?.version,caseVersion:reviewCase?.version,consentStatementVersion,programmeId:p.id,referrerId:p.subjectId,spaceId:p.spaceId,tenantKey:p.tenantKey,vertical:p.vertical,grantVersion:p.grantVersion,linkVersion:p.linkVersion,sourceVersion:p.version,draft})};
}
export function applyReferralGuestJourney(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null{
  if(!op.startsWith('referral.guest.preview.'))return null;
  if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Open this private local guest-perspective example in your own preview.');
  if(d.approved!=='Yes')throw Error('Review and confirm this exact example action.');
  if(op==='referral.guest.preview.submit'){
    const reviewed=referralGuestSnapshot(w,ctx.objectId||'',JSON.parse(d.draft),now);
    if(d.snapshot!==reviewed.snapshot)throw Error('The invitation, source or application changed. Review it again.');
    const prior=ownReferralGuestApplications(w).find(a=>a.draft.draftId===reviewed.draft.draftId);
    if(prior){if(prior.creationSnapshot===reviewed.snapshot)return {objectId:prior.id,message:'Opening the same original example request. No duplicate application.'};throw Error('Check your existing original request before changing or repeating it.');}
    const p=reviewed.programme,a:ReferralGuestApplication={id:localPreviewId(),owner:w.owner,kind:'referral-guest-application-preview',exampleOnly:true,programmeId:p.id,spaceId:p.spaceId,tenantKey:p.tenantKey,vertical:p.vertical,referrerId:p.subjectId,sourceVersion:p.version,grantVersion:p.grantVersion,linkVersion:p.linkVersion,version:1,draft:reviewed.draft,creationSnapshot:reviewed.snapshot,status:'pending',submittedAt:now,caseId:null,identityVerified:false,serverPass:false,consentStatementVersion:reviewed.consentStatementVersion,attributionReceiptId:null,history:[{at:now,status:'pending'}]};
    w.objects.push(a);return {objectId:a.id,message:'Example request prepared. No real application, email, verified identity or attribution receipt was created.'};
  }
  const a=ownReferralGuestApplications(w).find(a=>a.id===ctx.objectId);if(!a||d.version!==String(a.version))throw Error('Open the latest original example request.');
  if(op==='referral.guest.preview.source.prepare'){
    if(!['identity','team-decision','team-go','eligibility'].includes(d.stage))throw Error('Choose the exact original source step.');
    const r=referralGuestContinuationReview(w,a.id,d.stage as ReferralGuestStage,now);if(d.snapshot!==r.snapshot)throw Error('The source step, applicant or assignment changed. Review again.');
    const prior=a.continuation?.attempts.find(t=>['pending','unknown'].includes(t.status));if(prior){if(prior.stage===d.stage&&prior.snapshot===r.snapshot)return {objectId:a.id,message:'The same original source attempt remains unresolved. No second request.'};throw Error('Check the same original source attempt before another step.');}
    a.continuation??={attempts:[]};a.continuation.attempts.push({id:localPreviewId(),stage:d.stage as ReferralGuestStage,status:'pending',snapshot:r.snapshot,fingerprint:r.fingerprint,at:now,source:'explicit-fictional-source-response',recipientId:r.recipientId});a.version++;a.history.push({at:now,status:`${d.stage}-source-pending`});return {objectId:a.id,message:'Fictional source review prepared on this same application. No identity, decision, payment or membership has been confirmed.'};
  }
  if(op==='referral.guest.preview.source.response'){
    const t=a.continuation?.attempts.find(t=>t.id===d.attemptId);if(!t||d.source!=='explicit-fictional-source-response'||!['unknown','confirmed','rejected'].includes(d.status))throw Error('Review the exact fictional source and same original attempt.');
    if(t.status==='confirmed'||t.status==='rejected'){if(t.status===d.status)return {objectId:a.id,message:'Original source receipt retained. No duplicate effect.'};throw Error('This original source result is final.');}
    const r=referralGuestContinuationReview(w,a.id,t.stage,now);if(t.snapshot!==r.snapshot||t.fingerprint!==r.fingerprint||t.recipientId!==r.recipientId)throw Error('Original applicant, assignment or source authority changed. Keep the unresolved evidence; do not apply an old response.');
    if(d.status==='confirmed'){
      t.receiptId=`fictional-${t.stage}-receipt:${t.id}`;
      if(t.stage==='identity'){a.identityVerified=true;r.applicationCase.identityVerified=true;r.applicationCase.status='awaiting-referrer-confirmation';}
      if(t.stage==='team-decision')r.applicationCase.status='approved-internal-no-payment';
      if(t.stage==='team-go')r.applicationCase.status='team-go-reconciled';
      if(t.stage!=='eligibility'){r.applicationCase.version++;r.applicationCase.history.push({at:now,status:r.applicationCase.status,reason:'Explicit fictional source response on the same original; no live verification, admission or payment.'});}
    }
    t.status=d.status as ReferralGuestSourceAttempt['status'];a.version++;a.history.push({at:now,status:`${t.stage}-source-${t.status}`});return {objectId:a.id,message:d.status==='unknown'?'The same source attempt remains unknown. Do not create another.':'Fictional source result retained. Membership checkout, personal payment approval and entry remain separate.'};
  }
  if(op==='referral.guest.preview.resubmit'){
    const c=referralGuestCase(w,a),reviewed=referralGuestSnapshot(w,a.programmeId,JSON.parse(d.draft),now,a.id),p=reviewed.programme;
    if(a.status!=='submitted'||!c||c.status!=='more-information-required'||c.expiresAt<=now||String(c.version)!==d.caseVersion||reviewed.snapshot!==d.snapshot||reviewed.draft.draftId!==a.draft.draftId||p.subjectId!==a.referrerId||p.spaceId!==a.spaceId||p.tenantKey!==a.tenantKey)throw Error('Review the same current information request, application and invitation before responding.');
    a.draft=reviewed.draft;a.version++;a.sourceVersion=p.version;a.linkVersion=p.linkVersion;a.grantVersion=p.grantVersion;a.history.push({at:now,status:'additional-information-supplied'});
    const x=a.draft;c.name=x.fullName;c.email=x.email;c.type=x.applicantType;c.country=x.basedIn;c.interest=x.interest;c.motivation=x.motivation;c.contribution=x.contribution;c.version++;c.status='assigned';c.history.push({at:now,status:c.status,reason:'Applicant supplied the requested information on the same original example.'});
    return {objectId:a.id,message:'Additional information saved on the same original example. No second request, admission or payment was created.'};
  }
  if(op==='referral.guest.preview.withdraw'){
    if(['withdrawn','rejected'].includes(a.status))throw Error('This original request is no longer withdrawable.');
    const c=referralGuestCase(w,a);if(a.caseId&&!c)throw Error('Reconcile the original assigned case before changing this request.');
    if(c){c.status='withdrawn';c.version++;c.expiresAt=now;c.history.push({at:now,status:'withdrawn',reason:'Applicant withdrew this original example request.'});}
    a.status='withdrawn';a.version++;a.history.push({at:now,status:a.status});return {objectId:a.id,message:'Original example withdrawn. No membership or unrelated application was cancelled.'};
  }
  if(op!=='referral.guest.preview.response'||!['pending','unknown'].includes(a.status)||!['unknown','submitted','rejected'].includes(d.status))throw Error('This original response transition is unavailable.');
  if(d.status==='submitted'){
    const p=referralInvitation(w,a.programmeId,now);
    if(!p||p.version!==a.sourceVersion||p.grantVersion!==a.grantVersion||p.linkVersion!==a.linkVersion||p.subjectId!==a.referrerId||p.spaceId!==a.spaceId||p.tenantKey!==a.tenantKey)throw Error('Invitation authority changed. Do not deliver the old request or silently change its recipient.');
    if(a.caseId)throw Error('This original application already has a review case.');
    const x=a.draft,c:PartnerCase={id:localPreviewId(),owner:w.owner,kind:'partner-case-preview',exampleOnly:true,programmeId:p.id,vertical:p.vertical,spaceId:p.spaceId,tenantKey:p.tenantKey,version:1,assignmentVersion:1,reviewerId:p.subjectId,applicantId:`fictional-guest:${a.id}`,name:x.fullName,email:x.email,type:x.applicantType,country:x.basedIn,interest:x.interest,motivation:x.motivation,contribution:x.contribution,relationship:p.vertical==='gym'?x.relationship||'Not supplied':'Supplied through this exact invitation; acquaintance not yet confirmed.',identityVerified:false,status:p.vertical==='club'?'assigned':'identity-verification-required',submittedAt:now,expiresAt:now+7*86400000,history:[{at:now,status:p.vertical==='club'?'assigned':'identity-verification-required',reason:'Explicit fictional delivery of the same reviewed guest request.'}],guestApplicationId:a.id};
    w.objects.push(c);a.caseId=c.id;
  }
  a.status=d.status as ReferralGuestApplication['status'];a.version++;a.history.push({at:now,status:a.status});
  return {objectId:a.id,message:a.status==='unknown'?'Outcome unknown. Keep and check this original request; do not submit another.':'Explicit example response recorded. No membership, payment, door pass, commission or real attribution receipt was created.'};
}
