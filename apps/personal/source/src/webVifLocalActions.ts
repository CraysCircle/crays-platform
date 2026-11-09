import type {ProductWorld} from './productModel';
import {conversationMessages,exactConversation,type ConversationMessage,type LegacyConversationId} from './conversationTools';
import {vifSelectionVersion} from './webVifSelection';
import {vifLocalView,vifLocalViewKey} from './vifLocalView';
type Chats=Record<LegacyConversationId,ConversationMessage[]>;
export function vifLocalReview(w:ProductWorld,chats:Chats,id:string){const c=exactConversation(w,id);if(!c.canRead||c.kind==='agent')throw Error('Choose your exact private or Circle conversation.');const local=vifLocalView(w,id);if(local.problem)throw Error('This saved local view needs review. Its original records have been kept.');const messages=conversationMessages(w,chats,id);return {expected:JSON.stringify({messages:vifSelectionVersion(messages),local:local.expected}),count:messages.length,attachments:messages.filter(m=>m.attachment).length};}
export function applyVifLocalAction(w:ProductWorld,chats:Chats,owner:string,id:string,expected:string,action:string,confirmed:boolean){
 if(w.owner!==owner||!w.identity.signedIn||confirmed!==true)throw Error('Review your signed-in account and confirm this exact local action.');
 if(!['Clear','Delete','Restore'].includes(action))throw Error('Choose an explicit local view action.');
 if(vifLocalReview(w,chats,id).expected!==expected)throw Error('This conversation or local view changed. Reopen the review.');
 const previous=vifLocalView(w,id),messages=conversationMessages(w,chats,id);if(action==='Clear'&&!messages.length)throw Error('There are no visible messages to clear.');
 const hiddenIds=action==='Restore'?[]:[...new Set([...previous.hiddenIds,...messages.map(m=>m.id)])];if(hiddenIds.length>10000)throw Error('This conversation is too large for one local view action. Nothing has changed.');
 return {...w,settings:{...w.settings,[vifLocalViewKey(w,id)]:JSON.stringify({version:1,hiddenIds,removed:action==='Delete'})}};
}
