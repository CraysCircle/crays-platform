import {localCatalog,localSpot} from './localSocialData';
import {awardPostCampaign} from "./awardFeed";
import { mayRead, type ProductWorld, type Post } from "./productModel.ts";
import { chosenSourceContains, circleSourceContains } from "./feedSourceSelection";
import { relaySources, selectedForFeed } from "./nostrSources.ts";
import type { PublishingMedia } from "./publishing.ts";
export const postMedia = (p: Post): PublishingMedia[] =>
  p.protected || !p.mediaAvailable
    ? []
    : p.publishing?.media || p.demoMedia || [];
export const isStory = (p: Post) => p.publishing?.format === "Story";
export const isReel = (p: Post) => p.publishing?.format === "Reel";
export function shortFormPosts(
  w: ProductWorld,
  format: "Story" | "Reel",
  scope: {
    venueId?: string;
    personId?: string;
    relay?: string;
    sourceIds?: string[];
    following?: boolean;
    communities?: boolean;
    archive?: boolean;
    awardsOnly?: boolean;
  } = {},
) {
  const currentSources=relaySources(w);
  const currentLocalScope=!!localCatalog()&&!!(scope.venueId&&localSpot(scope.venueId)||scope.sourceIds?.some(id=>id.startsWith('space:')&&localSpot(id.slice(6))));
  const actorCounts=new Map<string,number>();for(const actor of w.people)actorCounts.set(actor.id,(actorCounts.get(actor.id)||0)+1);
  return w.posts
    .filter((p) => {
      if (
        p.publishing?.format !== format ||
        !["accepted", "partial"].includes(p.status) ||
        !postMedia(p).length ||
        (p.archived && !scope.archive)
      )
        return false;
      if(p.venueId&&localSpot(p.venueId)&&(!w.identity.signedIn||w.venues.filter(v=>v.id===p.venueId).length!==1||!w.venues.some(v=>v.id===p.venueId&&v.operatorActive&&v.visited===true)))return false;
      if(currentLocalScope&&!localCatalog()?.originalSpots[p.id]&&p.author!==w.owner&&!p.groupId)return false;
      if(scope.awardsOnly&&!awardPostCampaign(w,p))return false;
      if(p.venueId&&localSpot(p.venueId)&&p.author!==w.owner&&actorCounts.get(p.author)!==1)return false;
      const author = w.people.find((a) => a.id === p.author);
      if (author?.blocked || author?.blockedByOther) return false;
      const expired =
        isStory(p) && Number(p.publishing?.storyExpiresAt || 0) <= Date.now();
      if (scope.archive) {
        if (
          !w.identity.signedIn ||
          p.publishing?.owner !== w.owner ||
          (!expired && !p.archived)
        )
          return false;
        // Archive belongs to the original owner; it does not make the original public again.
      } else if (
        !mayRead(w, p) ||
        !(scope.sourceIds ? chosenSourceContains(w,p,scope.sourceIds,currentSources) : selectedForFeed(w, p, scope.relay || "all",currentSources)) ||
        expired
      )
        return false;
      if (scope.personId && p.author !== scope.personId) return false;
      if (scope.following && !author?.following) return false;
      if (
        scope.venueId &&
        !p.publishing?.receipts?.some(
          (r) =>
            r.targetId === `space:${scope.venueId}` && r.status === "accepted",
        )
      )
        return false;
      if (
        scope.communities &&
        !(p.groupId && circleSourceContains(w,p,p.groupId)) &&
        !w.venues.some(
          (v) =>
            v.membership === "active" &&
            v.operatorActive &&
            p.publishing?.receipts?.some(
              (r) => r.targetId === `space:${v.id}` && r.status === "accepted",
            ),
        )
      )
        return false;
      return true;
    })
    .filter(
      (p, i, all) =>
        all.findIndex(
          (x) =>
            (x.publishing?.eventId || x.id) === (p.publishing?.eventId || p.id),
        ) === i,
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}
