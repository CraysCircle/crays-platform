import type {Entity,ProductWorld} from './productModel';
import {exactConversation} from './conversationTools';
export const callLinkDurations={'1 hour':3600000,'24 hours':86400000,'7 days':604800000} as const;
export function callLinkContext(w:ProductWorld,chatId:string){
 const c=exactConversation(w,chatId);
 if(!w.identity.signedIn||!w.owner||c.kind==='agent'||!c.canRead||!c.canSend)throw Error('Review this exact permitted conversation before preparing a call link.');
 const original=c.kind==='person'?w.people.filter(p=>p.id===c.personId):w.objects.filter(o=>o.id===c.groupId);
 if(original.length!==1)throw Error('This original conversation needs review.');
 return {conversation:c,expected:JSON.stringify([w.owner,c.channel,c.title,original[0]])};
}
export function ownCallLinks(w:ProductWorld,chatId:string){
 if(!w.identity.signedIn)return [];let channel='';try{channel=exactConversation(w,chatId).channel;}catch{return [];}
 return w.objects.filter(o=>o.kind==='web-call-link'&&o.owner===w.owner&&o.chatId===chatId&&o.channelId===channel&&typeof o.id==='string'&&!!o.id&&w.objects.filter(q=>q.id===o.id).length===1);
}
export function callLinkState(w:ProductWorld,link:Entity,now=Date.now()):'Ready'|'Expired'|'Revoked'|'Needs review'{
 if(!w.identity.signedIn||link.owner!==w.owner||link.kind!=='web-call-link'||w.objects.filter(o=>o.id===link.id).length!==1||!['Voice','Video'].includes(String(link.type))||!['active','revoked'].includes(String(link.status))||link.realExecution!==false||link.chuckIncluded!==false||typeof link.note!=='string'||link.note.length>400||typeof link.createdAt!=='number'||!Number.isFinite(link.createdAt)||typeof link.expiresAt!=='number'||!Number.isFinite(link.expiresAt)||!Object.values(callLinkDurations).includes((link.expiresAt-link.createdAt) as 3600000))return 'Needs review';
 if(link.status==='revoked')return 'Revoked';
 if(link.expiresAt<=now)return 'Expired';
 try{const ctx=callLinkContext(w,String(link.chatId));if(ctx.expected!==link.sourceSnapshot||ctx.conversation.channel!==link.channelId)return 'Needs review';}catch{return 'Needs review';}
 return 'Ready';
}
export function callLinkDraft(w:ProductWorld,linkId:string){const links=w.objects.filter(o=>o.id===linkId);if(links.length!==1||callLinkState(w,links[0])!=='Ready')throw Error('This call link is no longer ready. Review its original conversation, expiry or revocation.');const l=links[0];return `${String(l.type)} call · local preview\nConversation: ${exactConversation(w,String(l.chatId)).title}\nLocal reference: ${l.id}\nExpires: ${new Date(Number(l.expiresAt)).toISOString()}\n${l.note?String(l.note)+'\n':''}Local preview only. This is not a live join link; no call, media connection or Chuck access is created.`;}
