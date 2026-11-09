import {validMessageText} from './messageLimits.mjs';
import {validReplyId} from './conversationReply.mjs';
/** Loaded, currently readable originals only. Whitelists data: never serializes
 * MLS state, attachment keys/source parents, private notes or transport ports. */
export function reviewConversationExport(snapshot,selectedIds=null){
 if(!snapshot?.available||!['ready','offline'].includes(snapshot.state)||!Array.isArray(snapshot.messages)||snapshot.messages.length>1000)return null;
 if(selectedIds!==null&&(!Array.isArray(selectedIds)||selectedIds.length>1000||selectedIds.some(id=>typeof id!=='string'||!id)||new Set(selectedIds).size!==selectedIds.length))return null;
 const seen=new Set(),messages=[];
 for(const row of snapshot.messages){
  if(!row||typeof row.id!=='string'||!row.id||row.id.length>200||seen.has(row.id)||typeof row.author!=='string'||row.author.length>200||!validMessageText(row.text)||!['received','sending','sent-to-relay','unconfirmed'].includes(row.status))return null;
  if(row.replyTo!=null&&!validReplyId(row.replyTo))return null;seen.add(row.id);messages.push({id:row.id,...(row.replyTo?{replyTo:row.replyTo}:{}),author:row.author,text:row.text,status:row.status,createdAt:Number.isSafeInteger(row.createdAt)&&row.createdAt>=0?row.createdAt:null,attachmentsOmitted:Array.isArray(row.attachments)?row.attachments.length:0});
 }
 if(selectedIds?.some(id=>!seen.has(id)))return null;
 const included=selectedIds===null?messages:messages.filter(row=>selectedIds.includes(row.id));
 const review={schema:'crays.loaded-conversation-export-review.v1',hasEarlierMessages:snapshot.hasEarlierMessages===true,...(selectedIds===null?{}:{selectedIds:[...selectedIds].sort()}),messages:included};
 return Object.freeze({fingerprint:JSON.stringify(review),count:included.length,attachmentsOmitted:included.reduce((sum,row)=>sum+row.attachmentsOmitted,0),hasEarlierMessages:review.hasEarlierMessages});
}
export function serializeConversationExport({snapshot,review,title,ownPubkey,authorName,selectedIds=null}){
 const current=reviewConversationExport(snapshot,selectedIds);
 if(!review||!current||current.fingerprint!==review.fingerprint)throw Error('The conversation changed. Review the current messages again.');
 const data=JSON.parse(current.fingerprint);
 return JSON.stringify({schema:selectedIds===null?'crays.loaded-conversation-export.v1':'crays.selected-conversation-export.v1',title:String(title).slice(0,200),notice:selectedIds===null?'Local copy of currently loaded messages only. Earlier unloaded messages, attachment files and keys, purchased or linked originals, private notes and other conversations are not included.':'Local copy of selected loaded messages only. Unselected messages, attachment files and keys, private notes and other conversations are not included.',hasEarlierMessages:data.hasEarlierMessages,messages:data.messages.map(row=>({id:row.id,...(row.replyTo?{replyTo:row.replyTo}:{}),author:row.author===ownPubkey||row.author==='self'?'You':String(authorName(row.author)).slice(0,200),text:row.text,status:row.status,createdAt:row.createdAt,attachmentsOmitted:row.attachmentsOmitted}))},null,2);
}
