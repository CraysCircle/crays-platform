import {localPresenceCurrent} from './localPresence.ts';
export {localPresenceCurrent,expireLocalPresence,localPresenceNextExpiry,samplePresenceDurationMs} from './localPresence.ts';
import { canPresentDiscovery } from "./discoveryVisibility.ts";
import { uniqueOriginals } from "./contentIdentity.ts";
import { mayRead, type ProductWorld } from "./productModel.ts";

// F07–F19/F59–F61: community, current presence, groups and service rights stay independent.
export const hasFoodService = (services: string[]) =>
  services.some((s) => ["Coffee", "Food & drinks"].includes(s));
export function spaceCommunityAllowed(w: ProductWorld, venueId: string) {
  const rows=w.venues.filter(v=>v.id===venueId),v=rows.length===1?rows[0]:undefined;
  return Boolean(
    w.identity.signedIn &&
    v?.operatorActive &&
    ["active", "provisional"].includes(v.membership),
  );
}
export function spacePosts(w: ProductWorld, venueId: string, query = "") {
  return uniqueOriginals(w.posts
    .filter(
      (p) =>
        (p.publishing
          ? p.publishing.targetIds.includes(`space:${venueId}`) &&
            p.publishing.receipts?.some(
              (r) =>
                r.targetId === `space:${venueId}` && r.status === "accepted",
            )
          : p.venueId === venueId) &&
        p.publishing?.format !== "Story" &&
        !p.parentId &&
        !p.archived &&
        ["accepted", "partial"].includes(p.status) &&
        mayRead(w, p) &&
        `${p.title} ${p.text}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => b.createdAt - a.createdAt));
}
export function spacePeople(
  w: ProductWorld,
  venueId: string,
  local = false,
  purpose = "Socializing",
) {
  if (!spaceCommunityAllowed(w, venueId)) return [];
  const v = w.venues.find((v) => v.id === venueId)!;
  if (local && !localPresenceCurrent(w,venueId)) return [];
  return w.people.filter(
    (p) =>
      w.people.filter(other=>other.id===p.id).length===1 && p.id !== w.owner &&
      !p.blocked &&
      !p.blockedByOther &&
      canPresentDiscovery(w, p, { venueId, local, purpose }) &&
      (!local ||
        (p.venueId === venueId &&
          p.localPresence &&
          p.localVisibility?.[purpose])),
  );
}
export function spaceGroups(w: ProductWorld, venueId: string) {
  if (!spaceCommunityAllowed(w, venueId)) return [];
  return w.objects.filter(
    (o) =>
      w.objects.filter(other=>other.id===o.id).length===1 && o.owner === w.owner &&
      o.kind === "group" &&
      o.venueId === venueId &&
      o.suspended !== true &&
      (o.access !== "Private" ||
        o.membership === "active" ||
        o.invited === true) &&
      (o.audience !== "On-site" ||
        localPresenceCurrent(w,venueId)),
  );
}
// Fictional, explicitly modelled venue programme. Not a live venue or automatically joined chat.
export function withSpaceStories(input: ProductWorld): ProductWorld {
  if (input.owner !== "thorben" || input.settings.spaceStories === "v1")
    return input;
  const w = structuredClone(input);
  for (const venue of w.venues) {
    const add = (o: any) => {
      if (!w.objects.some((x) => x.id === o.id))
        w.objects.push({ owner: w.owner, ...o });
    };
    add({
      id: `house-${venue.id}`,
      kind: "group",
      name: "The house chat",
      venueId: venue.id,
      access: "Open",
      membership: "none",
      audience: "Community",
      role: "Guest",
      history: "From joining only",
      official: true,
      description:
        "An open conversation for this Spot’s community. Joining does not create private VIF connections.",
      source: "Fictional venue programme",
    });
    add({
      id: `table-${venue.id}`,
      kind: "group",
      name: "Around the table",
      venueId: venue.id,
      access: "Request to join",
      membership: "none",
      audience: "Community",
      role: "Guest",
      history: "From joining only",
      official: false,
      description:
        "Small dinners, local recommendations and plans for the next visit.",
      source: "Fictional member programme",
    });
    if (!w.posts.some((p) => p.id === `space-welcome-${venue.id}`))
      w.posts.push({
        id: `space-welcome-${venue.id}`,
        author: `venue:${venue.id}`,
        title: "A little more than a place",
        text: `Welcome to ${venue.name}. Catch up with the community between visits, plan your next gathering and make this Spot your own.`,
        fullText: `Welcome to ${venue.name}.\n\nThe community stays with you between visits. Read the latest notes, join the house conversation or plan a little time together.\n\nYour private conversations stay private. Being a member does not share your live location.`,
        type: "article",
        audience: "Community",
        venueId: venue.id,
        status: "accepted",
        liked: false,
        saved: false,
        reposted: false,
        protected: false,
        license: false,
        mediaAvailable: true,
        createdAt: Date.parse("2026-10-17T08:30:00Z"),
        image: venue.image,
        alt: venue.name,
        replies: [],
        readPosition: 0,
      });
  }
  w.settings.spaceStories = "v1";
  return w;
}
