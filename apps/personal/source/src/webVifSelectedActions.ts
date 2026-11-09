import type {ProductWorld} from './productModel';
import {exactConversation,type ConversationMessage,type LegacyConversationId} from './conversationTools';
import {selectedVifExport,selectableVifMessages,vifSelectionVersion} from './webVifSelection';
import {callLinkContext} from './webVifCallLink';
import {vifLocalView,vifLocalViewKey} from './vifLocalView';
export type SelectedActionMode='Reply'|'Forward'|'Remove';
export type VifSelectionSource={owner:string;id:string;version:string;ids:string[]};
export type SelectionChats=Record<LegacyConversationId,ConversationMessage[]>;
export function selectedActionReview(w:ProductWorld,chats:SelectionChats,s:VifSelectionSource,localOnly=false){
 if(!localOnly)selectedVifExport(w,chats,s.owner,s.id,s.version,s.ids);
 else {if(!w.identity.signedIn||w.owner!==s.owner)throw Error('Your account changed.');const originals=selectableVifMessages(w,chats,s.id);if(vifSelectionVersion(originals)!==s.version||!s.ids.length||s.ids.length>500||new Set(s.ids).size!==s.ids.length||s.ids.some(id=>!originals.some(m=>m.id===id)))throw Error('Choose the exact current messages.');}
 const c=exactConversation(w,s.id),local=vifLocalView(w,s.id);
 if(local.problem||local.removed)throw Error('Review the original local conversation view first.');
 const original=c.kind==='person'?w.people.filter(p=>p.id===c.personId):w.objects.filter(o=>o.id===c.groupId);
 if(original.length!==1)throw Error('This original conversation needs review.');
 const messages=selectableVifMessages(w,chats,s.id).filter(m=>s.ids.includes(m.id));
 return {conversation:c,messages,expected:JSON.stringify([s.owner,c,original[0],s.version,s.ids,local.expected])};
}
export function selectedActionRecipients(w:ProductWorld,source:string){
 if(!w.identity.signedIn)return [];
 const ids=[...w.people.map(p=>p.id==='alex'?'alex':'person:'+p.id),...w.objects.filter(o=>o.owner===w.owner&&o.kind==='group').map(o=>o.id==='circle-design'?'circle':'group:'+o.id)];
 return [...new Set(ids)].filter(id=>id!==source).flatMap(id=>{try{const {conversation:c,expected}=callLinkContext(w,id);return [{id,title:c.title,kind:c.kind,personId:c.personId,groupId:c.groupId,expected}];}catch{return [];}});
}
export function selectedActionText(w:ProductWorld,chats:SelectionChats,s:VifSelectionSource,expected:string,mode:'Reply'|'Forward',targetId:string,targetExpected:string,reply:string){
 if(!['Reply','Forward'].includes(mode))throw Error('Choose an explicit Reply or Forward action.');
 const review=selectedActionReview(w,chats,s);if(review.expected!==expected)throw Error('The selected originals or permissions changed. Return and select them again.');
 if(!review.conversation.canSend)throw Error('This source conversation is no longer available for messaging.');
 const target=callLinkContext(w,targetId);if(target.expected!==targetExpected)throw Error('The recipient or its permissions changed. Review the recipient again.');
 if(mode==='Reply'&&(targetId!==s.id||s.ids.length!==1||!reply.trim()||reply.length>2000))throw Error('Choose one message and write a reply of up to 2,000 characters.');
 if(mode==='Forward'&&(!selectedActionRecipients(w,s.id).some(t=>t.id===targetId&&t.expected===targetExpected)||s.ids.length>20))throw Error('Choose one permitted destination and up to 20 current messages.');
 const text=review.messages.map(m=>m.text).filter(t=>!!t.trim()).join('\n\n');if(!text.trim())throw Error('This selection has no text to copy. Open attachments in their original shared-content view.');
 const authored=review.messages.filter(m=>m.text.trim()).map(m=>{const sender=m.from==='me'||m.author===w.owner?w.profiles[w.owner]?.name||'You':review.conversation.kind==='group'?w.people.filter(p=>p.id===m.author).length===1?w.people.find(p=>p.id===m.author)!.name:'Circle participant':review.conversation.title;return sender+': '+m.text;}).join('\n\n');
 const output=mode==='Reply'?`Reply to ${review.conversation.title} (quoted text):\n${text.split('\n').map(l=>'> '+l).join('\n')}\n\n${reply.trim()}`:`Forwarded text from conversation ${review.conversation.title}:\n${authored}\n\nText copy only. Original attachments are not included.`;
 if(output.length>32000)throw Error('This text is too long for one draft. Select fewer messages.');return output;
}
export function removeSelectedVifMessages(w:ProductWorld,chats:SelectionChats,s:VifSelectionSource,expected:string,confirmed:boolean){
 const review=selectedActionReview(w,chats,s,true);if(confirmed!==true||expected!==review.expected)throw Error('Review and confirm the current selected messages.');
 const local=vifLocalView(w,s.id),hiddenIds=[...new Set([...local.hiddenIds,...s.ids])];if(hiddenIds.length>10000)throw Error('This local view is too large. Nothing was changed.');
 return {...w,settings:{...w.settings,[vifLocalViewKey(w,s.id)]:JSON.stringify({version:1,hiddenIds,removed:false})}};
}
export {vifSelectionVersion};
