import type {ProductWorld} from './productModel';
import {exactConversation,conversationMessages,type ConversationMessage,type LegacyConversationId} from './conversationTools';
type Chats=Record<LegacyConversationId,ConversationMessage[]>;
export function selectableVifMessages(w:ProductWorld,chats:Chats,id:string){const c=exactConversation(w,id);if(!c.canRead||c.kind==='agent')throw Error('Choose an authorised private or Circle conversation.');return conversationMessages(w,chats,id);}
export const vifSelectionVersion=(messages:ConversationMessage[])=>JSON.stringify(messages);
export function selectedVifExport(w:ProductWorld,chats:Chats,owner:string,id:string,version:string,ids:string[],wholeConversation=false){
 if(!w.identity.signedIn||w.owner!==owner)throw Error('Your account changed.');const messages=selectableVifMessages(w,chats,id);
 if(vifSelectionVersion(messages)!==version)throw Error('This conversation changed. Cancel and select the current originals again.');
 if(!ids.length||!wholeConversation&&ids.length>500||new Set(ids).size!==ids.length||ids.some(id=>!messages.some(m=>m.id===id)))throw Error('Choose the exact current messages.');
 const selected=messages.filter(m=>ids.includes(m.id));
 if(selected.some(m=>m.featureContext&&(m.featureContext.postId||'sourcePostId' in m.featureContext)||w.objects.some(o=>o.id===m.id&&o.featureContext&&typeof o.featureContext==='object'&&('postId' in o.featureContext||'sourcePostId' in o.featureContext))))throw Error('Purchased or linked originals have separate rights. Open their original shared-content view.');
 const c=exactConversation(w,id),output={format:'CRAYS local conversation copy',version:1,conversation:c.title,exportedAt:new Date().toISOString(),notice:'Local text copy. Attachments are references only. Recipient copies are unchanged.',messages:selected.map(m=>({text:m.text,sender:m.from==='me'?'You':c.kind==='group'?(m.author===w.owner?'You':w.people.filter(p=>p.id===m.author).length===1?w.people.find(p=>p.id===m.author)!.name:'Circle participant'):c.title,...(m.attachment?{attachmentReference:m.attachment}:{}),...(typeof m.createdAt==='number'&&Number.isFinite(m.createdAt)&&m.createdAt>0?{createdAt:new Date(m.createdAt).toISOString()}:{} )}))};
 return {json:JSON.stringify(output,null,2),text:output.messages.map(m=>m.sender+': '+m.text+(m.attachmentReference?'\nAttachment reference: '+m.attachmentReference:'')).join('\n\n'),count:selected.length};
}
