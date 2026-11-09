import {mayRead,type ProductWorld,type Post,type Entity} from './productModel.ts';
import {publicationSources} from './nostrSources.ts';
export type PublicInteractionAction='Like'|'Repost'|'Vote';
export type PublicInteraction=Entity&{kind:'nostr-interaction';postId:string;action:PublicInteractionAction;choice?:number;enabled:boolean;audience:string;author:string;targetEvent:string;relayIds:string[];binding:string;state:'prepared'|'signed'|'submitted'|'unknown'|'failed'|'accepted'|'cancelled';version:number;eventRef:string;history:{state:string;at:number}[];exampleOnly:true};
function need(x:unknown,message:string):asserts x{if(!x)throw Error(message);}
function source(w:ProductWorld,id:string){const ps=w.posts.filter(p=>p.id===id),p=ps[0],person=w.people.find(x=>x.id===p?.author);need(w.identity.signedIn&&ps.length===1&&p&&mayRead(w,p)&&!person?.blocked&&!person?.blockedByOther&&!p.archived&&['accepted','partial'].includes(p.status),'This original is unavailable with your current access.');return p;}
function destinations(w:ProductWorld,p:Post){return publicationSources(w,{...p,venueId:undefined}).filter(r=>r.publishPublic);}
function target(p:Post){return p.publishing?.eventId||p.id;}
function binding(w:ProductWorld,p:Post){return JSON.stringify({owner:w.owner,identity:w.identity.publicId,id:p.id,event:target(p),author:p.author,title:p.title,text:p.text,type:p.type,audience:p.audience,group:p.groupId,venue:p.venueId,choices:p.choices,relays:destinations(w,p).map(r=>r.id).sort()});}
export function interactionRecords(w:ProductWorld,postId:string):PublicInteraction[]{if(!w.identity.signedIn)return [];return w.objects.filter(o=>o.kind==='nostr-interaction'&&o.owner===w.owner&&o.postId===postId&&w.objects.filter(x=>x.id===o.id).length===1&&o.exampleOnly===true&&Array.isArray(o.history)&&Number.isSafeInteger(o.version)) as PublicInteraction[];}
export function interactionCurrent(w:ProductWorld,r:PublicInteraction){try{return r.owner===w.owner&&r.binding===binding(w,source(w,r.postId));}catch{return false;}}
export function interactionReview(w:ProductWorld,r:PublicInteraction){need(interactionCurrent(w,r),'The original, identity, audience or destinations changed. Review the current original.');return JSON.stringify({id:r.id,version:r.version,binding:r.binding,action:r.action,choice:r.choice,enabled:r.enabled,event:r.eventRef});}
export function preparePublicInteraction(w:ProductWorld,data:Record<string,string>,postId:string,now=Date.now()){
 const p=source(w,postId);need(p.audience==='Public','This public interaction preview does not publish private community content. Use its authorised private workflow.');need(['Like','Repost','Vote'].includes(data.action),'Choose a supported public interaction.');const action=data.action as PublicInteractionAction;
 let choice:number|undefined;if(action==='Vote'){choice=Number(data.choice);need(p.type==='poll'&&Number.isInteger(choice)&&choice>=0&&choice<(p.choices||[]).length,'Choose one of this original poll’s options.');need(p.vote===undefined,'You have already voted on this original.');}
 const prior=interactionRecords(w,postId).find(r=>r.action===action&&!['accepted','failed','cancelled'].includes(r.state));
 if(prior){need(interactionCurrent(w,prior)&&prior.choice===choice,'An unresolved interaction exists. Review that same original attempt first.');return prior;}
 const relayIds=destinations(w,p).map(r=>r.id).sort();need(relayIds.length,'Choose an authorised publishing destination first.');
 const id=`interaction-${now}-${Math.random().toString(36).slice(2)}`;
 const r:PublicInteraction={id,owner:w.owner,kind:'nostr-interaction',postId,action,choice,enabled:action==='Like'?!p.liked:action==='Repost'?!p.reposted:true,audience:p.audience,author:p.author,targetEvent:target(p),relayIds,binding:binding(w,p),state:'prepared',version:1,eventRef:`local-example:${id}`,history:[{state:'prepared',at:now}],exampleOnly:true};w.objects.unshift(r);return r;
}
export function applyPublicInteraction(w:ProductWorld,op:string,data:Record<string,string>,ctx:{objectId?:string},now=Date.now()){
 if(!op.startsWith('nostr.interaction.'))return null;
 const matches=w.objects.filter(o=>o.id===ctx.objectId&&o.kind==='nostr-interaction'&&o.owner===w.owner),r=matches[0] as PublicInteraction;need(matches.length===1&&interactionRecords(w,r.postId).some(x=>x.id===r.id),'Reopen your original interaction.');
 need(data.expectedVersion===String(r.version),'This interaction changed. Review its current original.');
 if(op==='nostr.interaction.cancel'){need(['prepared','signed'].includes(r.state),'A submitted or unknown event cannot be cancelled as if it had never been sent.');r.state='cancelled';r.version++;r.history.push({state:'cancelled',at:now});return {objectId:r.id,message:'Unsent example cancelled. Its original history is retained; no delivered action was removed.'};}
 need(interactionCurrent(w,r),'The original, identity, audience or destinations changed. No new public action was made.');
 const p=source(w,r.postId);let next:PublicInteraction['state'];
 if(op==='nostr.interaction.sign'){
  need(r.state==='prepared'&&data.approved==='Yes'&&data.review===interactionReview(w,r),'Personally review the exact interaction, audience and destinations first.');need(w.identity.signer==='demo-connected','Connect your own signer before approving this interaction.');next='signed';
 }else if(op==='nostr.interaction.submit'){
  need(r.state==='signed','Only this signed example can be submitted.');need(w.identity.signer==='demo-connected'&&w.identity.relayState!=='offline','Reconnect your signer and destinations; keep this same signed event.');next='submitted';
 }else if(op==='nostr.interaction.outcome'){
  need(['submitted','unknown'].includes(r.state),'Review the existing submitted or unknown event.');need(['unknown','failed','accepted'].includes(data.outcome),'Choose an explicit local delivery example.');next=data.outcome as typeof next;
  if(next==='accepted'){if(r.action==='Like')p.liked=r.enabled;else if(r.action==='Repost')p.reposted=r.enabled;else {need(p.vote===undefined||p.vote===r.choice,'A different vote is already recorded.');p.vote=r.choice;}}
 }else throw Error('Unsupported interaction command.');
 r.state=next;r.version++;r.history.push({state:next,at:now});return {objectId:r.id,message:next==='accepted'?'Local relay-acceptance example recorded for this same event. No real relay transmission occurred.':next==='unknown'?'Outcome unknown. Keep this same event; do not create or sign a second attempt.':`${next[0].toUpperCase()+next.slice(1)} example saved on the same interaction. No real Nostr event was sent.`};
}
