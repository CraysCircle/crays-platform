import type {ProductWorld,Entity,Payment,ActionContext} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
import {chatPhotoExampleName} from './chatPhoto.ts';
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
export function paidConversationPaymentSnapshot(p:Payment){return JSON.stringify({owner:p.owner,id:p.id,source:p.sourceId,recipient:p.recipient,offer:p.offerId,version:p.offerVersion,purpose:p.purpose,offerType:p.creatorOfferType,wallet:p.walletId,asset:p.asset,network:p.network,amount:p.amount,fee:p.fee,usdQuote:p.usdQuote||null,pricing:p.creatorPricing||null});}
/** Own frozen purchase only. Current offer revisions never rewrite the accepted service. */
export function paidConversationRecord(w:ProductWorld,id:string){
 if(!w.identity.signedIn)return;
 const rows=w.objects.filter(o=>o.id===id),service=rows.length===1?rows[0]:undefined;
 if(!service||service.owner!==w.owner||service.kind!=='paid-conversation'||service.paidSource!=='paid-conversation-preview-v1')return;
 const payments=w.payments.filter(p=>p.id===service.latestPaymentId),payment=payments.length===1&&payments[0].owner===w.owner?payments[0]:undefined;
 const apps=w.objects.filter(o=>o.kind==='entitlement-payment'&&o.paymentId===service.latestPaymentId),application=apps.length===1?apps[0]:undefined;
 if(!payment||!application||w.objects.filter(o=>o.id===application.id).length!==1||application.owner!==w.owner||application.entitlementId!==service.id||application.grantKind!=='paid-conversation'||payment.purpose!=='Content purchase'||payment.creatorOfferType!=='paid-conversation'||payment.offerId!==service.offerId||payment.sourceId!==service.postId||payment.recipient!==service.sellerId||payment.offerVersion!==service.offerVersion||application.offerId!==service.offerId||String(application.offerVersion)!==String(service.offerVersion)||application.sellerId!==service.sellerId||application.postId!==service.postId||application.paymentSnapshot!==paidConversationPaymentSnapshot(payment)||application.terms!==service.terms||typeof application.terms!=='string'||!application.terms.trim()||!Number.isFinite(Number(application.startsAt))||!Number.isFinite(Number(application.endsAt))||Number(application.endsAt)<=Number(application.startsAt)||Number(service.endsAt)!==Number(application.endsAt))return;
 const snapshot=JSON.stringify({owner:w.owner,service:service.id,offer:service.offerId,version:service.offerVersion,seller:service.sellerId,post:service.postId,payment:payment.id,application:application.id,startsAt:application.startsAt,endsAt:application.endsAt,terms:application.terms});
 return {service,payment,application,snapshot};
}
export function paidConversationAccess(w:ProductWorld,id:string,now=Date.now()){
 const r=paidConversationRecord(w,id);need(r,'Open your own exact purchased conversation and its original payment application.');
 need(r.service.status==='active'&&Number(r.service.endsAt)>now&&Number(r.application.startsAt)<=now,'This purchased conversation has ended or is unavailable. Your original record remains.');
 need(r.payment.status==='confirmed','The original payment no longer grants this service.');
 const people=w.people.filter(p=>p.id===r.service.sellerId);need(people.length===1&&!people[0].blocked&&!people[0].blockedByOther,'This creator is unavailable for this conversation.');
 need(w.identity.relayState!=='offline','Reconnect before accepting or sending in this conversation.');
 return {...r,person:people[0]};
}
export function paidConversationMessages(w:ProductWorld,id:string){
 const r=paidConversationRecord(w,id);if(!r)return [];
 return w.objects.filter(o=>o.owner===w.owner&&o.kind==='paid-service-message'&&o.paidSource==='paid-conversation-preview-v1'&&o.serviceId===id&&o.paymentId===r.payment.id&&o.recipient===r.service.sellerId&&o.serviceSnapshot===r.snapshot&&w.objects.filter(n=>n.id===o.id).length===1).sort((a,b)=>Number(a.createdAt)-Number(b.createdAt));
}
export function applyPaidConversation(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('complete.paid.'))return;
 const r=paidConversationAccess(w,ctx.objectId||'');
 need(data.approved==='Yes'&&data.review===r.snapshot,'Review this exact purchased service and its original terms before continuing.');
 if(op==='complete.paid.accept'){
  need(['Yes','No'].includes(data.otherConsent)&&data.responseSource==='explicit-creator-response-example','Select the explicit fictional creator response for this exact service.');
  if(r.service.consentDecision===(data.otherConsent==='Yes'?'accepted':'declined')){need(r.service.consentSnapshot===r.snapshot,'The prior response belongs to another service review.');return {objectId:r.service.id,message:'The same example creator response is retained. No new permission was created.'};}
  r.service.recipientConsent=data.otherConsent==='Yes';r.service.consentDecision=data.otherConsent==='Yes'?'accepted':'declined';r.service.consentSnapshot=r.snapshot;r.service.consentSource='explicit-creator-response-example';r.service.consentAt=Date.now();
  return {objectId:r.service.id,message:data.otherConsent==='Yes'?'Creator acceptance selected for this local service example only. No real message, VIF or general chat permission was created.':'Creator decline or withdrawal selected for this local example. Sending is unavailable; your original history remains. Any refund needs its separate payment review.'};
 }
 if(op==='complete.paid.message'){
  need(r.service.recipientConsent===true&&r.service.consentSnapshot===r.snapshot&&r.service.consentSource==='explicit-creator-response-example','This exact purchased service needs its separate creator acceptance.');
  const text=(data.text||'').trim(),attachment=data.attachment||'';
  need(text.length<=4000&&(!attachment||attachment===chatPhotoExampleName),'Keep the message within4,000 characters and choose the bundled photo example.');need(text||attachment,'Write a message or choose a photo example.');
  need(!!data.actionKey?.trim()&&data.actionKey.length<=200,'Keep one original send reference.');
  const payload=JSON.stringify({text,attachment}),prior=paidConversationMessages(w,r.service.id).find(m=>m.actionKey===data.actionKey);
  if(prior){need(prior.payload===payload,'This send reference belongs to another message.');return {objectId:prior.id,message:'The same local message is retained. It was not sent twice.'};}
  const msg:Entity={id:localPreviewId(),owner:w.owner,kind:'paid-service-message',createdAt:Date.now(),serviceId:r.service.id,paymentId:r.payment.id,recipient:r.service.sellerId,text,attachment,status:'pending-demo',chuckIncluded:false,paidSource:'paid-conversation-preview-v1',serviceSnapshot:r.snapshot,actionKey:data.actionKey,payload};w.objects.unshift(msg);
  return {objectId:msg.id,message:'Saved inside this purchased conversation only. No real message was delivered; payment, VIF and other chats are unchanged.'};
 }
 throw Error('Choose a supported paid conversation action.');
}
