import {localPreviewId} from "./localPreviewId.ts";
import {
  mayRead,
  type ProductWorld,
  type ActionContext,
  type Entity,
} from "./productModel.ts";
import { reminderTime } from "./reminders.ts";
const requireThat = (condition: unknown, message: string) => {
  if (!condition) throw Error(message);
};
export function venueOfferForPost(w: ProductWorld, postId: string) {
  const p = w.posts.find((p) => p.id === postId);
  if (!p || !mayRead(w, p) || !["accepted", "partial"].includes(p.status))
    return;
  return w.objects.find(
    (o) =>
      o.kind === "venue-offer" &&
      o.postId === p.id &&
      o.publisherId === p.author &&
      p.author === `venue:${o.venueId}` &&
      p.venueId === o.venueId &&
      p.publishing?.publisherId === p.author &&
      o.version === p.publishing?.revision &&
      o.status === "published-demo" &&
      !!p.publishing?.offer &&
      Object.entries(p.publishing.offer).every(
        ([key, value]) => o[key] === value,
      ),
  );
}
export function offerTotal(price: string, guests: string) {
  requireThat(
    /^\d+(\.\d{1,2})?$/.test(price),
    "The offer needs an exact price with at most two decimal places.",
  );
  requireThat(
    /^\d+$/.test(guests) && Number(guests) > 0 && Number(guests) <= 1000,
    "Choose a valid number of guests.",
  );
  const [whole, fraction = ""] = price.split(".");
  const cents =
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) * BigInt(guests);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}
export function applyVenueOffer(
  w: ProductWorld,
  op: string,
  d: Record<string, string>,
  ctx: ActionContext,
) {
  if (!op.startsWith("complete.venue-offer.")) return;
  requireThat(w.identity.signedIn, "Sign in before requesting an offer.");
  const existing = ctx.objectId
    ? w.objects.find(
        (o) =>
          o.id === ctx.objectId &&
          o.owner === w.owner &&
          o.kind === "booking" &&
          o.offerId,
      )
    : undefined;
  if (op === "complete.venue-offer.cancel") {
    requireThat(existing, "Choose your own original offer request.");
    requireThat(!ctx.venueId||existing!.venueId===ctx.venueId,"This request belongs to a different Spot.");
    requireThat(d.approved === "Yes", "Confirm cancelling this request.");
    if (existing!.status !== "cancelled") {
      // A sent request is withdrawn locally; confirmation/refund is a separate provider outcome.
      existing!.status = "cancelled";
      existing!.cancellationAt = Date.now();
    }
    return {
      objectId: existing!.id,
      message:
        "Offer request withdrawn in preview. Any provider confirmation or payment remains separate.",
    };
  }
  requireThat(
    op === "complete.venue-offer.request",
    "This offer action is unavailable.",
  );
  requireThat(
    !ctx.objectId,
    "Return to the original request instead of creating a replacement.",
  );
  const offer = venueOfferForPost(w, ctx.postId || "");
  requireThat(offer, "This offer is not published or available to you.");
  requireThat(!ctx.venueId||ctx.venueId===offer!.venueId,"The selected Spot does not match this original offer. No request was created.");
  requireThat(offer!.currency === "USD", "This older offer needs a new USD quote from the Spot. The original price is retained; no request was created.");
  const venue = w.venues.find((v) => v.id === offer!.venueId);
  requireThat(
    venue?.operatorActive,
    "This Spot is not accepting new offer requests.",
  );
  requireThat(
    !offer!.expires || Date.parse(String(offer!.expires)) > Date.now(),
    "This offer has expired. Check the Spot’s current offers.",
  );
  requireThat(
    d.approved === "Yes" && d.expectedVersion === String(offer!.version),
    "Review and approve this exact offer version.",
  );
  requireThat(
    !offer!.date || d.date === offer!.date,
    "Choose the advertised offer date.",
  );
  const at = reminderTime(d.date, d.time, d.timezone);
  requireThat(at > Date.now(), "Choose a future date and time.");
  requireThat(
    ["Per guest", "Per booking"].includes(String(offer!.priceBasis)),
    "Ask the Spot to clarify whether this price is per guest or per booking.",
  );
  offerTotal("0", d.guests);
  const total = offerTotal(
    String(offer!.price),
    offer!.priceBasis === "Per guest" ? d.guests : "1",
  );
  requireThat(
    !offer!.capacity || Number(d.guests) <= Number(offer!.capacity),
    "This request exceeds the offer’s stated guest limit.",
  );
  const prior = w.objects.find(
    (o) =>
      o.owner === w.owner &&
      o.kind === "booking" &&
      o.offerId === offer!.id &&
      o.status !== "cancelled",
  );
  if (prior) {
    requireThat(
      prior.offerVersion === offer!.version &&
        prior.date === d.date &&
        prior.time === d.time &&
        prior.timezone === d.timezone &&
        prior.partySize === d.guests,
      "You already have a request for this offer. Open that original request.",
    );
    return {
      objectId: prior.id,
      message:
        "Your original request is already recorded. No duplicate request or payment was created.",
    };
  }
  const booking: Entity = {
    id: localPreviewId(),
    owner: w.owner,
    kind: "booking",
    name: String(offer!.name),
    venueId: venue!.id,
    sourceId: ctx.postId,
    offerId: offer!.id,
    offerVersion: offer!.version,
    publisherId: offer!.publisherId,
    date: d.date,
    time: d.time,
    timezone: d.timezone,
    partySize: d.guests,
    participants: "You and your guests",
    notes: d.notes || "",
    status: "requested",
    capacity: "Awaiting venue confirmation",
    priceStatus: `${total} ${offer!.currency} · advertised offer total; additional charges must be agreed separately`,
    offerSnapshot: {
      name: offer!.name,
      unitPrice: offer!.price,
      currency: offer!.currency,
      total,
      conditions: offer!.conditions,
      expires: offer!.expires,
    },
    createdAt: Date.now(),
    realBooking: false,
  };
  w.objects.unshift(booking);
  return {
    objectId: booking.id,
    message:
      "Offer request saved in preview. The Spot still needs to confirm availability; no payment, ticket or membership was created.",
  };
}
