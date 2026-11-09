import {createEventSeriesPreview,applyEventSeriesChange,type EventSeriesInput,type EventSeriesChange} from './eventSeries.ts';
import {applyVisitJourney} from './visitJourney.ts';
import {applyCircleAccess,type CircleAccessAction} from './circleAccess.ts';
import {artistNftOfferSpec,artistNftForOffer,requireArtistNftAvailable} from './artistNft.ts';
import {assessmentDisclosureReview} from './assessmentDisclosure.ts';
import {applyPaidConversation,paidConversationPaymentSnapshot} from './paidConversation.ts';
import {applyCreatorTrial} from './creatorTrial.ts';
import {creatorPromotionPrice} from './creatorPromotion.ts';
import {applySpotCommunityEvidence} from './spotCommunityEvidence';
import {localPreviewId} from "./localPreviewId.ts";
import { applyChuckTaskCosts } from "./chuckTaskCosts.ts";
import { applyCraysPlan } from "./craysPlans.ts";
import { applyVenueSetup } from "./venueSetup.ts";
import {
  creatorPaymentMatches,
  creatorSubscriptionMonths,
  creatorServiceValidity,
  requireCreatorTerm,
  requirePreparedRenewal,
} from "./creatorPaymentTerms.ts";
import { applyVenueOffer } from "./venueOffers.ts";
import { applyAffiliationVisibility } from "./profileAffiliations.ts";
import { applyPublishing } from "./publishing.ts";
import { applyPersonalPlan } from "./personalPlans.ts";
import { applyReminder } from "./reminders.ts";
import { applyTrainingCalendar } from './trainingCalendar.ts';
import { applyAppConnection } from "./appConnections.ts";
import type {
  ProductWorld,
  Entity,
  Post,
  ActionContext,
} from "./productModel.ts";
import {
  canDirectMessage,
  canGroupCommunicate,
} from "./communicationPolicy.ts";
type Dependencies = {
  mayRead: (w: ProductWorld, p: Post) => boolean;
  hasCreatorMembership: (w: ProductWorld, personId?: string) => boolean;
  mayPurchaseCreatorOffer: (w: ProductWorld, offer: Entity) => boolean;
};
const uid = () => localPreviewId();
function requireThat(test: unknown, message: string): asserts test {
  if (!test) throw new Error(message);
}
const dateValue = (value: unknown) => Date.parse(String(value || ""));
export function liveGrant(g: Entity, now = Date.now()) {
  return (
    g.status === "active" &&
    (!g.endsAt || Number(g.endsAt) > now) &&
    (!g.expiresAt || Number(g.expiresAt) > now)
  );
}
function addMonths(time: number, months: number) {
  const d = new Date(time);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime();
}
export function applyCompletionAction(
  w: ProductWorld,
  op: string,
  data: Record<string, string>,
  ctx: ActionContext,
  deps: Dependencies,
): { objectId: string; message: string } | undefined {
  if (!op.startsWith("complete.")) return;
  const chuckCostResult = applyChuckTaskCosts(w, op, data, ctx);
  if (chuckCostResult) return chuckCostResult;
  const craysPlanResult = applyCraysPlan(w, op, data, ctx);
  if (craysPlanResult) return craysPlanResult;
  const venueSetupResult = applyVenueSetup(w, op, data, ctx);
  if (venueSetupResult) return venueSetupResult;
  const venueOfferResult = applyVenueOffer(w, op, data, ctx);
  if (venueOfferResult) return venueOfferResult;
  const affiliationResult = applyAffiliationVisibility(w, op, data);
  if (affiliationResult) return affiliationResult;
  const publicationResult = applyPublishing(w, op, data, ctx);
  if (publicationResult) return publicationResult;
  const personalPlanResult = applyPersonalPlan(w, op, data, ctx);
  if (personalPlanResult) return personalPlanResult;
  const reminderResult = applyReminder(w, op, data, ctx);
  if (reminderResult) return reminderResult;
  const trainingCalendarResult = applyTrainingCalendar(w, op, data, ctx);
  if (trainingCalendarResult) return trainingCalendarResult;
  if(op.startsWith('complete.app.')&&ctx.personId&&ctx.personId!==w.owner)throw Error('Only your own account may change these app permissions and requests.');
  const appResult = applyAppConnection(w, op, data, ctx.objectId);
  if (appResult) return appResult;
  const now = Date.now();
  const own = (id: unknown, kind?: string) =>
    w.objects.find(
      (o) => o.id === id && o.owner === w.owner && (!kind || o.kind === kind),
    );
  const make = (kind: string, fields: Record<string, unknown>) => {
    const o: Entity = {
      id: uid(),
      owner: w.owner,
      kind,
      createdAt: now,
      ...fields,
    };
    w.objects.unshift(o);
    return o;
  };
  const result = (o: Entity, message: string) => ({ objectId: o.id, message });
  const venue = w.venues.find((v) => v.id === (ctx.venueId || w.activeVenueId));
  const activeSpace = () =>
    Boolean(
      venue?.operatorActive &&
      ["active", "provisional"].includes(venue.membership),
    );
  const signer = () =>
    requireThat(
      w.identity.signedIn &&
        w.identity.signer === "demo-connected" &&
        w.identity.relayState !== "offline",
      "Connect your demo signer and network before approving publication.",
    );
  if (op === "complete.task.control") {
    const task = own(ctx.objectId, "agent-task");
    requireThat(task, "Choose your own Chuck task.");
    requireThat(w.identity.signedIn, "Sign in before changing a task.");
    requireThat(
      ["Pause", "Resume", "Cancel"].includes(data.action),
      "Choose a task action.",
    );
    requireThat(
      !["cancelled", "stopped"].includes(String(task.status)),
      "This task was stopped. Start a new reviewed request instead.",
    );
    if (["Pause", "Cancel"].includes(data.action)) {
      w.objects.filter(o=>o.owner===w.owner&&o.kind==="chuck-cost-review"&&o.taskId===task.id&&o.status==="approved").forEach(review=> {
        applyChuckTaskCosts(w,"complete.task.cost.revoke",{approved:"Yes"},{...ctx,objectId:review.id});
      });
    }
    if (data.action === "Pause") {
      requireThat(
        !["completed", "succeeded"].includes(String(task.status)),
        "This result is already complete.",
      );
      task.previousStatus = task.status;
      task.status = "paused";
    }
    if (data.action === "Resume") {
      requireThat(
        task.status === "paused",
        "Only a paused task can be resumed.",
      );
      task.status = task.previousStatus || "prepared-not-executed";
      task.previousStatus = undefined;
    }
    if (data.action === "Cancel") {
      requireThat(
        data.approved === "Yes",
        "Confirm stopping this task. Existing bookings and payments are separate.",
      );
      task.status = "cancelled";
      task.stoppedAt = now;
    }
    return result(
      task,
      data.action === "Cancel"
        ? "This task is stopped. Existing reservations, payments and shared messages were not reversed."
        : data.action === "Pause"
          ? "Chuck’s work is paused. Your original request, drafts and results remain."
          : "The same task is ready to continue. Current permissions are checked again by each action.",
    );
  }
  if (op === "complete.offer.publish") {
    const draft = own(ctx.objectId, "creator-offer");
    requireThat(draft, "Choose your saved offer draft.");
    requireThat(draft.currency==='USD',"New offers require reviewed USD terms; no conversion of older asset prices is assumed.");
    requireThat(
      deps.hasCreatorMembership(w),
      "Your Caster membership and active creator benefits are required.",
    );
    signer();
    requireThat(
      data.approved === "Yes",
      "Review the exact offer before publication.",
    );
    const post = w.posts.find(
      (p) => p.id === draft.postId && p.author === w.owner,
    );
    requireThat(
      post && ["accepted", "partial"].includes(post.status),
      "Publish your original content through its own signing review first.",
    );
    requireThat(
      String(draft.conditions || "").trim(),
      "Add the access and licence terms.",
    );
    requireThat(
      draft.price !== "" &&
        Number.isFinite(Number(draft.price)) &&
        Number(draft.price) >= 0,
      "Set an explicit price, including zero for free access.",
    );
    if (draft.purchaseEligibility === "Named recipients")
      requireThat(
        Array.isArray(draft.namedRecipients) && draft.namedRecipients.length,
        "Choose the named recipients before publishing.",
      );
    if (draft.audience === "Community")
      requireThat(
        post.venueId &&
          w.venues.some(
            (v) =>
              v.id === post.venueId &&
              v.operatorActive &&
              ["active", "provisional"].includes(v.membership),
          ),
        "The original needs the permitted Spot context.",
      );
    const existing = w.objects.find(
      (o) =>
        o.owner === w.owner &&
        o.kind === "public-creator-offer" &&
        o.sourceDraftId === draft.id,
    );
    const artistSpec=draft.format==='Artist NFT'?artistNftOfferSpec(w,String(draft.artistNftId||'')):undefined;
    requireThat(!artistSpec||JSON.stringify(artistSpec)===JSON.stringify(draft.artistNft),"The artwork specification changed. Review the same original edition.");
    const snapshot = {
      artistNft:artistSpec,
      sourceDraftId: draft.id,
      sellerId: w.owner,
      postId: post.id,
      name: draft.name,
      price: String(draft.price),
      currency: draft.currency,
      term: draft.term,
      serviceValidUntil: draft.serviceValidUntil,
      serviceTimezone: draft.serviceTimezone,
      conditions: draft.conditions,
      purchaseEligibility: draft.purchaseEligibility,
      audience: draft.audience,
      venueId: post.venueId,
      type:
        draft.format === "Artist NFT" ? "artist-nft" : draft.format === "Paid conversation"
          ? "paid-conversation"
          : /month|subscription/.test(String(draft.term))
            ? "subscription"
            : "single",
      version: String(Number(existing?.version || 0) + 1),
      status: "published-demo",
      expires: draft.expires,
      trialDays: draft.trialDays,
      trialExpiry: draft.trialExpiry,
      promotionStarts: draft.promotionStarts,
      promotionEnds: draft.promotionEnds,
      promotionPercent: draft.promotionPercent,
      craysSalesCommission: "0%",
      realPublication: false,
    };
    if(artistSpec){const candidate={...snapshot,id:existing?.id||draft.id,owner:w.owner,kind:'public-creator-offer'};artistNftForOffer(w,candidate);requireArtistNftAvailable(w,candidate);}
    requireCreatorTerm({ ...snapshot, id: existing?.id || draft.id, owner: w.owner });
    if([snapshot.promotionPercent,snapshot.promotionStarts,snapshot.promotionEnds].some(v=>v!==undefined&&v!==null&&String(v)!==''))creatorPromotionPrice({...snapshot,id:existing?.id||draft.id,owner:w.owner,kind:'public-creator-offer'});
    const published = existing
      ? Object.assign(existing, snapshot)
      : make("public-creator-offer", snapshot);
    draft.publication = "published-demo";
    draft.publishedOfferId = published.id;
    draft.publishedVersion = published.version;
    return result(
      published,
      "Offer published in this preview. Existing purchases keep their exact original terms. No payment or rights were issued.",
    );
  }
  if (op.startsWith('complete.trial.')) return applyCreatorTrial(w, op, data, ctx, deps);
  if (op === "complete.subscription.apply") {
    requireThat(
      w.identity.signedIn,
      "Sign in before applying this purchased access.",
    );
    const offer = own(ctx.objectId, "public-creator-offer");
    requireThat(
      offer && deps.mayPurchaseCreatorOffer(w, offer),
      "Choose this exact published offer.",
    );
    const payment = w.payments.find(
      (p) => p.id === data.paymentId && p.owner === w.owner,
    );
    requireThat(
      payment &&
        payment.status === "confirmed" &&
        creatorPaymentMatches(payment, offer),
      "A confirmed payment for this exact seller, offer amount and currency is required.",
    );
    requireThat(
      w.objects.some(
        (o) =>
          o.owner === w.owner &&
          o.kind === "purchase-review" &&
          o.offerId === offer.id &&
          o.offerVersion === String(offer.version),
      ),
      "The exact offer version must have been reviewed.",
    );
    requireThat(
      offer.type === "subscription" || offer.type === "paid-conversation",
      "This offer does not grant a subscription or paid conversation.",
    );
    if(offer.type==='paid-conversation')requireThat(w.objects.filter(o=>o.id===offer.id).length===1&&w.payments.filter(p=>p.id===payment.id).length===1&&w.objects.filter(o=>o.kind==='entitlement-payment'&&o.paymentId===payment.id).length<=1,'Review the unique original paid offer, payment and application.');
    const used = w.objects.find(
      (o) =>
        o.owner === w.owner &&
        o.kind === "entitlement-payment" &&
        o.paymentId === payment.id,
    );
    if (used)
      return result(
        used,
        "This settled payment was already applied; no extra term or duplicate service was added.",
      );
    requireCreatorTerm(offer, now);
    const renewal = requirePreparedRenewal(w, offer, payment);
    let access = renewal?.access;
    const months = creatorSubscriptionMonths(offer);
    const base = Math.max(now, renewal?.end || 0);
    const end =
      offer.type === "subscription"
        ? addMonths(base, months!)
        : creatorServiceValidity(offer, now)!;
    if (!access)
      access = make(
        offer.type === "paid-conversation"
          ? "paid-conversation"
          : "subscription",
        {
          name: offer.name,
          offerId: offer.id,
          sellerId: offer.sellerId,
          postId: offer.postId,
          status: "active",
          recipientConsent: false,
          ...(offer.type==='paid-conversation'?{paidSource:'paid-conversation-preview-v1',offerVersion:String(offer.version)}:{}),
          terms: offer.conditions,
          purpose: "Paid creator service",
          automaticRenewal: false,
        },
      );
    Object.assign(access, {
      endsAt: end,
      ends: new Date(end).toISOString(),
      term: offer.term,
      latestPaymentId: payment.id,
      status: "active",
    });
    make("entitlement-payment", {
      paymentId: payment.id,
      offerId: offer.id,
      offerVersion: offer.version,
      entitlementId: access.id,
      grantKind: offer.type,
      ...(offer.type==='paid-conversation'?{paymentSnapshot:paidConversationPaymentSnapshot(payment)}:{}),
      sellerId: offer.sellerId,
      postId: offer.postId,
      term: offer.term,
      name: offer.name,
      startsAt: base,
      previousPaymentId: renewal?.previous.id,
      endsAt: end,
      terms: offer.conditions,
    });
    return result(
      access,
      "This exact settled payment was applied once. Media/RGB delivery and personal VIF connections remain separate.",
    );
  }
  if(op.startsWith('complete.paid.'))return applyPaidConversation(w,op,data,ctx);
  if (op === "complete.assessment.share") {
    const assessment = own(ctx.objectId, "assessment");
    requireThat(
      assessment && assessment.status !== "revoked",
      "Choose an available private result.",
    );
    requireThat(
      canDirectMessage(w, data.recipient),
      "Choose a current mutually accepted VIF.",
    );
    requireThat(
      ["Business", "Socializing", "Dating"].includes(data.purpose),
      "Choose one explicit disclosure purpose.",
    );
    const fields = JSON.parse(data.fields || "[]") as string[];
    requireThat(
      Array.isArray(fields) &&
        fields.length &&
        fields.every((f) =>
          [
            "result",
            "instrument",
            "source",
            "instrumentVersion",
            "language",
          ].includes(f),
        ),
      "Select the exact result fields to disclose.",
    );
    const expiry = dateValue(data.expires);
    requireThat(
      Number.isFinite(expiry) && expiry > now,
      "Choose a future permission expiry.",
    );
    requireThat(
      data.approved === "Yes",
      "Review the recipient and exact selected fields first.",
    );
    const review=assessmentDisclosureReview(w,assessment.id,data.recipient,data.purpose,fields,data.expires,now);
    requireThat(data.reviewSnapshot===review,"Personally review the exact result version, recipient, selected values, purpose and expiry.");
    const snapshot = Object.fromEntries(
      fields.map((f) => [f, assessment[f] ?? "Not supplied"]),
    );
    const grant = make("assessment-permission", {
      name: `${assessment.instrument} · shared perspective`,
      resultId: assessment.id,
      version: assessment.version,
      use: "disclosure",
      assessmentStatus:assessment.status,
      reviewSnapshot:review,
      recipient: data.recipient,
      purposes: [data.purpose],
      fields,
      snapshot,
      expiresAt: expiry,
      status: "active",
      matching: false,
    });
    return result(
      grant,
      "Only the selected fields are shared with this VIF for this purpose and expiry. Internal matching permission did not change.",
    );
  }
  if (op === "complete.assessment.unshare") {
    const grant = own(ctx.objectId, "assessment-permission");
    requireThat(
      grant && grant.use === "disclosure",
      "Select the disclosure permission.",
    );
    grant.status = "revoked";
    return result(
      grant,
      "Future access is revoked. Information already seen by the recipient cannot be recalled.",
    );
  }
  if (op === "complete.venue.review") {
    return applySpotCommunityEvidence(w,"spot.review.prepare",data,ctx);
  }
  if(op.startsWith('complete.visit.'))return applyVisitJourney(w,op,data,ctx);
  if(op.startsWith('complete.circle.'))return applyCircleAccess(w,op.slice('complete.circle.'.length) as CircleAccessAction,data,ctx,now);
  if(op==='complete.group.invite')return applyCircleAccess(w,'invite',data,ctx,now);
  if(op==='complete.group.moderate')return applyCircleAccess(w,data.action==='Revoke'?'revoke':'decide',{...data,admissionId:data.requestId,targetId:data.requestId,decision:data.action},ctx,now);
  if(op==='complete.event.series'){
    let input:EventSeriesInput;try{input=JSON.parse(data.input);}catch{throw Error('Review the exact dates, host and scope in Event series first.');}
    requireThat(input&&(!ctx.venueId||input.venueId===ctx.venueId),'Keep this series with its exact original Spot.');
    const next=createEventSeriesPreview(w,input,data.reviewSnapshot,data.approved==='Yes',data.requestId,now);w.objects=next.objects;
    const series=w.objects.find(o=>o.owner===w.owner&&o.kind==='event-series'&&(o.control as {createRequestId?:string}|undefined)?.createRequestId===data.requestId);requireThat(series,'The original series is unavailable.');return result(series,'The reviewed series and individual dates are saved on their own originals. No booking or payment was made.');
  }
  if(op==='complete.event.exception'){
    let input:EventSeriesChange;try{input=JSON.parse(data.input);}catch{throw Error('Review the exact occurrence and change scope in Event series first.');}
    const original=ctx.objectId?own(ctx.objectId):undefined,seriesId=original?.kind==='event'?String(original.seriesId||''):original?.kind==='event-series'?original.id:'';
    requireThat(seriesId&&(!ctx.venueId||original?.venueId===ctx.venueId),'Choose this exact series or occurrence.');
    const next=applyEventSeriesChange(w,seriesId,input,data.reviewSnapshot,data.approved==='Yes',data.operationId,now);w.objects=next.objects;const series=w.objects.find(o=>o.id===seriesId)!;return result(series,'Only the reviewed date scope changed. Original responses, booking links and IDs are retained.');
  }
  throw new Error("This completion action is unavailable.");
}
