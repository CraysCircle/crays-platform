import {ownPrivateAccount} from './ownPrivateAccount';
import {storyCampaignsFor} from './awardStoryRegistry.ts';
import {localPresenceCurrent} from './localPresence.ts';
import {imageLinkedPublicationCurrent} from './personalImageJourney.ts';
import {circleHistoryAllows,circleCanAdmin} from './circleAccess.ts';
import {localPreviewId} from "./localPreviewId.ts";
import {verifiedVenueOperator} from "./venueAuthority.ts";
import {
  hasCreatorMembership,
  type ProductWorld,
  type Post,
  type ActionContext,
} from "./productModel.ts";
import { canGroupCommunicate } from "./communicationPolicy.ts";
import { relaySources } from "./nostrSources.ts";
export type PublishingMedia = {
  id: string;
  name: string;
  url: string;
  kind: "image" | "video";
  alt: string;
  state: "local" | "uploaded-preview";
};
export type PublishingState = {
  owner: string;
  awardCampaignId?: string;
  publisherId: string;
  targetIds: string[];
  revision: number;
  savedOriginal?: string;
  submittedOriginal?: string;
  submittedDelivery?: string;
  media: PublishingMedia[];
  mediaRights: boolean;
  venueTag: string;
  format?: "Post" | "Story" | "Reel";
  storyExpiresAt?: number;
  eventId?: string;
  receipts?: { targetId: string; status: string }[];
  offer?: {
    name: string;
    price: string;
    currency: string;
    priceBasis: "Per guest" | "Per booking";
    date: string;
    expires: string;
    capacity: string;
    action: string;
    conditions: string;
  };
};
export type Publisher = {
  id: string;
  name: string;
  kind: "Member" | "Venue" | "Group";
  venueId?: string;
  image?: string;
};
export type PublishingTarget = {
  id: string;
  name: string;
  kind: "Global" | "Venue" | "Group" | "Creator" | "Public relay";
  relayId: string;
  restricted: boolean;
  venueId?: string;
  groupId?: string;
};
const activeVenue = (w: ProductWorld, id: string) =>
  w.venues.find(
    (v) => v.id === id && v.operatorActive && v.membership === "active",
  );
const grant = (w: ProductWorld, publisherId: string, action = "post") =>
  w.objects.some(
    (o) =>
      o.kind === "publisher-grant" &&
      o.owner === w.owner &&
      o.publisherId === publisherId &&
      o.status === "active" &&
      (o.expiresAt===undefined || (Number.isFinite(Number(o.expiresAt)) && Number(o.expiresAt)>Date.now())) &&
      Array.isArray(o.actions) &&
      o.actions.includes(action),
  );
export function publishers(w: ProductWorld): Publisher[] {
  if (!ownPrivateAccount(w)) return [];
  return [
    {
      id: w.owner,
      name: w.profiles[w.owner]?.name || w.owner,
      kind: "Member",
      image: w.profiles[w.owner]?.photo,
    },
    ...w.venues
      .filter(
        (v) =>
          v.operatorActive &&
          (verifiedVenueOperator(w,v.id) || grant(w, `venue:${v.id}`)),
      )
      .map((v) => ({
        id: `venue:${v.id}`,
        name: v.name,
        kind: "Venue" as const,
        venueId: v.id,
        image: v.image,
      })),
    ...w.objects
      .filter(
        (o) =>
          o.owner === w.owner &&
          o.kind === "group" &&
          o.membership === "active" &&
          circleCanAdmin(w, o.id) &&
          canGroupCommunicate(w, o.id),
      )
      .map((g) => ({
        id: `group:${g.id}`,
        name: String(g.name),
        kind: "Group" as const,
        venueId: g.venueId ? String(g.venueId) : undefined,
      })),
  ];
}
/** Exact original and current delegated publisher authority; metadata ownership alone grants no private access. */
export function canManagePublishingOriginal(w: ProductWorld, p: Post): boolean {
  if (!ownPrivateAccount(w) || typeof p.id !== 'string' || !p.id.trim() || p.id !== p.id.trim() || w.posts.filter(row => row.id === p.id).length !== 1 || w.posts.find(row => row.id === p.id) !== p) return false;
  if (!p.publishing) return p.author === w.owner;
  if (p.publishing.owner !== w.owner || p.publishing.publisherId !== p.author) return false;
  return publishers(w).filter(actor => actor.id === p.author).length === 1;
}
/** Snapshot of the original access settings being reviewed; contains no file bytes or delivery receipts. */
export function contentAccessSnapshot(w: ProductWorld, id: string): string {
 const p=w.posts.find(row=>row.id===id);
 if(!p||!canManagePublishingOriginal(w,p))return '';
 return JSON.stringify([w.owner,p.id,p.author,p.status,p.archived,p.publishing?.owner,p.publishing?.publisherId,p.publishing?.revision,p.publishing?.targetIds,p.audience,p.venueId,p.groupId,p.protected,p.purchaseEligibility,p.accessModel,p.rightsDuration,p.rightsTerms,p.text,p.fullText]);
}
export function publishingTargets(
  w: ProductWorld,
  publisherId: string,
): PublishingTarget[] {
  const identity = publishers(w).find((p) => p.id === publisherId);
  if (!identity) return [];
  const sources = relaySources(w);
  const disabled = (sourceId: string) =>
    w.objects.some(
      (o) =>
        o.kind === "nostr-relay" &&
        o.owner === w.owner &&
        o.sourceId === sourceId &&
        (o.removed === true || o.write === false),
    );
  const out: PublishingTarget[] = [];
  if (
    identity.kind !== "Group" &&
    (identity.kind === "Member" ||
      w.venues.some(
        (v) => v.id === identity.venueId && verifiedVenueOperator(w,v.id),
      ) ||
      grant(w, identity.id, "global"))
  )
    for (const r of sources.filter(
      (r) => r.category === "Public" && !r.removed && r.write,
    ))
      out.push({
        id: r.id === "public-demo" ? "global" : `relay:${r.id}`,
        name: r.id === "public-demo" ? "Global CRAYS" : r.name,
        kind: r.id === "public-demo" ? "Global" : "Public relay",
        relayId: r.id,
        restricted: false,
      });
  for (const v of w.venues.filter(
    (v) =>
      activeVenue(w, v.id) &&
      !disabled(`space:${v.id}`) &&
      w.settings[`publishing:${v.id}:members`] !== false &&
      (identity.kind === "Member" || identity.venueId === v.id),
  ))
    out.push({
      id: `space:${v.id}`,
      name: v.name,
      kind: "Venue",
      relayId: `space:${v.id}`,
      venueId: v.id,
      restricted: true,
    });
  for (const g of w.objects.filter(
    (g) =>
      g.kind === "group" &&
      g.owner === w.owner &&
      canGroupCommunicate(w, g.id) &&
      (identity.kind === "Member" ||
        identity.id === `group:${g.id}` ||
        (identity.kind === "Venue" &&
          g.venueId === identity.venueId &&
          ["Admin", "Moderator"].includes(String(g.role)))),
  ))
    out.push({
      id: `group:${g.id}`,
      name: String(g.name),
      kind: "Group",
      relayId: g.venueId ? `space:${g.venueId}` : `group:${g.id}`,
      venueId: g.venueId ? String(g.venueId) : undefined,
      groupId: g.id,
      restricted: true,
    });
  if (identity.kind === "Member" && hasCreatorMembership(w))
    for (const r of sources.filter(
      (r) =>
        r.category === "Creator" &&
        r.personId === w.owner &&
        r.write &&
        !r.removed,
    ))
      out.push({
        id: r.id,
        name: "My creator relay",
        kind: "Creator",
        relayId: r.id,
        restricted: false,
      });
  return out;
}
export function publicationAudienceAllowed(
  w: ProductWorld,
  p: Post,
): boolean | undefined {
  const s = p.publishing;
  if (!s) return undefined;
  if (p.status === "draft") return w.identity.signedIn && s.owner === w.owner;
  if (p.audience === "Public") return true;
  if (!w.identity.signedIn) return false;
  return s.targetIds.some((id) =>
    id.startsWith("space:")
      ? Boolean(
          activeVenue(w, id.slice(6)) &&
          (p.audience !== "On-site" ||
            localPresenceCurrent(w,id.slice(6))),
        )
      : id.startsWith("group:") && canGroupCommunicate(w, id.slice(6)) && circleHistoryAllows(w,id.slice(6),p),
  );
}
export function checkTargets(w: ProductWorld, p: Post) {
  const s = p.publishing!;
  const allowed = publishingTargets(w, s.publisherId);
  const selected = s.targetIds.map((id) => allowed.find((t) => t.id === id));
  if (!selected.length || selected.some((t) => !t))
    throw Error(
      "A publishing permission or destination changed. Keep the draft and choose your destinations again.",
    );
  if (p.audience !== "Public" && selected.some((t) => !t!.restricted))
    throw Error(
      "A closed audience cannot be sent to public relays. Remove public destinations or deliberately create a separate public version.",
    );
  if (p.audience === "Public" && selected.some((t) => t!.kind === "Group"))
    throw Error(
      "Group publishing stays within its group audience. Do not turn a group post into a public copy.",
    );
  if (
    p.audience === "Private group" &&
    selected.some((t) => t!.kind !== "Group")
  )
    throw Error(
      "A private-group post can only go to the selected permitted groups.",
    );
  if (p.audience === "Community" && selected.some((t) => t!.kind !== "Venue"))
    throw Error("Choose venue destinations for this community audience.");
  if (
    p.audience === "On-site" &&
    selected.some(
      (t) =>
        !t!.venueId ||
        !localPresenceCurrent(w,String(t!.venueId)),
    )
  )
    throw Error("A current visit is required for this on-site audience.");
  return selected as PublishingTarget[];
}
/** Content/rights/identity/destinations only: delivery receipts and upload progress are not a new original. */
export function publishingOriginalSnapshot(w: ProductWorld, p: Post): string {
  if (!canManagePublishingOriginal(w, p) || !p.publishing) return "";
  const { savedOriginal, submittedOriginal, submittedDelivery, eventId, receipts, storyExpiresAt, ...state } = p.publishing;
  const media = state.media.map(({state: progress, ...original}) => original);
  const selected = publishingTargets(w,state.publisherId).filter(t=>state.targetIds.includes(t.id));
  const relays = relaySources(w).filter(r=>selected.some(t=>t.relayId===r.id)).map(r => ({id:r.id,url:r.url,write:r.write,removed:r.removed})).sort((a,b)=>a.id.localeCompare(b.id));
  return JSON.stringify([w.owner,w.identity.publicId,w.identity.signer,p.id,p.author,p.parentId,p.rootId,p.revisionOf,p.actions,p.choices,p.title,p.text,p.fullText,p.type,p.audience,p.venueId,p.groupId,p.image,p.images,p.alt,p.mediaId,p.demoMedia,p.mediaAvailable,p.protected,p.archived,p.accessModel,p.purchaseEligibility,p.rightsTerms,p.rightsDuration,{...state,media},relays]);
}
export function applyPublishing(
  w: ProductWorld,
  op: string,
  data: Record<string, string>,
  ctx: ActionContext,
) {
  if (!op.startsWith("complete.publishing.")) return;
  if (!ownPrivateAccount(w))
    throw Error("Sign in before creating or publishing a post.");
  if (ctx.postId !== undefined && (typeof ctx.postId !== 'string' || !ctx.postId.trim() || ctx.postId !== ctx.postId.trim())) throw Error("Choose one exact original publishing draft.");
  const existing = ctx.postId ? w.posts.find(p => p.id === ctx.postId) : undefined;
  if (ctx.postId && (!existing || !existing.publishing || !canManagePublishingOriginal(w, existing))) throw Error("This original or its publisher permission is unavailable to your account.");
  if(op==='complete.publishing.save'&&existing&&'personalImageSource' in existing&&data.publisherId!==existing.author)throw Error('This source-bound image draft belongs to its original publisher. Keep that identity when reviewing this draft.');
  if(existing?.status==='draft'&&!imageLinkedPublicationCurrent(w,existing.id))throw Error('This private image draft’s source or processing permission changed. Review the original output first.');
  if (ctx.postId && !existing) throw Error("Choose your own publishing draft.");
  const reply = (p: Post, message: string) => ({ objectId: p.id, message });
  if (op === "complete.publishing.save") {
    if (!["Post", "Story", "Reel"].includes(data.format)) throw Error("Choose Post, Story or Reel explicitly.");
    if (data.offer !== undefined && !["Yes", "No"].includes(data.offer)) throw Error("Choose whether this draft contains an offer.");
    if (existing && existing.status !== "draft")
      throw Error(
        "Keep the published original. Create a separate draft to change its content.",
      );
    if (
      existing &&
      Number(data.expectedVersion) !== existing.publishing!.revision
    )
      throw Error("This draft changed. Reopen its latest version.");
    const actor = publishers(w).find((p) => p.id === data.publisherId);
    if (!actor)
      throw Error("This publisher identity is no longer available to you.");
    if (
      !["Public", "Community", "On-site", "Private group"].includes(
        data.audience,
      )
    )
      throw Error("Choose who can see this post.");
    const media = JSON.parse(data.media || "[]") as PublishingMedia[];
    if (!Array.isArray(media) || media.length > 10)
      throw Error("Choose up to ten images or videos.");
    if (
      new Set(media.map((m) => m.id)).size !== media.length ||
      new Set(media.map((m) => m.url)).size !== media.length
    )
      throw Error("The same medium is attached twice.");
    for (const m of media)
      if (
        !m || typeof m !== "object" || typeof m.id !== "string" || !m.id.trim() || m.id !== m.id.trim() ||
        typeof m.name !== "string" || typeof m.url !== "string" || typeof m.alt !== "string" ||
        !["image", "video"].includes(m.kind) ||
        !m.name ||
        !m.url ||
        !m.alt?.trim() ||
        !(
          (m.kind === "image" &&
            (/^\/assets\/crays\/[\w-]+\.(png|jpe?g|webp)$/i.test(m.url) ||
              /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
                m.url,
              ))) ||
          (m.kind === "video" &&
            (/^\/assets\/crays\/[\w-]+\.mp4$/i.test(m.url) ||
              /^data:video\/mp4;base64,[A-Za-z0-9+/]+={0,2}$/.test(m.url)))
        )
      )
        throw Error(
          "Review each supported image or video and its description.",
        );
    if (JSON.stringify(media).length > 3200000)
      throw Error(
        "These files are too large for local preview storage. Keep the draft and select smaller preview files.",
      );
    const targets = JSON.parse(data.targets || "[]") as string[];
    if (!Array.isArray(targets) || targets.some((x) => typeof x !== "string"))
      throw Error("Choose valid destinations.");
    for (const m of media)
      m.state = existing?.publishing?.media.some(
        (old) =>
          old.id === m.id &&
          old.url === m.url &&
          old.state === "uploaded-preview",
      )
        ? "uploaded-preview"
        : "local";
    const s: PublishingState = {
      owner: w.owner,
      format: ["Post", "Story", "Reel"].includes(data.format)
        ? (data.format as "Post" | "Story" | "Reel")
        : "Post",
      publisherId: actor.id,
      targetIds: [...new Set(targets)],
      revision: (existing?.publishing?.revision || 0) + 1,
      media,
      mediaRights: data.mediaRights === "Yes",
      venueTag: data.venueTag || "",
    };
    if(data.awardCampaignId){
      const campaign=w.objects.find(o=>o.owner===w.owner&&o.kind==='award-preview-campaign'&&(o.campaign as {id?:string})?.id===data.awardCampaignId)?.campaign as {id:string;creatorId:string;status:string}|undefined;
      const story=storyCampaignsFor(w).find(c=>c.id===data.awardCampaignId&&c.creatorId===w.owner&&c.creatorId===actor.id&&c.status==='active'&&c.seasonStatus==='open'&&(w.settings[`awardStorySeasonStatus:${c.seasonId}`]??'open')==='open');
      if((!campaign||campaign.status!=='published-demo'||campaign.creatorId!==actor.id)&&!story)throw Error('Choose your own published Props contest for this publisher.');
      s.awardCampaignId=story?.id||campaign!.id;
    }
    if (data.offer === "Yes" && s.format !== "Post")
      throw Error(
        "Offers use the Post format. Keep Story and Reel media separate from booking terms.",
      );
    if (data.offer === "Yes") {
      if (
        actor.kind !== "Venue" ||
        !(
          w.venues.some(
            (v) => v.id === actor.venueId && verifiedVenueOperator(w,v.id),
          ) || grant(w, actor.id, "offer")
        )
      )
        throw Error(
          "Venue offers require an authorised venue offer publisher.",
        );
      if (
        !data.offerName?.trim() ||
        !/^\d+(\.\d{1,2})?$/.test(data.price) ||
        Number(data.price) < 0 ||
        !data.price?.trim() ||
        data.currency !== "USD"
      )
        throw Error("Review the offer title and exact USD price. Older currency amounts are not converted automatically.");
      if (!["Per guest", "Per booking"].includes(data.priceBasis))
        throw Error("Choose whether this price is per guest or per booking.");
      if (!data.conditions?.trim())
        throw Error("State the offer conditions before saving this offer.");
      if (
        data.capacity &&
        (!Number.isInteger(Number(data.capacity)) || Number(data.capacity) < 1)
      )
        throw Error(
          "Enter a positive participant limit or leave it unspecified.",
        );
      if (
        data.expires &&
        (!Number.isFinite(Date.parse(data.expires)) ||
          Date.parse(data.expires) <= Date.now())
      )
        throw Error("Choose a future offer expiry.");
      if (
        data.date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
          !Number.isFinite(Date.parse(data.date)) ||
          new Date(data.date).toISOString().slice(0, 10) !== data.date)
      )
        throw Error("Choose a valid offer date.");
      s.offer = {
        name: data.offerName.trim(),
        price: data.price,
        currency: data.currency,
        priceBasis: data.priceBasis as "Per guest" | "Per booking",
        date: data.date || "",
        expires: data.expires || "",
        capacity: data.capacity || "",
        action: ["Book now", "Join", "Get offer"].includes(data.action)
          ? data.action
          : "Get offer",
        conditions: data.conditions,
      };
    }
    const post: Post = {
      ...(existing || {}),
      id: existing?.id || localPreviewId(),
      author: actor.id,
      title:
        data.title?.trim() ||
        data.text?.trim().slice(0, 64) ||
        s.offer?.name ||
        "A moment to share",
      text: data.text || "",
      type: media.some((m) => m.kind === "video")
        ? "video"
        : media.length
          ? "image"
          : "note",
      audience: data.audience as Post["audience"],
      venueId:
        actor.venueId || targets.find((t) => t.startsWith("space:"))?.slice(6),
      groupId: targets.find((t) => t.startsWith("group:"))?.slice(6),
      status: "draft",
      liked: false,
      saved: false,
      reposted: false,
      protected: existing?.protected || false,
      license: false,
      mediaAvailable: true,
      createdAt: existing?.createdAt || Date.now(),
      replies: existing?.replies || [],
      readPosition: 0,
      publishing: s,
    };
    if (existing) Object.assign(existing, post);
    else w.posts.unshift(post);
    const stored = existing || post;
    stored.publishing!.savedOriginal = publishingOriginalSnapshot(w, stored);
    return reply(
      post,
      "Draft saved on this device. Nothing has been sent to a relay.",
    );
  }
  if (!existing) throw Error("Save this draft before continuing.");
  const p = existing,
    s = p.publishing!;
  if (op === "complete.publishing.upload") {
    if (Number(data.expectedVersion) !== s.revision || !s.savedOriginal || s.savedOriginal !== publishingOriginalSnapshot(w,p) || (data.expectedOriginal !== undefined && data.expectedOriginal !== s.savedOriginal)) throw Error("This media draft changed. Review and approve its exact current version again.");
    if (p.status !== "draft" || !s.mediaRights || data.approved !== "Yes")
      throw Error(
        "Confirm your media rights and the preview upload before continuing.",
      );
    checkTargets(w, p);
    s.media = s.media.map((m) => ({ ...m, state: "uploaded-preview" }));
    return reply(
      p,
      "Blossom upload simulated for these exact media. No real external file transfer was made.",
    );
  }
  if (op === "complete.publishing.publish") {
    if (data.approved !== "Yes" || Number(data.expectedVersion) !== s.revision)
      throw Error("Review and approve this exact version before publishing.");
    const original = publishingOriginalSnapshot(w,p);
    if (!s.savedOriginal || original !== s.savedOriginal || (data.expectedOriginal !== undefined && data.expectedOriginal !== original)) throw Error("The reviewed content, rights, identity or destinations changed. Save and review this exact original again.");
    if (["accepted", "partial"].includes(p.status))
      return reply(
        p,
        "This original event already has delivery receipts. No duplicate post was created.",
      );
    if (p.status === "unknown")
      throw Error(
        "Check this same event’s delivery before attempting another publication.",
      );
    const targets = checkTargets(w, p);
    if (!p.text.trim() && !s.media.length && !s.offer)
      throw Error("Add something to share before publishing.");
    if (w.identity.signer !== "demo-connected")
      throw Error(
        "Connect your demo signer before approving publication. No secret key is needed.",
      );
    if (w.identity.relayState === "offline")
      throw Error(
        "You are offline. Your draft is kept; reconnect before publishing.",
      );
    if (
      s.media.length &&
      (!s.mediaRights || s.media.some((m) => m.state !== "uploaded-preview"))
    )
      throw Error(
        "Confirm media rights and prepare the exact Blossom media first.",
      );
    if (s.format === "Story" && !s.media.length)
      throw Error("Add a photo or video to your Story.");
    if (
      s.format === "Reel" &&
      (s.media.length !== 1 || s.media[0].kind !== "video")
    )
      throw Error("Choose one video for this Reel.");
    if (s.format === "Story")
      s.storyExpiresAt = s.storyExpiresAt || Date.now() + 86400000;
    s.eventId = s.eventId || `preview-event:${p.id}`;
    s.submittedOriginal = original;
    s.receipts = targets.map((t, i) => ({
      targetId: t.id,
      status:
        data.outcome === "Unknown"
          ? "unknown"
          : w.identity.relayState === "partial" && i > 0
            ? "unknown"
            : "accepted",
    }));
    s.submittedDelivery = JSON.stringify([s.eventId,s.receipts]);
    p.status = s.receipts.every((r) => r.status === "accepted")
      ? "accepted"
      : s.receipts.some((r) => r.status === "accepted")
        ? "partial"
        : "unknown";
    p.deliveryRelayIds = [...new Set(targets.map((t) => t.relayId))];
    p.createdAt = Date.now();
    if (
      s.offer &&
      !w.objects.some((o) => o.kind === "venue-offer" && o.postId === p.id)
    )
      w.objects.unshift({
        id: `venue-offer:${p.id}`,
        owner: w.owner,
        kind: "venue-offer",
        publisherId: s.publisherId,
        venueId: p.venueId,
        postId: p.id,
        ...s.offer,
        status:
          p.status === "unknown" ? "delivery-unconfirmed" : "published-demo",
        version: s.revision,
        source: "Owner-entered offer in publishing preview",
        realBooking: false,
      });
    return reply(
      p,
      p.status === "accepted"
        ? "Published in this preview. One original event, with receipts for its selected destinations."
        : "Some delivery is unconfirmed. Keep this same event and check its status.",
    );
  }
  if (op === "complete.publishing.reconcile") {
    if (!s.submittedOriginal || s.submittedOriginal !== publishingOriginalSnapshot(w,p) || !s.eventId || !s.receipts?.length) throw Error("This submitted original changed or its receipts are unavailable. Keep the original event and review its delivery.");
    if (!s.submittedDelivery || s.submittedDelivery !== JSON.stringify([s.eventId,s.receipts])) throw Error("The original event or its delivery receipts changed. Review that same event before checking its status.");
    if (
      !["partial", "unknown"].includes(p.status) ||
      w.identity.relayState === "offline"
    )
      throw Error("Reconnect and choose an event with unconfirmed delivery.");
    checkTargets(w, p);
    s.receipts = s.receipts?.map((r) => ({ ...r, status: "accepted" }));
    s.submittedDelivery = JSON.stringify([s.eventId,s.receipts]);
    p.status = "accepted";
    const offer = w.objects.find(
      (o) =>
        o.kind === "venue-offer" &&
        o.postId === p.id &&
        o.version === s.revision,
    );
    if (offer) offer.status = "published-demo";
    return reply(
      p,
      "The same preview event is confirmed at its original destinations. No new event was created.",
    );
  }
  throw Error("This publishing action is unavailable.");
}
