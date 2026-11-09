import {mayPurchaseCreatorOffer, type ActionContext, type Entity, type Payment, type ProductWorld} from './productModel.ts';
import {creatorPromotionPrice} from './creatorPromotion.ts';
import {currentCreatorOffer} from './creatorUSDPreview.ts';
import {requireCreatorRenewal, requireCreatorTerm} from './creatorPaymentTerms.ts';

/** Presentation binding only. The existing wallet/entitlement operations remain authoritative. */
export function creatorRenewalReview(world:ProductWorld, accessId:string, now=Date.now()) {
  if(!world.identity.signedIn)throw Error('Sign in to review your own content membership.');
  const uniqueObject=(id:string):Entity=>{
    const matches=world.objects.filter(o=>o.id===id);
    if(matches.length!==1)throw Error('This original is missing or ambiguous. Keep its existing payment record.');
    return matches[0];
  };
  const access=uniqueObject(accessId);
  if(access.owner!==world.owner||access.kind!=='subscription')throw Error('Choose your own exact content membership.');
  const offer=uniqueObject(String(access.offerId||''));
  if(!currentCreatorOffer(world,offer)||offer.type!=='subscription'||!mayPurchaseCreatorOffer(world,offer))throw Error('This membership has no currently available USD renewal offer. Your existing rights and receipts are retained.');
  if(offer.expires&&(!Number.isFinite(Date.parse(String(offer.expires)))||Date.parse(String(offer.expires))<=now))throw Error('This renewal offer has ended. Your existing membership is unchanged.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(String(offer.price))||Number(offer.price)<=0)throw Error('The current renewal needs a valid, explicit USD price.');
  if(!String(offer.conditions||'').trim())throw Error('The creator must supply the current access terms before renewal.');
  const posts=world.posts.filter(p=>p.id===offer.postId);
  if(posts.length!==1||posts[0].author!==offer.sellerId)throw Error('Review the exact creator and original before renewing.');
  const people=world.people.filter(p=>p.id===offer.sellerId);
  if(people.length>1||people.some(p=>p.blocked||p.blockedByOther))throw Error('Renewal is unavailable for this creator. Your original receipts remain separate.');
  requireCreatorTerm(offer,now);
  const renewal=requireCreatorRenewal(world,offer,accessId);
  if(world.payments.filter(p=>p.id===renewal.previous.id).length!==1)throw Error('The previous settled payment needs its unique original.');
  const applied=world.objects.filter(o=>o.owner===world.owner&&o.kind==='entitlement-payment'&&o.paymentId===renewal.previous.id&&o.entitlementId===accessId);
  if(applied.length!==1)throw Error('Review the original payment application before extending this membership.');
  const context:ActionContext={featureId:'AL-174',objectId:offer.id,offerId:offer.id,postId:String(offer.postId),sourceId:String(offer.postId),personId:String(offer.sellerId),renewalOf:accessId};
  const pricing=creatorPromotionPrice(offer,now);
  const snapshot=JSON.stringify({owner:world.owner,access:access.id,end:renewal.end,previous:renewal.previous.id,pricing:pricing.snapshot,offer:offer.id,version:offer.version,price:offer.price,currency:offer.currency,term:offer.term,conditions:offer.conditions,expires:offer.expires||'',seller:offer.sellerId,post:offer.postId});
  return {...renewal,offer,context,snapshot,pricing};
}

/** Only this buyer's uniquely identified original attempts; never another subscription's. */
export function creatorRenewalPayments(world:ProductWorld,accessId:string):Payment[] {
  if(!world.identity.signedIn)return [];
  const originals=world.objects.filter(o=>o.id===accessId);
  if(originals.length!==1||originals[0].owner!==world.owner||originals[0].kind!=='subscription')return [];
  const access=originals[0];
  return world.payments.filter(p=>p.owner===world.owner&&p.renewalOf===accessId&&p.offerId===access.offerId&&p.sourceId===access.postId&&p.recipient===access.sellerId&&world.payments.filter(n=>n.id===p.id).length===1);
}
