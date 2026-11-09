import type {ProductWorld} from './productModel';
import {exactConversation,conversationMessages,type ConversationMessage,type LegacyConversationId} from './conversationTools';
import {privacyReviewSnapshot,privacyState} from './privacyOverview';
import {vifLocalView} from './vifLocalView';
export type ConsentChats=Record<LegacyConversationId,ConversationMessage[]>;
export function vifConsentContext(w:ProductWorld,chats:ConsentChats,id:string){
 const c=exactConversation(w,id);if(!w.identity.signedIn||!w.owner||!c.canRead||c.kind==='agent')throw Error('Open your exact private or Circle conversation.');
 const original=c.kind==='person'?w.people.filter(p=>p.id===c.personId):w.objects.filter(o=>o.id===c.groupId);if(original.length!==1)throw Error('This original conversation needs review.');
 const local=vifLocalView(w,id);if(local.problem)throw Error('Review the original local conversation view first.');
 const messages=conversationMessages(w,chats,id),permissions=w.objects.filter(o=>o.owner===w.owner&&['permission','delegation'].includes(String(o.kind))&&o.channelId===c.channel&&w.objects.filter(x=>x.id===o.id).length===1);
 return {conversation:c,messages,permissions,expected:JSON.stringify([w.owner,c,original[0],messages,local.expected,permissions.map(o=>[privacyReviewSnapshot(o),privacyState(o)])])};
}
export function validateVifConsent(w:ProductWorld,chats:ConsentChats,owner:string,id:string,expected:string,draft:Record<string,string>){
 if(w.owner!==owner||!w.identity.signedIn)throw Error('Your account changed. Reopen your own conversation.');const context=vifConsentContext(w,chats,id);if(context.expected!==expected||!context.conversation.canSend)throw Error('The conversation, messages or permissions changed. Review the current originals again.');
 if(!draft.purpose?.trim())throw Error('Describe one clear purpose before reviewing this permission.');
 if(!['From now only','Selected messages only','No history'].includes(draft.history)||!['Waiting','Accept','Decline'].includes(draft.response))throw Error('Choose an explicit history scope and participant response.');
 const ids=(draft.selectedMessages||'').split(',').map(s=>s.trim()).filter(Boolean);if(draft.history==='Selected messages only'&&(!ids.length||ids.length>500||new Set(ids).size!==ids.length||ids.some(id=>!context.messages.some(m=>m.id===id))))throw Error('Choose exact, unique, currently readable messages from this conversation.');
 const expiry=(draft.expires||'Until revoked').trim();if(expiry.toLocaleLowerCase()!=='until revoked'&&(!Number.isFinite(Date.parse(expiry))||Date.parse(expiry)<=Date.now()))throw Error('Use an explicit future expiry date or Until revoked.');
 return {context,data:{...draft,selectedMessages:draft.history==='Selected messages only'?ids.join(','):'',expires:expiry,name:draft.name?.trim()||'Limited permission',recipient:draft.recipient?.trim()||'Chuck',purpose:draft.purpose.trim(),scope:draft.scope||'Selected data',dataType:draft.scope||'Selected data',requiresParticipants:'Yes',participantConsent:draft.response==='Accept'?'Yes':'No',kind:'permission',status:'active'}};
}
