import type {WebChuckRuntime} from './WebPersonalChuck';
import type {ConversationMessage} from './conversationTools';

/** Projection of the currently authorized loaded transcript, never local demos. */
export function canonicalChuckSearch(runtime:WebChuckRuntime|undefined,query:string):ConversationMessage[]{
 const snapshot=runtime?.snapshot,q=query.trim().toLowerCase();
 if(!q||!runtime?.controller||!snapshot?.conversation||!['ready','waiting-reply'].includes(snapshot.phase))return [];
 return snapshot.messages.map(message=>({
  id:message.messageId,
  text:message.body,
  from:message.authorKind==='OWNER'?'me' as const:'them' as const,
  createdAt:Date.parse(message.createdAt),
  attachment:message.originals?.map(original=>original.displayName).join(', '),
 })).filter(message=>(message.text+' '+(message.attachment||'')).toLowerCase().includes(q));
}
