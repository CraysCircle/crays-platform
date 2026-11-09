import {vifMessageExpired} from './vifDisappearing';
import {vifLocalView} from './vifLocalView';
import type {ProductWorld,Person} from './productModel';
import {inboxPersonMatches} from './inboxContactGroups';
import {creatorChatContent} from './creatorChatContent';
import {canDirectMessage} from './communicationPolicy';
export const inboxCategories=['Personal','Spot contacts','New in your Spots','Feed contacts','Spot groups','Global circles','Content creators','Props creators'] as const;
export type InboxCategory=typeof inboxCategories[number];
const key=(w:ProductWorld)=>`inbox:${w.owner}:selection`;
export function inboxPreferences(w:ProductWorld,legacy='All'){
 let categories:InboxCategory[]=legacy==='All'||legacy==='Unread'?inboxCategories.filter(c=>c!=='New in your Spots'):[(legacy==='Venue groups'?'Spot groups':legacy) as InboxCategory].filter(c=>inboxCategories.includes(c));
 try{const value=JSON.parse(String(w.settings[key(w)]||'null'));if(Array.isArray(value)&&value.every(v=>inboxCategories.includes(v))&&new Set(value).size===value.length)categories=value;}catch{}
 return {categories,unread:w.settings[`inbox:${w.owner}:unread`]===true||(!Object.hasOwn(w.settings,`inbox:${w.owner}:unread`)&&legacy==='Unread'),query:String(w.settings[`inbox:${w.owner}:query`]||'')};
}
export function inboxPreferenceKey(w:ProductWorld,part:'selection'|'unread'|'query'){return `inbox:${w.owner}:${part}`;}
export function inboxPersonSelected(w:ProductWorld,p:Person,categories:InboxCategory[],unread=false,hasOwnHistory=false){
 if(unread&&w.settings[`chat:${p.id}:unread`]!==true)return false;
 if(!canDirectMessage(w,p.id))return !!(hasOwnHistory&&w.identity.signedIn&&w.people.filter(other=>other.id===p.id).length===1&&p.id!==w.owner&&categories.includes('Personal'));
 return categories.some(c=>['Personal','Spot contacts','Feed contacts'].includes(c)&&inboxPersonMatches(w,p,c));
}
export function inboxPersonSearch(w:ProductWorld,p:Person,query:string){
 const q=query.trim().toLowerCase();if(!q)return true;
 const texts=[p.name,p.id,...(!p.blocked&&!p.blockedByOther?[p.bio]:[]),...creatorChatContent(w,p.id).flatMap(e=>e.post?[e.post.title]:[])];
 if(w.identity.signedIn&&w.people.filter(other=>other.id===p.id).length===1)texts.push(...w.objects.filter(o=>o.owner===w.owner&&o.kind==='private-message'&&o.personId===p.id&&!vifLocalView(w,'person:'+p.id).problem&&!vifLocalView(w,'person:'+p.id).hiddenIds.includes(o.id)&&!vifMessageExpired(w,'person:'+p.id,o)&&w.objects.filter(other=>other.id===o.id).length===1).map(o=>String(o.text||'')));
 return texts.some(s=>s.toLowerCase().includes(q));
}
