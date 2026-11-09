import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {HumanConversationClient} from './humanConversationClient.mjs';
import type {ConversationLocalView,LocalViewReview} from './conversationLocalView.mjs';

/** Original reviewed local removal/restoration; other people's copies, source
 * records, attachment bytes, connections and unsent drafts stay unchanged. */
export function WebConversationLocalView({client,controller,review,ownPubkey,authorName,isCurrent,onBack,onApplied}:{client:HumanConversationClient;controller:ConversationLocalView;review:LocalViewReview;ownPubkey:string;authorName:(pubkey:string)=>string;isCurrent:()=>boolean;onBack:()=>void;onApplied:()=>void}){
 const snapshot=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot),view=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const [approval,setApproval]=useState<LocalViewReview|null>(null),[feedback,setFeedback]=useState('');const confirmed=approval===review;
 const button=useRef<HTMLButtonElement>(null),generation=useRef(0);
 useEffect(()=>{generation.current++;button.current?.focus({preventScroll:true});return()=>{generation.current++;};},[controller,review]);
 const removing=review.type==='remove',selectionVisible=!removing||review.ids.every(id=>snapshot.messages.some(message=>message.id===id));
 const current=snapshot.available&&view.available&&selectionVisible&&controller.isReviewCurrent(review);
 const apply=async()=>{if(!confirmed||!isCurrent())return;const latest=client.getSnapshot();if(!latest.available||review.type==='remove'&&!review.ids.every(id=>latest.messages.some(message=>message.id===id))){setApproval(null);setFeedback('The selected messages are no longer visible. Return and select the current originals.');return;}const captured=generation.current;try{await controller.confirm(review);if(captured===generation.current&&isCurrent())onApplied();}catch(error){if(captured===generation.current){setApproval(null);setFeedback(error instanceof Error?error.message:'The local change could not be confirmed. Reopen this view before trying again.');}}};
 return <aside className="private-conversation-export private-conversation-local-view" aria-label="Local conversation view review" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onBack();}}}>
 <header><h2>{removing?'Remove from your view':'Restore local view'}</h2><button ref={button} type="button" aria-label="Cancel local view change" onClick={onBack}>×</button></header>
 <div className="web-vif-contact-scroll">{current?<>
  <section><h3>{removing?'Selected messages':'Your hidden messages'}</h3><p>{review.count} {removing?'selected':'hidden'} {review.count===1?'message':'messages'}.</p>
  {removing&&<div className="private-selected-previews">{snapshot.messages.filter(row=>review.ids.includes(row.id)).map(row=><div className="web-vif-selected-preview" key={row.id}><strong>{row.author===ownPubkey||row.author==='self'?'You':authorName(row.author)}</strong><p>{row.text||'Attachment'}</p></div>)}</div>}
  {!removing&&<p>Restore the originals that are still loaded and permitted. Original expiry and access rules still apply.</p>}</section>
  <section><h3>What stays unchanged</h3><p>Original records and attachments are kept. Other people’s copies, your connections and all unsent drafts stay unchanged.</p><p>This changes only your local conversation view.</p></section>
  <label className="web-vif-export-choice"><input type="checkbox" checked={confirmed} disabled={view.busy} onChange={event=>setApproval(event.target.checked?review:null)}/><span>{removing?'Hide these selected messages in my local view.':'Restore the hidden messages in my local view.'}</span></label>
  <button type="button" className="web-vif-export-download" disabled={!confirmed||view.busy} onClick={()=>void apply()}>{view.busy?'Saving local view…':removing?'Confirm local removal':'Restore local view'}</button>
 </>:<p role="status">The original messages or local view changed. Return and review the current selection.</p>}
 <button type="button" className="web-vif-export-cancel" onClick={onBack}>Cancel</button>{feedback&&<p role="status">{feedback}</p>}</div></aside>;
}

export function WebRestoreLocalViewMenu({client,onRestore}:{client:HumanConversationClient;onRestore:()=>void}){
 useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot);
 const view=client.localView?.getSnapshot();
 return view?.available&&view.hiddenCount>0?<button type="button" disabled={view.busy} onClick={onRestore}>Restore local view</button>:null;
}
