import type {ProductWorld} from './productModel';
import {ownPrivateAccount} from './ownPrivateAccount';
import {circleDiscoverableGroups,circleCanParticipate,circleCanAdmin} from './circleAccess';
/** Presentation only. Original Circle membership/history/operator authority are never replaced. */
export function communityCircle(w:ProductWorld,id:string){
 if(!ownPrivateAccount(w))return;
 return circleDiscoverableGroups(w).find(group=>group.id===id);
}
export function communityProfile(w:ProductWorld,id:string){
 const group=communityCircle(w,id);if(!group)return;
 const example=w.owner==='thorben'&&w.identity.destination==='Demo account'&&id==='circle-design'&&!group.venueId&&group.name==='Design Circle';
 return {group,member:circleCanParticipate(w,id),admin:circleCanAdmin(w,id),example,scope:group.venueId?'Venue Circle':'Global Circle',summary:example?'A global Circle for design conversations, making and shared ideas. Stay connected between meetups.':typeof group.description==='string'?group.description:'',interests:example?['Design','Making','Shared ideas']:[]};
}

function eventVenueAllowed(w:ProductWorld,venueId:unknown){if(!venueId)return true;const originals=w.venues.filter(v=>v.id===venueId);return originals.length===1&&originals[0].operatorActive&&['active','provisional'].includes(originals[0].membership);}
export function communityProgramme(w:ProductWorld,groupId:string){
 const profile=communityProfile(w,groupId);if(!profile)return {status:'unavailable' as const,events:[]};
 if(!profile.member)return {status:'denied' as const,profile,events:[]};
 // New explicit fictional curation references the ORIGINAL event, never copies its inventory or booking.
 const curated=new Set(profile.example?['web-demo-experience-creative-conversation']:[]);
 const events=w.objects.filter(event=>event.kind==='event'&&event.owner===w.owner&&w.objects.filter(o=>o.id===event.id).length===1&&(event.groupId===groupId||curated.has(event.id)&&event.sourceAuthority==='fictional-preview'&&event.liveExecution===false)&&['available','cancelled'].includes(String(event.status))&&typeof event.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(event.date)&&Number.isFinite(Date.parse(event.date))&&new Date(event.date).toISOString().slice(0,10)===event.date&&eventVenueAllowed(w,event.venueId));
 return {status:'ready' as const,profile,events,following:w.settings['community-calendar-follow:'+groupId]==='Yes'};
}
export function applyCommunityCalendar(w:ProductWorld,op:string,d:Record<string,string>,ctx:{objectId?:string;personId?:string}){
 if(!op.startsWith('community.calendar.'))return;
 if(op!=='community.calendar.follow'||!ownPrivateAccount(w)||ctx.personId&&ctx.personId!==w.owner||!ctx.objectId||!/^[a-zA-Z0-9:-]{1,160}$/.test(ctx.objectId)||!['Yes','No'].includes(d.follow))throw Error('Review your own original community calendar.');
 const source=communityProgramme(w,ctx.objectId),key='community-calendar-follow:'+ctx.objectId;
 if(d.follow==='Yes'&&source.status!=='ready'||d.follow==='No'&&source.status!=='ready'&&w.settings[key]!=='Yes')throw Error('This community calendar is not available with your current membership.');
 w.settings[key]=d.follow;
 return {objectId:ctx.objectId,message:d.follow==='Yes'?'Following this example calendar. No event was booked and no private device calendar was connected.':'This example calendar is no longer followed. Your original event orders are unchanged.'};
}
