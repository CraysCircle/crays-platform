import type {ComponentProps} from 'react';
import {USDCheckoutComposer} from './USDCheckoutComposer';
import {creatorPromotionPrice,type CreatorPromotionPrice} from './creatorPromotion';
import type {Entity} from './productModel';
import {usePreviewExpiry} from './usePreviewExpiry';
export function CreatorPriceContext({pricing}:{pricing:CreatorPromotionPrice|undefined}){
 if(!pricing||pricing.phase==='standard')return null;
 const date=(n:number|null)=>n===null?'Not set':new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(n)+' · UTC';
 return <section className="context-note" aria-label="Creator promotion price"><strong>{pricing.phase==='active'?`${pricing.percentBasisPoints/100}% creator promotion`:pricing.phase==='scheduled'?'Upcoming creator promotion':'Creator promotion ended'}</strong><p>{pricing.phase==='active'?`Standard price ${(pricing.baseMinor/100).toFixed(2)} USD. Offer price ${pricing.price} USD, until ${date(pricing.endsAt)}.`:pricing.phase==='scheduled'?`The standard price applies now. Promotion starts ${date(pricing.startsAt)} and ends ${date(pricing.endsAt)}.`:`The standard price applies to a new review. Earlier payments retain their original prices.`}</p>{pricing.rounded&&<p>Discounted price rounded to the nearest USD cent.</p>}<p className="source-caption">Start included; end excluded. Fees are reviewed separately.</p></section>;
}
export function CreatorPromotionCheckout({offer,...props}:ComponentProps<typeof USDCheckoutComposer>&{offer:Entity|undefined}){
 let pricing:CreatorPromotionPrice|undefined,error='';
 try{if(offer)pricing=creatorPromotionPrice(offer);}catch(e){error=e instanceof Error?e.message:'Review the current creator price.';}
 usePreviewExpiry(pricing?.nextChangeAt||NaN);
 if(error)return <p className="notice" role="alert">{error} Return to the creator’s current offer before preparing a payment.</p>;
 return <><CreatorPriceContext pricing={pricing}/><USDCheckoutComposer {...props} binding={{...props.binding,usdAmount:pricing?.price||props.binding.usdAmount}}/></>;
}
export function CreatorPriceLabel({offer}:{offer:Entity}){
 let pricing:CreatorPromotionPrice|undefined,error='';
 try{if(offer.currency==='USD'&&Number(offer.price)>0)pricing=creatorPromotionPrice(offer);}catch{error='Price needs review';}
 usePreviewExpiry(pricing?.nextChangeAt||NaN);
 return <>{error||`${pricing?.price||String(offer.price)} ${String(offer.currency)}${pricing?.phase==='active'?` · ${pricing.percentBasisPoints/100}% promotion`:''}`}</>;
}
