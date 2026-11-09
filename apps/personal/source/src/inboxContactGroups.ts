import type {Person,ProductWorld} from './productModel';
import {canDirectMessage} from './communicationPolicy';
import {canPresentDiscovery} from './discoveryVisibility';

// Inbox placement is a preference/projection, never relationship authority.
export function feedContact(w:ProductWorld,p:Person){
 const choice=w.settings[`inbox:${p.id}:placement`];
 if(choice==='personal')return false;
 return choice==='feed'||w.objects.some(o=>o.owner===w.owner&&o.kind==='contact-introduction'&&o.personId===p.id&&o.sourceMethod==='public-feed'&&o.status==='accepted');
}
export function knownSpaceContact(w:ProductWorld,p:Person){
 return canDirectMessage(w,p.id)&&canPresentDiscovery(w,p);
}
export function newSpaceContact(w:ProductWorld,p:Person){
 return !canDirectMessage(w,p.id)&&canPresentDiscovery(w,p);
}
export function publicFeedProfile(w:ProductWorld,p:Person){
 return w.identity.signedIn&&p.id!==w.owner&&!p.blocked&&!p.blockedByOther&&(feedContact(w,p)||(!p.contact&&p.following));
}
export function inboxPersonMatches(w:ProductWorld,p:Person,filter:string){
 if(!canDirectMessage(w,p.id))return false;
 if(filter==='Unread')return w.settings[`chat:${p.id}:unread`]===true;
 if(filter==='Spot contacts')return knownSpaceContact(w,p);
 if(filter==='Feed contacts')return feedContact(w,p);
 if(filter==='Personal')return !feedContact(w,p);
 return filter==='All';
}
