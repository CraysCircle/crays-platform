import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {HumanConversationClient} from './humanConversationClient.mjs';
import type {ConversationExportReview} from './conversationExport.mjs';
import {reviewConversationExport,serializeConversationExport} from './conversationExport.mjs';

/** Reuses the approved original export side-panel structure. No bundled demo
 * file, hidden fetch, server export or attachment-key serialization. */
export function WebConversationExport({client,title,ownPubkey,authorName,isCurrent,onClose,selectedIds=null,onForward,onRemove}:{client:HumanConversationClient;title:string;ownPubkey:string;authorName:(pubkey:string)=>string;isCurrent:()=>boolean;onClose:()=>void;selectedIds?:readonly string[]|null;onForward?:()=>void;onRemove?:()=>void}){
 const snapshot=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot);
 const [approval,setApproval]=useState<ConversationExportReview|null>(null),[feedback,setFeedback]=useState('');
 const closeButton=useRef<HTMLButtonElement>(null),urls=useRef(new Map<string,ReturnType<typeof setTimeout>>());
 const review=reviewConversationExport(snapshot,selectedIds),confirmed=!!review&&approval?.fingerprint===review.fingerprint;
 const revoke=()=>{for(const [url,timer] of urls.current){clearTimeout(timer);URL.revokeObjectURL(url);}urls.current.clear();};
 useEffect(()=>{closeButton.current?.focus({preventScroll:true});return revoke;},[client]);
 useEffect(()=>{if(!snapshot.available){revoke();setApproval(null);setFeedback('');}},[snapshot.available]);
 const download=()=>{try{
  if(!approval||!isCurrent())throw Error('This conversation is no longer available.');
  const json=serializeConversationExport({snapshot:client.getSnapshot(),review:approval,title,ownPubkey,authorName,selectedIds});
  const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  if(!isCurrent()){URL.revokeObjectURL(url);throw Error('This conversation is no longer available.');}
  const timer=setTimeout(()=>{URL.revokeObjectURL(url);urls.current.delete(url);},1000);urls.current.set(url,timer);
  const link=document.createElement('a');link.href=url;link.download=selectedIds===null?'crays-conversation.json':'crays-selected-messages.json';link.click();setFeedback('Local download requested.');
 }catch(error){setApproval(null);setFeedback(error instanceof Error?error.message:'The local copy could not be prepared.');}};
 const copy=async()=>{try{
  if(!approval||!isCurrent())throw Error('This conversation is no longer available.');
  const data=JSON.parse(serializeConversationExport({snapshot:client.getSnapshot(),review:approval,title,ownPubkey,authorName,selectedIds}));
  if(!navigator.clipboard?.writeText)throw Error('Clipboard access is unavailable. Download a local copy instead.');
  await navigator.clipboard.writeText(data.messages.map((row:{author:string;text:string})=>row.author+': '+row.text).join('\n\n'));
  if(isCurrent())setFeedback('Selected text copied.');
 }catch(error){setApproval(null);setFeedback(error instanceof Error?error.message:'The selected text could not be copied.');}};
 return <aside className="web-vif-export-panel private-conversation-export" aria-label={selectedIds===null?"Chat export review":"Selected messages review"} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}}>
 <header><h2>{selectedIds===null?'Export chat':'Your selection'}</h2><button ref={closeButton} type="button" aria-label="Close chat export" onClick={onClose}>×</button></header>
 <div className="web-vif-contact-scroll">{review?<><p>This conversation only.</p><section><h3>What to include</h3><p>{review.count} {selectedIds===null?'currently loaded':'selected'} {review.count===1?'message':'messages'}.</p>{selectedIds!==null&&<div className="private-selected-previews">{snapshot.messages.filter(row=>selectedIds.includes(row.id)).map(row=><div className="web-vif-selected-preview" key={row.id}><strong>{row.author===ownPubkey||row.author==='self'?'You':authorName(row.author)}</strong><p>{row.text||'Attachment (file not included)'}</p></div>)}</div>}<p>Text and message status only. Attachment files and keys are not included.</p>{review.attachmentsOmitted>0&&<p>{review.attachmentsOmitted} attachment references omitted.</p>}{review.hasEarlierMessages&&<p>Earlier messages are not loaded and will not be included.</p>}</section><section><h3>Review exclusions</h3><p>Purchased or linked originals, private connection notes and other conversations are not included.</p></section><section><label className="web-vif-export-choice"><input type="checkbox" checked={confirmed} onChange={event=>{setApproval(event.target.checked?review:null);setFeedback('');}}/><span>I want to create this local conversation copy.</span></label><button type="button" className="web-vif-export-download" disabled={!confirmed||!review.count} onClick={download}>{selectedIds===null?'Download chat copy':'Download selected messages'}</button>{selectedIds!==null&&<button type="button" className="web-vif-export-cancel" disabled={!confirmed||!review.count} onClick={()=>void copy()}>Copy selected text</button>}{selectedIds!==null&&onForward&&<button type="button" className="web-vif-export-cancel" disabled={!review.count||review.count>20} onClick={()=>{try{onForward();}catch(error){setFeedback(error instanceof Error?error.message:'Choose current text messages to forward.');}}}>Forward selected text</button>}{selectedIds!==null&&onRemove&&<button type="button" className="web-vif-export-cancel" disabled={!review.count} onClick={()=>{try{onRemove();}catch(error){setFeedback(error instanceof Error?error.message:'Choose current confirmed messages.');}}}>Remove selected from my view</button>}<button type="button" className="web-vif-export-cancel" onClick={onClose}>Cancel</button>{approval&&!confirmed&&<p role="status">Messages changed. Review the current copy again.</p>}</section></>:<p role="status">This conversation is no longer available for export.</p>}{feedback&&<p role="status">{feedback}</p>}<p className="web-vif-export-local">Local copy only. Other people’s copies remain unchanged.</p></div></aside>;
}
