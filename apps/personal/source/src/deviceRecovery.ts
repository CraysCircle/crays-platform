import type {ProductWorld,ActionContext,Entity,Wallet} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
export const DEVICE_REQUEST_TTL=10*60_000;
export const DEVICE_SAMPLE_CODE='482619';
export const RECOVERY_AREAS=['account','nostr','chats','wallet'] as const;
export type RecoveryArea=typeof RECOVERY_AREAS[number];
export type DeviceRecord=Entity&{kind:'device';format:'crays.device-preview.v1';name:string;platform:string;status:string;version:number;requestId:string;requestedAt:number;expiresAt:number;localAccess:'denied'|'approved-preview';remoteSession:string;events:{at:number;action:string;version:number}[]};
export type RecoveryRecord=Entity&{kind:'recovery-review';format:'crays.recovery-preview.v1';area:RecoveryArea;name:string;proof:string;sourceId:string;sourceName:string;sourceFingerprint:string;publicId:string;requestId:string;status:string;version:number;createdAt:number;attemptId?:string;events:{at:number;action:string;version:number}[]};
export function ownDevice(w:ProductWorld,id:string):Entity{
 if(!w.identity.signedIn)throw new Error('Sign in to review your own device.');
 const matches=w.objects.filter(o=>o.id===id);if(matches.length!==1||matches[0].owner!==w.owner||matches[0].kind!=='device')throw new Error('Open the exact device belonging to your own account.');const r=matches[0];if(r.format==='crays.device-preview.v1'&&(!Number.isInteger(r.version)||Number(r.version)<1||typeof r.requestedAt!=='number'||!Number.isFinite(r.requestedAt)||typeof r.expiresAt!=='number'||!Number.isFinite(r.expiresAt)||r.expiresAt<=r.requestedAt||!Array.isArray(r.events)))throw new Error('This original device record needs review. Its saved revision or timing is invalid.');return r;
}
export function devicePending(r:Entity,now=Date.now()){return r.format==='crays.device-preview.v1'&&r.status==='pending-owner-approval'&&typeof r.requestedAt==='number'&&Number.isFinite(r.requestedAt)&&typeof r.expiresAt==='number'&&Number.isFinite(r.expiresAt)&&Number.isInteger(r.version)&&Number(r.version)>=1&&r.expiresAt>r.requestedAt&&r.requestedAt<=now&&r.expiresAt>now;}
export function ownRecovery(w:ProductWorld,id:string):RecoveryRecord{
 if(!w.identity.signedIn)throw new Error('Sign in to review your own recovery source.');
 const matches=w.objects.filter(o=>o.id===id);const o=matches[0];if(matches.length!==1||o.owner!==w.owner||o.kind!=='recovery-review'||o.format!=='crays.recovery-preview.v1'||!RECOVERY_AREAS.includes(o.area as RecoveryArea)||!Array.isArray(o.events)||!Number.isInteger(o.version)||Number(o.version)<1||typeof o.createdAt!=='number'||!Number.isFinite(o.createdAt)||(o.status==='awaiting-source-confirmation'&&(typeof o.attemptId!=='string'||!o.attemptId.trim())))throw new Error('Open your original recovery review.');return o as RecoveryRecord;
}
function proofReady(r:RecoveryRecord){return r.proof==='Available sample proof';}
function walletBinding(w:Wallet){return JSON.stringify({id:w.id,asset:w.asset,network:w.network,custody:w.custody,contract:w.contract||''});}
function sourceCurrent(w:ProductWorld,r:RecoveryRecord){
 if(r.publicId!==w.identity.publicId)throw new Error('Your original Nostr identity changed. Prepare a separate recovery review.');
 if(r.area==='wallet'){
  const matches=w.wallets.filter(x=>x.id===r.sourceId);const wallet=matches.length===1?matches[0]:undefined;if(!wallet)throw new Error('The original wallet is no longer available. Do not use another wallet instead.');
  if(r.sourceFingerprint!==walletBinding(wallet))throw new Error('The original wallet network, asset, custody or contract changed. Prepare a separate source review.');
 }
}
/** Exact original captured when the local confirmation is opened. */
export function deviceReviewSnapshot(w:ProductWorld,id:string){
 const matches=w.objects.filter(o=>o.id===id);if(matches.length!==1)throw new Error('Review the exact original record.');
 const record=matches[0].kind==='device'?ownDevice(w,id):ownRecovery(w,id);
 if(record.kind==='recovery-review')sourceCurrent(w,record as RecoveryRecord);
 return JSON.stringify({owner:w.owner,publicId:w.identity.publicId,record,wallet:record.kind==='recovery-review'&&record.area==='wallet'?w.wallets.filter(x=>x.id===record.sourceId):null});
}
export function applyDeviceRecovery(w:ProductWorld,op:string,data:Record<string,string>,ctx:Partial<ActionContext>,now=Date.now()):{objectId:string;message:string}|null{
 if(!op.startsWith('device.')&&!op.startsWith('recovery.'))return null;
 if(!w.identity.signedIn||(ctx.personId&&ctx.personId!==w.owner))throw new Error('Sign in to manage your own devices and recovery.');
 if(!Number.isFinite(now))throw new Error('Check the current time first.');
 if(data.review&&data.review!==deviceReviewSnapshot(w,ctx.objectId||''))throw new Error('This original changed after review. Cancel and review the current record.');
 const requestId=(data.requestId||'').trim();
 if(op==='device.request'){
  const name=(data.name||'').trim(),platform=data.platform;
  if(!name||name.length>80||!['iPhone / iPad','Android','Desktop'].includes(platform)||!requestId||requestId.length>120)throw new Error('Name this device and choose its platform before preparing the sample request.');
  const prior=data.supersedesDeviceId?ownDevice(w,data.supersedesDeviceId):null;
  const originals=w.objects.filter(o=>o.owner===w.owner&&o.kind==='device'&&o.requestId===requestId);if(originals.length>1)throw new Error('Several device records use this request. Review the originals; no device was selected.');const old=originals[0];if(old)ownDevice(w,old.id);
  if(old){if(old.name!==name||old.platform!==platform||String(old.supersedesDeviceId||'')!==String(prior?.id||''))throw new Error('This original device request has different details. Prepare a new request.');return {objectId:old.id,message:'The same device request is already prepared. No second device was added.'};}
  const id=localPreviewId();const record:DeviceRecord={id,owner:w.owner,kind:'device',format:'crays.device-preview.v1',name,platform,requestId,supersedesDeviceId:prior?.id||'',status:'pending-owner-approval',version:1,requestedAt:now,expiresAt:now+DEVICE_REQUEST_TTL,localAccess:'denied',remoteSession:'not-connected',events:[{at:now,action:'request-prepared',version:1}],fictional:true};w.objects.unshift(record);
  return {objectId:id,message:'Device request prepared. No session, signer, chat history or wallet access was granted.'};
 }
 if(['device.approve','device.decline','device.revoke','device.reconcile'].includes(op)){
  const r=ownDevice(w,ctx.objectId||'');
  if(data.version!==String(r.version??0))throw new Error('This device changed. Review its current state before acting.');
  if(now<Number(r.requestedAt||0))throw new Error('The clock is earlier than this request. Check it before continuing.');
  if(data.confirmed!=='Yes')throw new Error('Review and confirm this exact device first.');
  if(op==='device.approve'||op==='device.decline'){
   if(!devicePending(r,now))throw new Error('This request is expired, closed or from an older preview. Prepare a new request; previous rights are not restored.');
   if(op==='device.approve'&&data.code!==DEVICE_SAMPLE_CODE)throw new Error('The sample pairing code does not match. The device remains unapproved.');
   r.status=op==='device.approve'?'approved-preview':'declined';r.localAccess=op==='device.approve'?'approved-preview':'denied';r.remoteSession=op==='device.approve'?'sample-approved-no-real-session':'not-connected';
  }else if(op==='device.revoke'){
   if(['revocation-pending','revoked-preview','revocation-needs-help','declined'].includes(String(r.status)))return {objectId:r.id,message:'Access already remains denied for this original device. No new external request was sent.'};
   if(r.format!=='crays.device-preview.v1')r.legacyStatus=r.status;
   r.status='revocation-pending';r.localAccess='denied';r.remoteSession='unknown';
  }else{
   if(!['revocation-pending','revocation-needs-help'].includes(String(r.status)))throw new Error('Only the original unresolved revocation may be checked.');
   if(!['Confirmed sample','Still unknown','Provider unavailable'].includes(data.outcome))throw new Error('Choose the sample response for this original revocation.');
   r.status=data.outcome==='Confirmed sample'?'revoked-preview':data.outcome==='Provider unavailable'?'revocation-needs-help':'revocation-pending';r.remoteSession=data.outcome==='Confirmed sample'?'revocation-confirmed-sample':data.outcome==='Provider unavailable'?'not-confirmed-provider-unavailable':'unknown';r.localAccess='denied';
  }
  r.version=Number(r.version||0)+1;r.events=[...(Array.isArray(r.events)?r.events:[]),{at:now,action:op,version:r.version}];
  return {objectId:r.id,message:op==='device.approve'?'Device approved only in this sample. Nostr signing, private chat history and wallet access remain separate.':op==='device.decline'?'Device request declined. No access was granted.':op==='device.revoke'?'Local sample access denied. Remote-session revocation is unresolved; check this same original.':'Original revocation response recorded. Local access stays denied; no real provider was contacted.'};
 }
 if(op==='recovery.prepare'){
  const area=data.area as RecoveryArea,proof=data.proof;
  if(!RECOVERY_AREAS.includes(area)||!['Available sample proof','Partial sample proof','No sample proof'].includes(proof)||!requestId||requestId.length>120)throw new Error('Choose one recovery area and its actual sample-proof state.');
  const wallets=area==='wallet'?w.wallets.filter(x=>x.id===data.sourceId):[];const wallet=wallets.length===1?wallets[0]:null;if(area==='wallet'&&!wallet)throw new Error('Choose the exact original wallet.');
  const sourceId=wallet?.id||`${area}:${w.owner}`,sourceName=wallet?.name||({account:'Registered CRAYS sign-in',nostr:'Own Nostr identity',chats:'Own encrypted chat archive'}[area as 'account'|'nostr'|'chats']);
  const sourceFingerprint=wallet?walletBinding(wallet):`${area}:${w.owner}:${w.identity.publicId}`;
  const originals=w.objects.filter(o=>o.owner===w.owner&&o.kind==='recovery-review'&&o.requestId===requestId);if(originals.length>1)throw new Error('Several recovery reviews use this request. Review the originals; no review was selected.');const old=originals[0];if(old)ownRecovery(w,old.id);
  if(old){if(old.area!==area||old.proof!==proof||old.sourceId!==sourceId||old.publicId!==w.identity.publicId||old.sourceFingerprint!==sourceFingerprint)throw new Error('This original review has different proof or source details. Prepare another review.');return {objectId:old.id,message:'This same recovery review is already saved; no second attempt was created.'};}
  const id=localPreviewId();const r:RecoveryRecord={id,owner:w.owner,kind:'recovery-review',format:'crays.recovery-preview.v1',area,name:`${sourceName} recovery`,proof,sourceId,sourceName,sourceFingerprint,publicId:w.identity.publicId,requestId,version:1,createdAt:now,status:proof==='Available sample proof'?'ready-for-source-review':proof==='Partial sample proof'?'partial-proof':'missing-proof',events:[{at:now,action:'review-prepared',version:1}],fictional:true};w.objects.unshift(r);
  return {objectId:id,message:'Separate recovery review saved. No account, key, messages, money or licence was restored.'};
 }
 if(['recovery.start','recovery.reconcile'].includes(op)){
  const r=ownRecovery(w,ctx.objectId||'');sourceCurrent(w,r);
  if(data.version!==String(r.version))throw new Error('This recovery review changed. Open the current original.');
  if(now<r.createdAt)throw new Error('Check the current clock before continuing.');
  if(data.confirmed!=='Yes')throw new Error('Review this separate recovery area first.');
  if(op==='recovery.start'){
   if(!proofReady(r)||r.status!=='ready-for-source-review')throw new Error('Sufficient source proof is missing or this attempt already started. Use the original review; do not retry an unknown outcome.');
   const waiting=w.objects.find(o=>o.owner===w.owner&&o.kind==='recovery-review'&&o.id!==r.id&&o.area===r.area&&o.sourceId===r.sourceId&&o.publicId===r.publicId&&o.status==='awaiting-source-confirmation');
   if(waiting)throw new Error('A recovery attempt for this exact source is still unknown. Check that original attempt before starting another.');
   r.status='awaiting-source-confirmation';r.attemptId=localPreviewId();
  }else{
   if(r.status!=='awaiting-source-confirmation')throw new Error('Check only this original waiting recovery attempt.');
   if(!['Recovered sample','Still unknown','Failed sample'].includes(data.outcome))throw new Error('Choose the source response for this sample attempt.');
   r.status=data.outcome==='Recovered sample'?'recovered-sample':data.outcome==='Failed sample'?'failed-sample':'awaiting-source-confirmation';
  }
  r.version++;r.events.push({at:now,action:op,version:r.version});
  return {objectId:r.id,message:r.status==='recovered-sample'?'This one sample area has a simulated recovery receipt. Other areas, permissions and balances remain unchanged.':r.status==='failed-sample'?'Sample source reported failure. No access or funds were restored.':'Waiting on this same original sample source attempt. No automatic second attempt or restoration.'};
 }
 throw new Error('This device or recovery action is not available.');
}
