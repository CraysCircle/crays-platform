import {localSpot} from './localSocialData';
import {storyPostBinding} from './awardStoryFeed';
import type { ProductWorld, Post } from "./productModel.ts";
export type RelaySource = {
  id: string;
  name: string;
  url: string;
  category: "Public" | "Space" | "Creator";
  venueId?: string;
  personId?: string;
  read: boolean;
  write: boolean;
  feed: boolean;
  removed: boolean;
  status: string;
  publishPublic: boolean;
};
/** A source preference never establishes identity, membership or publication authority. */
export const nostrPublicIdReadable=(value:unknown):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=300&&!/nsec1|-----BEGIN.*PRIVATE KEY/i.test(value);
export function relayUrl(value:unknown):string|undefined{if(typeof value!=='string'||!value.trim())return;try{const u=new URL(value.trim());if(u.protocol==='wss:'&&u.hostname&&!u.username&&!u.password&&!u.hash)return u.href;}catch{}return;}
const sourceReference=(value:unknown):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=520&&!/nsec1/i.test(value);
export function creatorSourceEntitlements(w:ProductWorld){
 if(!w.identity.signedIn)return [];
 return w.objects.filter(o=>o.owner===w.owner&&o.kind==='creator-entitlement'&&typeof o.personId==='string'&&sourceReference(o.id)&&w.objects.filter(x=>x.id===o.id).length===1&&w.objects.filter(x=>x.owner===w.owner&&x.kind==='creator-entitlement'&&x.personId===o.personId).length===1&&(o.personId===w.owner||w.people.filter(p=>p.id===o.personId).length===1&&w.people.some(p=>p.id===o.personId&&p.following===true))&&w.people.filter(p=>p.id===o.personId).length<=1);
}
function baseSources(w:ProductWorld):RelaySource[]{
 const result:RelaySource[]=[{id:'public-demo',name:'Public Nostr',url:'wss://public.relay.example.invalid',category:'Public',read:true,write:true,feed:true,removed:false,status:'cached-preview',publishPublic:true}];
 if(!w.identity.signedIn)return result;
 for(const v of w.venues.filter(v=>sourceReference(v.id)&&w.venues.filter(x=>x.id===v.id).length===1&&(v.relayJoined??v.visited)===true)){
  const fixture=localSpot(v.id);const url=fixture&&v.relay===fixture.relayURL?fixture.relayURL:relayUrl(typeof v.relay==='string'&&v.relay.startsWith('wss://')?v.relay:`wss://${v.id}.relay.example.invalid`);if(!url)continue;
  result.push({id:'space:'+v.id,name:v.name,url,category:'Space',venueId:v.id,read:true,write:false,feed:true,removed:false,status:'cached-preview',publishPublic:false});
 }
 for(const o of creatorSourceEntitlements(w)){const url=relayUrl(o.creatorRelay);if(!url)continue;const personId=String(o.personId);result.push({id:'creator:'+personId,name:w.people.find(p=>p.id===personId)?.name||w.profiles[personId]?.name||personId,url,category:'Creator',personId,read:true,write:personId===w.owner,feed:true,removed:false,status:'cached-preview',publishPublic:false});}
 return result;
}
export function relaySources(w: ProductWorld): RelaySource[] {
 const base=baseSources(w),saved=w.identity.signedIn?w.objects.filter(o=>o.owner===w.owner&&o.kind==='nostr-relay'):[];
 const result:RelaySource[]=[];
 for(const id of new Set([...base.map(b=>b.id),...saved.map(o=>o.sourceId).filter(sourceReference)])){
  const defaults=base.find(b=>b.id===id),overrides=saved.filter(o=>o.sourceId===id);
  if(overrides.length>1)continue;
  const o=overrides[0];if(!o){if(defaults)result.push(defaults);continue;}
  if(!sourceReference(o.id)||w.objects.filter(x=>x.id===o.id).length!==1||typeof o.name!=='string'||!o.name.trim()||!relayUrl(o.url)||['read','write','feed','removed','publishPublic'].some(k=>typeof o[k]!=='boolean')||o.status!=='cached-preview')continue;
  if(defaults){if(o.category!==defaults.category||o.venueId!==defaults.venueId||o.personId!==defaults.personId||defaults.category!=='Public'&&relayUrl(o.url)!==relayUrl(defaults.url)||defaults.category!=='Public'&&o.publishPublic!==false)continue;}
  else if(!id.startsWith('custom:')||!relayUrl(id.slice(7))||o.category!=='Public'||o.venueId||o.personId)continue;
  result.push({id,name:o.name,url:String(o.url),category:defaults?.category||'Public',...(defaults?.venueId?{venueId:defaults.venueId}:{}),...(defaults?.personId?{personId:defaults.personId}:{}),read:o.read===true,write:o.write===true,feed:o.feed===true,removed:o.removed===true,publishPublic:o.publishPublic===true,status:'cached-preview'});
 }
 return result;
}
export function relaySourcesNeedReview(w:ProductWorld){
 if(!w.identity.signedIn)return 0;const sources=relaySources(w);
 return w.objects.filter(o=>o.owner===w.owner&&o.kind==='nostr-relay'&&!sources.some(s=>s.id===o.sourceId)).length;
}
export function relaySourceSnapshot(w:ProductWorld,id:string){
 if(!w.identity.signedIn)throw Error('Sign in to review your own relay source.');
 const candidates=relaySources(w).filter(s=>s.id===id);if(candidates.length!==1)throw Error('This source is unavailable or ambiguous. Review its original.');
 return JSON.stringify({owner:w.owner,source:candidates[0],records:w.objects.filter(o=>o.owner===w.owner&&o.kind==='nostr-relay'&&o.sourceId===id)});
}
export function publicRelayList(w:ProductWorld){return relaySources(w).filter(r=>!r.removed&&r.category==='Public'&&r.publishPublic&&(r.read||r.write));}
export function relayListReviewSnapshot(w:ProductWorld){
 if(!w.identity.signedIn||!nostrPublicIdReadable(w.identity.publicId))throw Error('Review your own public identity before approving a relay list.');
 return JSON.stringify({owner:w.owner,publicId:w.identity.publicId,signer:w.identity.signer,relayState:w.identity.relayState,sources:publicRelayList(w).map(s=>({id:s.id,url:s.url,read:s.read,write:s.write})).sort((a,b)=>a.id.localeCompare(b.id))});
}

export function sourceForPost(
  w: ProductWorld,
  p: Post,
): RelaySource | undefined {
  const sources = relaySources(w);
  if (p.publishing) {
    for (const receipt of p.publishing.receipts || []) {
      if (receipt.status !== "accepted" && !(receipt.status === "accepted-preview" && storyPostBinding(w,p))) continue;
      const id =
        receipt.targetId === "global"
          ? "public-demo"
          : receipt.targetId.startsWith("relay:")
            ? receipt.targetId.slice(6)
            : receipt.targetId;
      const source = sources.find((r) => r.id === id);
      if (source) return source;
    }
    return undefined;
  }
  // Scope comes before the transport: a public relay copy cannot erase a Spot or Circle restriction.
  if (p.venueId) return sources.find((r) => r.venueId === p.venueId);
  if (p.relay)
    return sources.find((r) => r.url === p.relay || r.id === p.relay);
  return (
    sources.find((r) => r.category === "Creator" && r.personId === p.author) ||
    sources.find((r) => r.id === "public-demo")
  );
}
export function selectedForFeed(w: ProductWorld, p: Post, sourceId = "all", currentSources?:readonly RelaySource[]) {
  if (p.publishing) {
    const sources = currentSources ?? relaySources(w);
    return p.publishing.targetIds.some((id) => {
      if (
        !p.publishing?.receipts?.some(
          (r) => r.targetId === id && (r.status === "accepted" || r.status === "accepted-preview" && !!storyPostBinding(w,p)),
        )
      )
        return false;
      const source =
        id === "global"
          ? "public-demo"
          : id.startsWith("relay:")
            ? id.slice(6)
            : id;
      const r = sources.find((r) => r.id === source);
      return (
        !!r &&
        !r.removed &&
        r.read &&
        r.feed &&
        (sourceId === "all" || sourceId === r.id)
      );
    });
  }
  const r = sourceForPost(w, p);
  return (
    !!r &&
    !r.removed &&
    r.read &&
    r.feed &&
    (sourceId === "all" || r.id === sourceId)
  );
}

// Publishing destinations are independent of reading and feed inclusion.
export function publicationSources(w: ProductWorld, post: Post) {
  return (w.identity.signedIn?relaySources(w):[]).filter(
    (r) =>
      !r.removed &&
      r.write &&
      (post.venueId
        ? r.category === "Space" && r.venueId === post.venueId
        : r.category === "Public" ||
          (r.category === "Creator" &&
            r.personId === post.author &&
            post.author === w.owner)),
  );
}
