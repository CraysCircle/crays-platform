import {localSpot,localCatalog,localPerson} from './localSocialData';
export type RelayMessage={id:string;personId:string;pubkey:string;text:string;createdAt:number;previewOnly?:boolean};
export type RelayDiscussion={id:string;spotId:string;title:string;originalId:string;messages:RelayMessage[]};
const cache=new Map<string,Promise<RelayDiscussion[]>>();
/** Public snapshot of already verified own-relay events. No private messages or new grants. */
export function loadSpotRelayDiscussions(spotId:string):Promise<RelayDiscussion[]>{
 const spot=localSpot(spotId);if(!spot)return Promise.reject(Error('This Spot is unavailable.'));
 if(!cache.has(spotId))cache.set(spotId,fetch('/assets/crays-spot-conversations-v2/'+encodeURIComponent(spotId)+'.json',{credentials:'omit',redirect:'error'}).then(async r=>{
  if(!r.ok)throw Error('This Spot’s conversations could not be loaded.');const d=await r.json();
  if(d.schema!=='crays.public-spot-relay-conversations.v1'||d.spotId!==spotId||d.relayURL!==spot.relayURL||d.privateMessagesIncluded!==false||d.realCoreAuthority!==false||!Array.isArray(d.threads)||d.threads.length>100)throw Error('This conversation source needs review.');
  const ids=new Set<string>();return d.threads.map((t:RelayDiscussion)=>{if(!/^[0-9a-f]{64}$/.test(t.id)||t.id!==t.originalId||localCatalog()?.originalSpots[t.id]!==spotId||ids.has(t.id)||t.spotId!==spotId||typeof t.title!=='string'||!Array.isArray(t.messages)||t.messages.length>500)throw Error('This conversation source needs review.');ids.add(t.id);const msgIds=new Set<string>();const messages=t.messages.map(m=>{const p=localPerson(m.personId);if(!p||p.pubkey!==m.pubkey||!/^[0-9a-f]{64}$/.test(m.id)||msgIds.has(m.id)||typeof m.text!=='string'||m.text.length>20000||!Number.isSafeInteger(m.createdAt)||m.createdAt<=0)throw Error('This message source needs review.');msgIds.add(m.id);return {id:m.id,personId:p.id,pubkey:m.pubkey,text:m.text,createdAt:m.createdAt};});return{id:t.id,spotId,originalId:t.originalId,title:t.title,messages};});
 }).catch(e=>{cache.delete(spotId);throw e;}));return cache.get(spotId)!;
}

/** Join only this account's exact same-Spot reply previews. A local receipt is not relay delivery. */
export function withOwnRelayReplyPreviews(w:import('./productModel').ProductWorld,rows:RelayDiscussion[]):RelayDiscussion[]{
 if(!w.identity.signedIn||!w.profiles[w.owner])return rows;const counts=new Map<string,number>();for(const p of w.posts)counts.set(p.id,(counts.get(p.id)||0)+1);
 return rows.map(t=>{const existing=new Set(t.messages.map(m=>m.id));const own=w.posts.filter(p=>counts.get(p.id)===1&&p.author===w.owner&&!p.archived&&p.status!=='draft'&&p.publishing?.owner===w.owner&&p.publishing.publisherId===w.owner&&p.publishing.eventId?.startsWith('preview-event:')&&p.publishing.targetIds.includes('space:'+t.spotId)&&p.venueId===t.spotId&&(p.parentId===t.originalId||p.rootId===t.originalId)&&!p.groupId&&!p.protected&&['Public','Community'].includes(p.audience)&&Number.isSafeInteger(p.createdAt)&&p.createdAt>0&&!existing.has(p.id));if(!own.length)return t;return{...t,messages:[...t.messages,...own.map(p=>({id:p.id,personId:w.owner,pubkey:'local-preview',text:p.fullText||p.text,createdAt:p.createdAt,previewOnly:true}))].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))};});
}
