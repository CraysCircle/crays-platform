import type { Entity, Payment, ProductWorld } from "./productModel.ts";
import {requireUSDCheckoutQuote} from './usdCheckout.ts';
import {requireCreatorPromotionPrice} from './creatorPromotion.ts';

// Design-only bindings. No provider, financial execution or real rights issuance.
export function creatorPaymentMatches(payment: Payment, offer: Entity) {
  if(payment.creatorOfferType&&payment.creatorOfferType!==String(offer.type||''))return false;
  let price=String(offer.price);
  try{if(payment.creatorPricing)price=requireCreatorPromotionPrice(payment.creatorPricing,offer).price;
  else if([offer.promotionPercent,offer.promotionStarts,offer.promotionEnds].some(v=>v!==undefined&&v!==null&&String(v)!==''))return false;}catch{return false;}
  if(payment.usdQuote){
    try{
      const q=requireUSDCheckoutQuote(payment.usdQuote,{owner:payment.owner,sourceId:String(offer.postId),recipient:String(offer.sellerId),purpose:'Content purchase',offerId:offer.id,offerVersion:String(offer.version),walletId:payment.walletId,asset:payment.asset,network:payment.network,usdAmount:price});
      return offer.currency==='USD'&&payment.purpose==='Content purchase'&&payment.offerId===offer.id&&payment.offerVersion===String(offer.version)&&payment.sourceId===offer.postId&&payment.recipient===offer.sellerId&&payment.amount===q.principal&&payment.fee===q.fee;
    }catch{return false;}
  }
  return (
    payment.purpose === "Content purchase" &&
    payment.offerId === offer.id &&
    payment.offerVersion === String(offer.version) &&
    payment.sourceId === offer.postId &&
    payment.recipient === offer.sellerId &&
    payment.asset === offer.currency &&
    Number(payment.amount) === Number(price)
  );
}

export function creatorSubscriptionMonths(offer: Entity): number | undefined {
  const terms: Record<string, number> = {
    "1 month": 1,
    "Monthly content subscription": 1,
    "3 months": 3,
    "6 months": 6,
    "12 months": 12,
  };
  return Object.hasOwn(terms, String(offer.term))
    ? terms[String(offer.term)]
    : undefined;
}

export function creatorServiceValidity(offer: Entity, now = Date.now()) {
  const raw = offer.serviceValidUntil;
  // A separately declared absolute service validity is not an offer sale deadline.
  if (
    typeof raw !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)
  )
    return undefined;
  const end = Date.parse(raw);
  if (
    !Number.isFinite(end) ||
    end <= now ||
    new Date(end).toISOString().replace(".000Z", "Z") !==
      raw.replace(".000Z", "Z")
  )
    return undefined;
  return end;
}

export function requireCreatorTerm(offer: Entity, now = Date.now()) {
  if (offer.type === "subscription" && !creatorSubscriptionMonths(offer))
    throw new Error(
      "This subscription needs an explicit supported access term before payment.",
    );
  if (offer.type === "paid-conversation" && !creatorServiceValidity(offer, now))
    throw new Error(
      "This paid conversation needs its explicit service validity before payment; no monthly term is assumed.",
    );
}

export function creatorAccessForOffer(w: ProductWorld, offer: Entity) {
  return w.objects.find(
    (o) =>
      o.owner === w.owner &&
      ["subscription", "paid-conversation"].includes(String(o.kind)) &&
      (o.offerId === offer.id || o.sourceId === offer.id),
  );
}

export function requireCreatorRenewal(
  w: ProductWorld,
  offer: Entity,
  renewalOf: string,
) {
  const access = w.objects.find(
    (o) =>
      o.id === renewalOf && o.owner === w.owner && o.kind === "subscription",
  );
  if (
    !access ||
    offer.type !== "subscription" ||
    access.offerId !== offer.id ||
    access.sellerId !== offer.sellerId ||
    access.postId !== offer.postId ||
    !["active", "ending", "expiring", "expired"].includes(String(access.status))
  )
    throw new Error(
      "Renew only your exact existing subscription, seller and original offer.",
    );
  const end = Number(access.endsAt || Date.parse(String(access.ends || "")));
  if (!Number.isFinite(end) || end <= 0)
    throw new Error(
      "The existing subscription expiry must be verified before renewal.",
    );
  const previous = w.payments.find(
    (p) =>
      p.id === access.latestPaymentId &&
      p.owner === w.owner &&
      p.status === "confirmed" &&
      typeof p.offerVersion === "string" &&
      p.offerVersion.length > 0 &&
      p.purpose === "Content purchase" &&
      p.offerId === offer.id &&
      p.sourceId === offer.postId &&
      p.recipient === offer.sellerId,
  );
  if (
    !previous ||
    !w.objects.some(
      (o) =>
        o.owner === w.owner &&
        o.kind === "entitlement-payment" &&
        o.paymentId === previous.id &&
        o.offerId === offer.id &&
        o.offerVersion === previous.offerVersion &&
        o.entitlementId === access.id,
    )
  )
    throw new Error(
      "Reconcile the previous settled payment and its exact access application before renewal.",
    );
  return { access, previous, end };
}

export function requirePreparedRenewal(
  w: ProductWorld,
  offer: Entity,
  payment: Payment,
) {
  if (!payment.renewalOf) {
    if (creatorAccessForOffer(w, offer))
      throw new Error(
        "Existing access needs an explicitly reviewed renewal; a second purchase cannot extend it.",
      );
    return undefined;
  }
  const renewal = requireCreatorRenewal(w, offer, payment.renewalOf);
  if (
    renewal.previous.id !== payment.renewalBasePaymentId ||
    renewal.end !== payment.renewalBaseEndsAt
  )
    throw new Error(
      "This subscription changed after payment preparation. Review the original renewal again.",
    );
  return renewal;
}
