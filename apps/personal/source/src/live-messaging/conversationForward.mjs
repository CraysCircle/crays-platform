import {validMessageText} from './messageLimits.mjs';
import {FORWARD_CATALOG_MAX_TARGETS} from './conversationCatalogLimits.mjs';
import {reviewConversationExport} from './conversationExport.mjs';

/** Original selected-text flow: stage ONE unsent draft, never send a message.
 * Destination admission and atomic draft compare/update belong to the canonical
 * parent. A shared relay, copied label or group ID cannot supply that authority. */
export function reviewConversationForward({snapshot,selectedIds,title,ownPubkey,authorName}){
 const selected=reviewConversationExport(snapshot,selectedIds);
 if(!selected||!selectedIds?.length||selectedIds.length>20||typeof title!=='string'||!title||title.length>200)return null;
 const rows=snapshot.messages.filter(row=>selectedIds.includes(row.id));
 if(rows.some(row=>!['received','sent-to-relay'].includes(row.status)))return null;
 const textRows=rows.filter(row=>row.text.trim());
 if(!textRows.length)return null;
 const text='Forwarded text from conversation '+title+':\n'+textRows.map(row=>(row.author===ownPubkey||row.author==='self'?'You':String(authorName(row.author)).slice(0,200))+': '+row.text).join('\n\n')+'\n\nText copy only. Original attachments are not included.';
 // Match the original one-draft bound, including the reviewed author/context
 // prefix. Never truncate selected originals or split into automatic sends.
 if(!validMessageText(text))return null;
 return Object.freeze({fingerprint:selected.fingerprint,selectedIds:Object.freeze([...selectedIds]),text,count:rows.length,attachmentsOmitted:selected.attachmentsOmitted});
}

export function admittedForwardTargets(port,accountId,sourceConversationId){
 if(!port||port.accountId!==accountId||!port.signal||port.signal.aborted)return [];
 const snapshot=port.getSnapshot();
 if(!snapshot?.available||!Array.isArray(snapshot.targets)||snapshot.targets.length>FORWARD_CATALOG_MAX_TARGETS)return [];
 const ids=new Set();
 for(const row of snapshot.targets){
  if(!row||typeof row.conversationId!=='string'||!row.conversationId||row.conversationId.length>200||ids.has(row.conversationId)||!['person','spot','circle'].includes(row.kind)||typeof row.title!=='string'||!row.title||row.title.length>200||typeof row.version!=='string'||!row.version||row.version.length>1000)return [];
  ids.add(row.conversationId);
 }
 return snapshot.targets.filter(row=>row.conversationId!==sourceConversationId&&!['chuck','person:chuck'].includes(row.conversationId));
}

export function stageConversationForward({client,review,source,port,target,expectedDraft,replace=false}){
 if(!source.isCurrent())throw Error('The original conversation is no longer available.');
 const current=reviewConversationForward({...source,snapshot:client.getSnapshot(),selectedIds:review?.selectedIds});
 if(!review||!current||current.fingerprint!==review.fingerprint||current.text!==review.text)throw Error('The selected messages changed. Select the current originals again.');
 const destination=admittedForwardTargets(port,source.accountId,source.conversationId).find(row=>row.conversationId===target?.conversationId&&row.version===target?.version);
 if(!destination)throw Error('The destination changed. Choose a permitted conversation again.');
 const draft=port.getDraft(destination.conversationId,destination.version);
 if(!draft||!validMessageText(draft.text)||typeof draft.version!=='string'||!draft.version||draft.version!==expectedDraft?.version||draft.text!==expectedDraft?.text||(draft.replyTo??null)!==(expectedDraft?.replyTo??null)||!!draft.hasAttachments!==!!expectedDraft?.hasAttachments)throw Error('The destination draft changed. Review it again.');
 if((draft.text.length>0||draft.replyTo)&&replace!==true)throw Error('Review and explicitly replace the existing unsent text or reply.');
 if(!source.isCurrent()||port.signal.aborted)throw Error('Messaging access changed. Nothing was sent.');
 const result=port.stageDraft({accountId:source.accountId,sourceConversationId:source.conversationId,conversationId:destination.conversationId,expectedTargetVersion:destination.version,expectedDraftVersion:draft.version,text:current.text,replyTo:null,replace:replace===true,preserveAttachments:true});
 if(!result||result.status!=='draft-ready'||result.conversationId!==destination.conversationId)throw Error('The destination draft could not be confirmed. Check that conversation before trying again.');
 return Object.freeze({status:'draft-ready',conversationId:destination.conversationId});
}
