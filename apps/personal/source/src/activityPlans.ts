import {pickupRecord} from './orderPickupPreview.ts';
import type { Entity, ProductWorld } from "./productModel.ts";
export function planState(p: Entity) {
  if(p.kind==='order'&&p.status==='placed-demo'&&pickupRecord(p)?.state==='collected')return 'completed';
  return String(p.kind === "event" ? p.attendance : p.kind === "order" && p.status === "placed-demo" && p.fulfilment === "Delivered" ? "delivered" : p.status);
}
export function planLabel(p: Entity) {
  if(p.kind==='booking'&&p.bookingType==='travel')return ({review:'Travel booking to review',requested:'Demo request awaiting reply',unknown:'Demo request needs checking',confirmed:'Demo booking confirmed',unavailable:'Demo option unavailable','cancellation-requested':'Demo cancellation awaiting reply',cancelled:'Travel preview cancelled'} as Record<string,string>)[String(p.status)]||'Check your travel preview';
  if (p.kind === "order") {
    const pickup=pickupRecord(p);if(p.status==='placed-demo'&&pickup)return pickup.acknowledgement?.state==='unknown'?'Example · collection needs checking':({accepted:'Example · seller accepted',preparing:'Example · being prepared',ready:'Example · ready to collect',unavailable:'Example · seller cannot fulfil',collected:'Example · collected'} as Record<string,string>)[pickup.state];
    if (p.status === "placed-demo") return ({"Awaiting seller acceptance":"Awaiting venue acceptance",Accepted:"Accepted",Preparing:"Being prepared","Ready for pickup":"Ready for pickup",Delivered:"Delivered"} as Record<string,string>)[String(p.fulfilment)] || "Check the venue response";
    return ({"quote-requested":"Waiting for your quote",declined:"Seller cannot fulfil this request",quoted:"Quote ready to review",cancelled:"Request cancelled","cancellation-requested":"Cancellation awaiting response",failed:"Order attempt failed",unknown:"Check the order’s status"} as Record<string,string>)[String(p.status)] || "Check the latest order update";
  }
  return (
    {
      requested: "Waiting for confirmation",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      declined: "Not going",
      interested: "Interested",
      draft: "Ready to review",
      prepared: "Ready to review",
      "quote-required": "Waiting for a quote",
      "change-requested": "Change awaiting confirmation",
      placed: "Order received",
      "placed-demo": "Order received",
      preparing: "Being prepared",
      delivered: "Delivered",
      going: "Going",
    }[planState(p)] || "Check the latest update"
  );
}
export function planDate(p: Entity) {
  const s = String(p.date || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}
export function localToday(now = Date.now(), timezone = "Europe/Berlin") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function dateParts(p: Entity) {
  const date = planDate(p);
  if (!date) return { day: "—", month: "DATE", full: "Date to be arranged" };
  const d = new Date(date + "T12:00:00Z");
  return {
    day: String(d.getUTCDate()),
    month: d
      .toLocaleDateString("en", { month: "short", timeZone: "UTC" })
      .toUpperCase(),
    full: d.toLocaleDateString("en", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }),
  };
}
export function activityPlans(w: ProductWorld, now = Date.now()) {
  const all = w.objects.filter(
    (o) =>
      o.owner === w.owner &&
      (["booking", "order", "meeting", "reservation"].includes(
        String(o.kind),
      ) ||
        (o.kind === "event" &&
          ["going", "interested", "confirmed", "requested"].includes(
            String(o.attendance),
          ))),
  );
  const isHistory = (o: Entity) =>
    ["cancelled", "declined", "delivered", "completed"].includes(
      planState(o),
    ) ||
    !!(
      planDate(o) &&
      planDate(o) < localToday(now, String(o.timezone || "Europe/Berlin"))
    );
  const sort = (a: Entity, b: Entity) =>
    (planDate(a) || "9999").localeCompare(planDate(b) || "9999") ||
    String(a.time || "").localeCompare(String(b.time || ""));
  return {
    upcoming: all.filter((o) => !isHistory(o) && planDate(o)).sort(sort),
    undated: all.filter((o) => !isHistory(o) && !planDate(o)).sort(sort),
    history: all.filter(isHistory).sort(sort).reverse(),
  };
}
