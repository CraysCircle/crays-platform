import type { ProductWorld, Post } from './productModel';
import { relaySources, selectedForFeed } from './nostrSources';
import { canGroupCommunicate } from './communicationPolicy';

// A Circle is a logical audience/source, not an invented relay endpoint.
export type FeedSourceChoice = {
  id: string; name: string; category: 'Space' | 'Creator' | 'Circle' | 'Public';
};
export function feedSourceChoices(w: ProductWorld): FeedSourceChoice[] {
  const relays = relaySources(w).filter(r => !r.removed && r.read && r.feed);
  const circles: FeedSourceChoice[] = w.objects
    .filter(g => g.kind === 'group' && g.owner === w.owner && !g.venueId && canGroupCommunicate(w, g.id))
    .map(g => ({ id: `circle:${g.id}`, name: String(g.name), category: 'Circle' }));
  const order = { Space: 0, Creator: 1, Circle: 2, Public: 3 };
  return [...relays, ...circles].sort((a, b) => order[a.category] - order[b.category] || a.name.localeCompare(b.name));
}
export function chosenFeedSources(w: ProductWorld, raw: string | undefined, legacy = 'all', specific = false): string[] {
  const choices = feedSourceChoices(w), available = new Set(choices.map(r => r.id));
  if (legacy && legacy !== 'all') return available.has(legacy) ? [legacy] : [];
  // Explicit All follows the currently available sources; it never admits a removed or unreadable relay.
  if (raw === '*') return choices.map(r => r.id);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string'))
        return [...new Set(parsed.filter(id => available.has(id)))];
    } catch { /* Invalid own preference does not admit public sources. */ }
  }
  return choices.filter(r => specific || r.category !== 'Public').map(r => r.id);
}
export function circleSourceContains(w: ProductWorld, p: Post, groupId: string) {
  const group = w.objects.find(g => g.id === groupId && g.kind === 'group' && g.owner === w.owner && !g.venueId);
  if (!group || !canGroupCommunicate(w, groupId) || p.groupId !== groupId) return false;
  return !p.publishing || Boolean(p.publishing.receipts?.some(r => r.targetId === `group:${groupId}` && r.status === 'accepted'));
}
export function chosenSourceContains(w: ProductWorld, p: Post, ids: string[], currentSources?:ReturnType<typeof relaySources>) {
  return ids.some(id => id.startsWith('circle:')
    ? circleSourceContains(w, p, id.slice(7))
    : (!p.groupId || Boolean(w.objects.find(g => g.id === p.groupId && g.kind === 'group' && g.owner === w.owner && g.venueId))) && selectedForFeed(w, p, id, currentSources));
}
export function selectedSourceName(w: ProductWorld, p: Post) {
  if (p.groupId && circleSourceContains(w, p, p.groupId))
    return w.objects.find(g => g.id === p.groupId && g.owner === w.owner && g.kind === 'group')?.name as string | undefined;
  return undefined;
}

/** Owner requested default for this deployment. Apply once; later manual choices persist. */
export function withFeedDeploymentDefault(w:ProductWorld):ProductWorld {
  const marker=`feed-start-all:2026-10-23:${w.owner}`;
  if(w.settings[marker]===true)return withGlobalNostrDeploymentDefault(w);
  const key=`${w.owner}:nostr-browser:AL-102`,prior=w.drafts[key]||{};
  return withGlobalNostrDeploymentDefault({...w,settings:{...w.settings,[marker]:true},drafts:{...w.drafts,[key]:{...prior,mode:'All',topic:'All',sourceIds:'*',relay:'all',source:'All permitted sources',kind:'All',period:'Any time',query:'',limit:'4'}}});
}

/** Latest owner28Oct: initial global All+Nostr; preserve existing RIGHT sidebar choices and demo records. */
function withGlobalNostrDeploymentDefault(w:ProductWorld):ProductWorld {
 const marker=`global-public-nostr-start:2026-10-28:${w.owner}`;
 if(w.settings[marker]===true)return w;
 const key=`${w.owner}:nostr-browser:AL-102`,prior=w.drafts[key]||{};
 return {...w,settings:{...w.settings,[marker]:true},drafts:{...w.drafts,[key]:{...prior,mode:'All',topic:'All',source:'All permitted sources',globalPublicRead:'Yes',kind:'All',period:'Any time',query:'',limit:prior.limit||'4'}}};
}
