import {vifMessageExpired,vifMessageExpiry} from './vifDisappearing';
import {vifLocalView} from './vifLocalView';
import {circleVisibleMessages} from './circleAccess.ts';
import type {ProductWorld,ActionContext,Entity} from './productModel.ts';
import {canDirectMessage,canGroupCommunicate,activeAgentPermission,mayChuckReadMessage} from './communicationPolicy.ts';
import {chatPhotoExampleName} from './chatPhoto.ts';
export type LegacyConversationId='chuck'|'alex'|'circle';
export type ConversationMessage={id:string;text:string;attachment?:string;featureContext?:Record<string,string>;from?:'me'|'them';author?:string;createdAt?:number;localViewTimer?:unknown};
function projectedMessage(o:Entity):ConversationMessage{return {...(o.featureContext&&typeof o.featureContext==='object'&&!Array.isArray(o.featureContext)&&Object.values(o.featureContext).every(v=>typeof v==='string')?{featureContext:o.featureContext as Record<string,string>}:{}),localViewTimer:o.localViewTimer,id:o.id,text:String(o.text||''),attachment:o.attachment?String(o.attachment):undefined,...(o.from==='me'||o.from==='them'?{from:o.from}:{}),...(typeof o.author==='string'?{author:o.author}:{}),...(typeof o.createdAt==='number'&&Number.isFinite(o.createdAt)?{createdAt:o.createdAt}:{})};}
export function exactConversation(w:ProductWorld,id:string){
 const legacyId=['chuck','alex','circle'].includes(id)?id as LegacyConversationId:undefined;
 const agent=id==='chuck',groupId=id==='circle'?'circle-design':id.startsWith('group:')?id.slice(6):'',personId=id==='alex'?'alex':id.startsWith('person:')?id.slice(7):'';
 if(!agent&&!groupId&&!personId)throw Error('Choose the exact original conversation.');
 const kind=agent?'agent':groupId?'group':'person';
 const groupRows=groupId?w.objects.filter(o=>o.id===groupId):[],personRows=personId?w.people.filter(p=>p.id===personId):[];
 const group=groupRows.length===1&&groupRows[0].owner===w.owner&&groupRows[0].kind==='group'?groupRows[0]:undefined;
 const person=personRows.length===1?personRows[0]:undefined;
 const canRead=Boolean(w.identity.signedIn&&(agent||kind==='person'&&person||kind==='group'&&group&&canGroupCommunicate(w,groupId)));
 const context:Partial<ActionContext>=kind==='group'?{chatId:id,objectId:groupId}:kind==='person'?{chatId:id,personId}:{chatId:'chuck'};
 return {id,legacyId,kind,groupId,personId,context,channel:kind==='group'?`group:${groupId}`:kind==='person'?`person:${personId}`:`agent:${w.owner}`,title:kind==='group'?String(group?.name||'Conversation'):kind==='person'?String(person?.name||'Conversation'):'Chuck Crays',canRead,canSend:agent?w.identity.signedIn:kind==='group'?canGroupCommunicate(w,groupId):canDirectMessage(w,personId),themeKey:`chatBackground:${legacyId||id}`};
}
export function conversationMessages(w:ProductWorld,chats:Record<LegacyConversationId,ConversationMessage[]>,id:string):ConversationMessage[]{
 const c=exactConversation(w,id),local=vifLocalView(w,id);if(!c.canRead||local.problem)return [];
 if(c.kind==='group')return circleVisibleMessages(w,c.groupId).filter(o=>typeof o.id==='string'&&o.id.length>0&&w.objects.filter(x=>x.id===o.id).length===1).map(projectedMessage).filter(m=>!local.hiddenIds.includes(m.id)&&!vifMessageExpired(w,id,m));
 const messages=c.legacyId?[...(chats[c.legacyId]||[])]:[];
 if(c.kind!=='agent')for(const o of w.objects.filter(o=>o.owner===w.owner&&((c.kind==='person'&&o.kind==='private-message'&&o.personId===c.personId)||(c.kind==='group'&&o.kind==='group-message'&&o.groupId===c.groupId))))messages.push(projectedMessage(o));
 return messages.filter(m=>!local.hiddenIds.includes(m.id)&&!vifMessageExpired(w,id,m)&&typeof m.id==='string'&&m.id.length>0&&messages.filter(x=>x.id===m.id).length===1&&w.objects.filter(o=>o.id===m.id).length<=(c.legacyId&&(chats[c.legacyId]||[]).some(x=>x.id===m.id)?0:1));
}
/** A per-render read index. Never persisted or cached across account/world changes.
 * Uses the same canonical IDs, ambiguity, local hiding and expiry rules as the full reader. */
export function inboxMessageReader(w:ProductWorld,chats:Record<LegacyConversationId,ConversationMessage[]>){
 const counts=new Map<string,number>(),byPerson=new Map<string,Entity[]>();
 for(const o of w.objects){counts.set(o.id,(counts.get(o.id)||0)+1);if(o.owner===w.owner&&o.kind==='private-message'&&typeof o.personId==='string')byPerson.set(o.personId,[...(byPerson.get(o.personId)||[]),o]);}
 return (id:string):ConversationMessage[]=>{
  const c=exactConversation(w,id),local=vifLocalView(w,id);if(!c.canRead||local.problem)return[];
  if(c.kind==='group')return conversationMessages(w,chats,id);
  const legacy=c.legacyId?chats[c.legacyId]||[]:[],messages=[...legacy,...(c.kind==='person'?(byPerson.get(c.personId)||[]).map(projectedMessage):[])],messageCounts=new Map<string,number>();for(const m of messages)messageCounts.set(m.id,(messageCounts.get(m.id)||0)+1);
  return messages.filter(m=>!local.hiddenIds.includes(m.id)&&!vifMessageExpired(w,id,m)&&typeof m.id==='string'&&m.id.length>0&&messageCounts.get(m.id)===1&&(counts.get(m.id)||0)<=(legacy.some(x=>x.id===m.id)?0:1));
 };
}
export function searchConversation(w:ProductWorld,chats:Record<LegacyConversationId,ConversationMessage[]>,id:string,query:string){const q=query.trim().toLowerCase();return q?conversationMessages(w,chats,id).filter(m=>`${m.text} ${m.attachment||''}`.toLowerCase().includes(q)):[];}
export function conversationLinks(message:ConversationMessage){return [...new Set((message.text.match(/https?:\/\/[^\s<>]+/g)||[]).map(url=>url.replace(/[),.;!?]+$/,'')))];}
export function conversationShared(w:ProductWorld,chats:Record<LegacyConversationId,ConversationMessage[]>,id:string){return conversationMessages(w,chats,id).filter(m=>m.attachment||m.featureContext?.postId||m.featureContext?.sourcePostId||conversationLinks(m).length);}
export function exactConversationContext(w:ProductWorld,ctx:Partial<ActionContext>){
 if(ctx.chatId){const c=exactConversation(w,ctx.chatId);if(ctx.personId&&ctx.personId!==c.personId||ctx.objectId&&ctx.objectId!==c.groupId)throw Error('This conversation context does not match its original.');return c;}
 if(ctx.objectId)return exactConversation(w,ctx.objectId==='circle-design'?'circle':`group:${ctx.objectId}`);
 if(ctx.personId)return exactConversation(w,ctx.personId==='chuck'?'chuck':ctx.personId==='alex'?'alex':`person:${ctx.personId}`);
 throw Error('Open shared content from its exact original conversation.');
}

export type SharedChuckPhotoSearch={messages:ConversationMessage[];supported:boolean;message:string};
/** One labelled local intent, not semantic search or a model call. Every peer-chat original keeps its current canonical grant. */
export function sharedChuckPhotoSearch(w:ProductWorld,chats:Record<LegacyConversationId,ConversationMessage[]>,id:string,query:string):SharedChuckPhotoSearch{
 const request=query.trim().replace(/[.!?,;:]+$/,'').replace(/\s+/g,' ').toLowerCase();
 if(request!=='find the photo i shared in this conversation')return {messages:[],supported:false,message:'This local example supports: “Find the photo I shared in this conversation.” No general AI search is connected.'};
 let c:ReturnType<typeof exactConversation>;try{c=exactConversation(w,id);}catch{return {messages:[],supported:true,message:'Open the exact original conversation before searching.'};}
 if(!c.canRead)return {messages:[],supported:true,message:'This original conversation is unavailable.'};
 if(c.kind!=='agent'&&!activeAgentPermission(w,c.channel))return {messages:[],supported:true,message:'Chuck needs the current participant-approved permission for this conversation.'};
 const messages=conversationShared(w,chats,id).filter(message=>{
  if(message.attachment!==chatPhotoExampleName)return false;
  if(c.kind==='agent')return message.from==='me'||message.author===w.owner;
  const rows=w.objects.filter(o=>o.id===message.id);
  let original:Entity|undefined;
  if(rows.length){
   if(rows.length!==1)return false;const row=rows[0];
   if(row.owner!==w.owner||!(c.kind==='person'&&row.kind==='private-message'&&row.personId===c.personId||c.kind==='group'&&row.kind==='group-message'&&row.groupId===c.groupId)||row.attachment!==message.attachment||String(row.text||'')!==message.text)return false;
   original=row;
  }else if(c.legacyId&&c.kind==='person'){
   const originals=(chats[c.legacyId]||[]).filter(m=>m.id===message.id);if(originals.length!==1)return false;const row=originals[0];
   // The legacy cache is the active owner's exact chosen conversation. No timestamp is invented.
   original={id:row.id,owner:w.owner,kind:'private-message',personId:c.personId,text:row.text,attachment:row.attachment,from:row.from,author:row.author,...(typeof row.createdAt==='number'&&Number.isFinite(row.createdAt)?{createdAt:row.createdAt}:{})};
  }
  return !!original&&(original.from==='me'||original.author===w.owner)&&mayChuckReadMessage(w,c.channel,original);
 });
 return {messages,supported:true,message:messages.length?'Local example: your shared photo, only within this conversation and its current message permissions.':'No photo you shared is available within this conversation’s current message permissions.'};
}
/** Ambiguous originals stay stored; their content is not selected by first-match order. */
export function conversationMessageReviewCount(w:ProductWorld,chats:Record<LegacyConversationId,ConversationMessage[]>,id:string){
 const c=exactConversation(w,id);if(!c.canRead)return 0;const local=vifLocalView(w,id);
 const candidates:object[]=c.kind==='group'?circleVisibleMessages(w,c.groupId):[...(c.legacyId?(chats[c.legacyId]||[]):[]),...(c.kind==='person'?w.objects.filter(o=>o.owner===w.owner&&o.kind==='private-message'&&o.personId===c.personId):[])];
 const eligible=candidates.filter(m=>{const expiry=vifMessageExpiry(w,id,m),raw=m as {id:string};return !local.hiddenIds.includes(raw.id)&&!(Number.isFinite(expiry)&&expiry<=Date.now());});
 return Math.max(0,eligible.length-conversationMessages(w,chats,id).length);
}
