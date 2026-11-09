import type {Entity} from './productModel.ts';
import {usdMinor} from './usdCheckout.ts';

export type CreatorPromotionPrice={
  source:'creator-offer-price-review-v1';
  offerId:string;offerVersion:string;sellerId:string;postId:string;
  currency:'USD';baseMinor:number;effectiveMinor:number;price:string;
  phase:'standard'|'scheduled'|'active'|'expired';
  percentBasisPoints:number;startsAt:number|null;endsAt:number|null;
  rounding:'nearest-usd-cent-half-up';rounded:boolean;
  dateConvention:'UTC; start inclusive; end exclusive';
  nextChangeAt:number|null;reviewedAt:number;snapshot:string;
};
function decimalPrice(minor:number){return `${Math.floor(minor/100)}.${String(minor%100).padStart(2,'0')}`;}
function percent(value:unknown){
  const text=String(value);
  if(!/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/.test(text))throw Error('Enter an explicit promotion percentage from zero to below 100, with at most two decimal places.');
  const [whole,fraction='']=text.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
function boundary(value:unknown){
  const text=String(value);
  const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(text);
  if(!dateOnly&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text))throw Error('Use a valid UTC promotion date. Date-only values mean 00:00 UTC; the end is exclusive.');
  const normalized=dateOnly?`${text}T00:00:00.000Z`:text.replace(/Z$/,text.includes('.')?'Z':'.000Z');
  const valueAt=Date.parse(normalized);
  if(!Number.isFinite(valueAt)||new Date(valueAt).toISOString()!==normalized)throw Error('Use a real calendar date for this promotion.');
  return valueAt;
}
/** Price calculation only: no offer revision, publication, charge, payment ledger or entitlement is created here. */
export function creatorPromotionPrice(offer:Entity,now=Date.now()):CreatorPromotionPrice {
  if(!Number.isSafeInteger(now)||now<0)throw Error('Review the promotion time.');
  if(offer.kind!=='public-creator-offer'||offer.status!=='published-demo'||!offer.id||!offer.version||!offer.sellerId||!offer.postId||offer.currency!=='USD')throw Error('Review the exact published USD creator offer and version.');
  const baseMinor=usdMinor(String(offer.price));
  const fields=[offer.promotionPercent,offer.promotionStarts,offer.promotionEnds];
  const supplied=fields.map(v=>v!==undefined&&v!==null&&String(v)!=='');
  if(supplied.some(Boolean)&&!supplied.every(Boolean))throw Error('A promotion needs its exact percentage, start and end dates before price review.');
  let startsAt:number|null=null,endsAt:number|null=null,percentBasisPoints=0;
  let phase:CreatorPromotionPrice['phase']='standard';
  if(supplied.every(Boolean)){
    percentBasisPoints=percent(offer.promotionPercent);
    startsAt=boundary(offer.promotionStarts);endsAt=boundary(offer.promotionEnds);
    if(startsAt>=endsAt)throw Error('The promotion must end after it starts.');
    phase=now<startsAt?'scheduled':now>=endsAt?'expired':'active';
  }
  const discountedNumerator=baseMinor*(10000-percentBasisPoints);
  const effectiveMinor=phase==='active'?Math.floor((discountedNumerator+5000)/10000):baseMinor;
  if(effectiveMinor<1)throw Error('The discounted amount must remain at least 0.01 USD. Use the separate free-trial workflow for free access.');
  const nextChangeAt=phase==='scheduled'?startsAt:phase==='active'?endsAt:null;
  const pricing={source:'creator-offer-price-review-v1' as const,offerId:offer.id,offerVersion:String(offer.version),sellerId:String(offer.sellerId),postId:String(offer.postId),currency:'USD' as const,baseMinor,effectiveMinor,price:decimalPrice(effectiveMinor),phase,percentBasisPoints,startsAt,endsAt,rounding:'nearest-usd-cent-half-up' as const,rounded:phase==='active'&&discountedNumerator%10000!==0,dateConvention:'UTC; start inclusive; end exclusive' as const,nextChangeAt};
  // Capture commercial terms as well as price, so a changed offer cannot inherit approval.
  const snapshot=JSON.stringify({...pricing,offerType:String(offer.type||''),serviceValidUntil:String(offer.serviceValidUntil||''),serviceTimezone:String(offer.serviceTimezone||''),terms:String(offer.conditions||''),term:String(offer.term||''),saleDeadline:String(offer.expires||''),eligibility:String(offer.purchaseEligibility||''),audience:String(offer.audience||''),venueId:String(offer.venueId||'')});
  return {...pricing,reviewedAt:now,snapshot};
}

/** Historical verification uses the original review time. Supply now only for a new preparation/submission. */
export function requireCreatorPromotionPrice(value:unknown,offer:Entity,now?:number):CreatorPromotionPrice {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Review this original offer price first.');
  const review=value as CreatorPromotionPrice;
  const expected=creatorPromotionPrice(offer,review.reviewedAt);
  if(Object.keys(review).length!==Object.keys(expected).length||Object.entries(expected).some(([key,v])=>review[key as keyof CreatorPromotionPrice]!==v))throw Error('The original price or promotion review changed. Review the current offer again.');
  if(now!==undefined&&(now<review.reviewedAt||creatorPromotionPrice(offer,now).snapshot!==review.snapshot))throw Error('The promotion or current terms changed. Review a fresh offer price before paying.');
  return review;
}
