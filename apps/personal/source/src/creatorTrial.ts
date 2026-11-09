import type {ActionContext,Entity,Post,ProductWorld} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
export type CreatorTrialDependencies={mayRead:(w:ProductWorld,p:Post)=>boolean;hasCreatorMembership:(w:ProductWorld)=>boolean;mayPurchaseCreatorOffer:(w:ProductWorld,o:Entity)=>boolean};
const need:(v:unknown,m:string)=>asserts v=(v,m)=>{if(!v)throw Error(m);};
const unique=(w:ProductWorld,id:unknown,kind:string)=>{const matches=w.objects.filter(o=>o.id===id);return matches.length===1&&matches[0].kind===kind?matches[0]:undefined;};
/** Local change detector only, never a cryptographic digest, signature or production access authority.
 * Full original text and media URLs stay out of invitation/grant metadata. */
export function trialContentSnapshot(post:Post){
 const canonical=JSON.stringify({id:post.id,author:post.author,title:post.title,text:post.text,fullText:post.fullText||'',type:post.type,protected:post.protected,audience:post.audience,venueId:post.venueId||'',groupId:post.groupId||'',mediaId:post.mediaId||'',image:post.image||'',images:post.images||[],demoMedia:post.demoMedia||[],revision:post.publishing?.revision||0,media:post.publishing?.media||[],format:post.publishing?.format||'',storyExpiresAt:post.publishing?.storyExpiresAt||0});
 let first=0x811c9dc5,second=0x9e3779b9;
 for(let i=0;i<canonical.length;i++){const unit=canonical.charCodeAt(i);first=Math.imul(first^unit,0x01000193)>>>0;second=Math.imul(second^(unit+i),0x85ebca6b)>>>0;}
 return JSON.stringify({sourceId:post.id,sourceRevision:post.publishing?.revision||0,method:'local-preview-only-noncryptographic-fingerprint',fingerprint:first.toString(16).padStart(8,'0')+second.toString(16).padStart(8,'0')});
}
export function trialOfferSnapshot(offer:Entity){return JSON.stringify({id:offer.id,owner:offer.owner,sellerId:offer.sellerId,postId:offer.postId,version:String(offer.version),name:offer.name,conditions:offer.conditions,price:offer.price,currency:offer.currency,term:offer.term,type:offer.type,audience:offer.audience,venueId:offer.venueId||'',purchaseEligibility:offer.purchaseEligibility,recipientIds:offer.recipientIds||[],trialDays:offer.trialDays,trialExpiry:offer.trialExpiry,expires:offer.expires||''});}
function linkShape(link:Entity|undefined){return !!link&&link.kind==='trial-link'&&link.trialSource==='explicit-creator-trial-preview'&&link.owner===link.sellerId&&typeof link.recipientId==='string'&&!!link.recipientId&&link.recipientId!==link.sellerId&&link.automaticBilling===false&&Number.isSafeInteger(link.days)&&Number(link.days)>0&&Number.isFinite(Number(link.expiresAt))&&typeof link.contentSnapshot==='string'&&typeof link.offerSnapshot==='string'&&typeof link.offerId==='string'&&typeof link.postId==='string'&&link.scope==='one-original-post';}
/** Recipient review only. The opaque path contains neither buyer data nor content URLs. */
export function receivedCreatorTrial(w:ProductWorld,id:string,now=Date.now()){
 const link=unique(w,id,'trial-link');if(!w.identity.signedIn||!linkShape(link)||link!.recipientId!==w.owner)return;
 const offer=unique(w,link!.offerId,'public-creator-offer'),posts=w.posts.filter(p=>p.id===link!.postId),post=posts[0];
 if(!offer||offer.owner!==link!.sellerId||offer.sellerId!==link!.sellerId||offer.status!=='published-demo'||offer.postId!==link!.postId||String(offer.version)!==String(link!.offerVersion)||trialOfferSnapshot(offer)!==link!.offerSnapshot||posts.length!==1||post.author!==link!.sellerId||trialContentSnapshot(post)!==link!.contentSnapshot||offer.type==='paid-conversation')return;
 return {link:link!,offer,post,redeemable:link!.status==='active'&&Number(link!.expiresAt)>now};
}
/** Accepted scope is immutable; later link expiry/revocation stops new claims, not the accepted term. */
export function acceptedCreatorTrial(w:ProductWorld,id:string){
 if(!w.identity.signedIn)return;
 const link=unique(w,id,'trial-link');if(!linkShape(link)||link!.recipientId!==w.owner)return;
 const grants=w.objects.filter(o=>o.owner===w.owner&&o.kind==='creator-access'&&o.accessType==='trial'&&o.trialLinkId===id);
 if(grants.length!==1||w.objects.filter(o=>o.id===grants[0].id).length!==1)return;
 const grant=grants[0],posts=w.posts.filter(p=>p.id===link!.postId);
 if(grant.trialSource!=='explicit-creator-trial-preview'||grant.sellerId!==link!.sellerId||grant.recipientId!==w.owner||grant.offerId!==link!.offerId||grant.offerSnapshot!==link!.offerSnapshot||grant.contentSnapshot!==link!.contentSnapshot||posts.length!==1||posts[0].author!==link!.sellerId)return;
 return {link:link!,grant,post:posts[0]};
}
export function hasCreatorTrialAccess(w:ProductWorld,post:Post,now=Date.now()){
 if(!w.identity.signedIn)return false;const posts=w.posts.filter(p=>p.id===post.id);if(posts.length!==1)return false;
 return w.objects.some(g=>{
  if(g.kind!=='creator-access'||g.owner!==w.owner||g.accessType!=='trial'||g.status!=='active'||g.trialSource!=='explicit-creator-trial-preview'||g.automaticBilling!==false||g.licenceStatus!=='trial-access-only'||g.scope!=='one-original-post'||g.recipientId!==w.owner||g.postId!==post.id||g.sellerId!==posts[0].author||!Number.isFinite(Number(g.startsAt))||Number(g.startsAt)>now||!Number.isFinite(Number(g.endsAt))||Number(g.endsAt)<=now||g.contentSnapshot!==trialContentSnapshot(posts[0]))return false;
  const duplicates=w.objects.filter(o=>o.id===g.id),link=unique(w,g.trialLinkId,'trial-link');
  return duplicates.length===1&&linkShape(link)&&link!.recipientId===w.owner&&link!.sellerId===g.sellerId&&link!.offerId===g.offerId&&String(link!.offerVersion)===String(g.offerVersion)&&link!.postId===g.postId&&link!.contentSnapshot===g.contentSnapshot&&link!.offerSnapshot===g.offerSnapshot&&Number(g.startsAt)<Number(link!.expiresAt)&&Number(g.endsAt)===Number(g.startsAt)+Number(link!.days)*86400000;
 });
}
export function applyCreatorTrial(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,deps:CreatorTrialDependencies){
 if(!op.startsWith('complete.trial.'))return;
 const now=Date.now(),make=(kind:string,fields:Record<string,unknown>)=>{const entity:Entity={id:localPreviewId(),owner:w.owner,kind,createdAt:now,...fields};w.objects.unshift(entity);return entity;};
 need(w.identity.signedIn,'Join CRAYS before reviewing this personal trial.');need(w.identity.relayState!=='offline','Reconnect before sending or redeeming this trial.');
 if(op==='complete.trial.issue'){
  const offer=unique(w,ctx.objectId,'public-creator-offer');need(offer&&offer.owner===w.owner&&offer.sellerId===w.owner&&offer.status==='published-demo','Publish your exact creator offer first.');need(deps.hasCreatorMembership(w),'Active creator benefits are required.');need(w.identity.signer==='demo-connected','Connect your demo signer before issuing this invitation.');
  need(data.approved==='Yes','Review the exact content, recipient, duration and link expiry before issuing.');
  const recipientId=data.recipientId?.trim();need(!!recipientId&&recipientId!==w.owner&&w.people.filter(p=>p.id===recipientId&&!p.blocked&&!p.blockedByOther).length===1,'Choose one available recipient for this private trial.');
  need(offer.type!=='paid-conversation','This content trial does not grant a private or paid conversation.');
  need(offer.purchaseEligibility!=='Named recipients'||Array.isArray(offer.recipientIds)&&offer.recipientIds.includes(recipientId),'This recipient is outside the original offer audience.');
  const posts=w.posts.filter(p=>p.id===offer.postId),post=posts[0];need(posts.length===1&&post.author===w.owner&&deps.mayRead(w,post),'Choose your own exact permitted original content.');
  const days=Number(offer.trialDays),expiry=Date.parse(String(offer.trialExpiry||'')),end=now+days*86400000;need(Number.isSafeInteger(days)&&days>0&&Number.isSafeInteger(end)&&Number.isFinite(new Date(end).getTime())&&Number.isFinite(expiry)&&expiry>now,'Set a positive trial duration and future link expiry in the reviewed offer.');
  const offerSnapshot=trialOfferSnapshot(offer),contentSnapshot=trialContentSnapshot(post);need(data.offerSnapshot===offerSnapshot&&data.contentSnapshot===contentSnapshot,'Review this exact offer and original content before issuing its trial invitation.');
  const previous=w.objects.find(o=>o.kind==='trial-link'&&o.owner===w.owner&&o.sellerId===w.owner&&o.recipientId===recipientId&&o.offerId===offer.id&&o.offerSnapshot===offerSnapshot&&o.contentSnapshot===contentSnapshot&&o.status==='active'&&Number(o.expiresAt)>now&&linkShape(o));
  if(previous)return {objectId:previous.id,message:'This recipient already has this exact active invitation. No duplicate was issued.'};
  const link=make('trial-link',{offerId:offer.id,offerVersion:String(offer.version),sellerId:w.owner,recipientId,postId:post.id,name:`${offer.name} · trial`,days,expiresAt:expiry,status:'active',automaticBilling:false,terms:offer.conditions,scope:'one-original-post',offerSnapshot,contentSnapshot,trialSource:'explicit-creator-trial-preview'});link.path=`/?trial=${link.id}`;
  return {objectId:link.id,message:'Recipient-scoped trial invitation issued in the preview. No payment, automatic billing or chat access was created.'};
 }
 if(op==='complete.trial.redeem'){
  const received=receivedCreatorTrial(w,ctx.objectId||'',now);need(received&&received.redeemable,'This personal trial is unavailable, changed, expired, revoked or addressed to another account.');const {link,offer,post}=received;
  need(data.approved==='Yes'&&data.offerSnapshot===link.offerSnapshot,'Review this exact content, duration and no-billing trial before joining.');need(deps.mayRead(w,post)&&deps.mayPurchaseCreatorOffer(w,offer),'This offer is outside your permitted content scope.');
  const prior=w.objects.find(o=>o.kind==='creator-access'&&o.owner===w.owner&&o.accessType==='trial'&&o.sellerId===link.sellerId&&o.offerId===link.offerId);need(!prior,'This account has already used a trial for this exact offer. A reissued link cannot restart it.');
  const grant=make('creator-access',{name:link.name,sellerId:link.sellerId,recipientId:w.owner,postId:link.postId,offerId:offer.id,offerVersion:String(link.offerVersion),trialLinkId:link.id,startsAt:now,endsAt:now+Number(link.days)*86400000,status:'active',automaticBilling:false,accessType:'trial',licenceStatus:'trial-access-only',scope:'one-original-post',offerSnapshot:link.offerSnapshot,contentSnapshot:link.contentSnapshot,trialSource:'explicit-creator-trial-preview'});
  return {objectId:grant.id,message:'Your exact content trial is active until its displayed expiry. No payment, copyright licence, VIF, private chat or Spot membership was created.'};
 }
 if(op==='complete.trial.revoke'){
  const link=unique(w,ctx.objectId,'trial-link');need(linkShape(link)&&link!.owner===w.owner&&link!.sellerId===w.owner,'Choose your own original trial invitation.');need(w.identity.signer==='demo-connected'&&data.approved==='Yes','Review and approve revoking this invitation.');link!.status='revoked';
  return {objectId:link!.id,message:'No new trial can use this invitation. Already accepted trials keep their stated expiry; paid and lifetime rights remain separate.'};
 }
 throw Error('Choose a supported trial invitation action.');
}
